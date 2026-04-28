const {
  getCachedValue,
  setCachedValue,
  fetchNominatim,
  isNonEmptyString,
  parseOptionalCoordinate,
  extractAddressParts,
} = require("../../routes/profileHelpers");

function normalizeLocationText(value) {
  if (!isNonEmptyString(value)) return "";
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function splitDisplayName(displayName) {
  if (!isNonEmptyString(displayName)) return "";
  return displayName.split(",")[0].trim();
}

function locationTextMatches(expected, candidate) {
  const wanted = normalizeLocationText(expected);
  const got = normalizeLocationText(candidate);
  if (!wanted) return true;
  if (!got) return false;
  return wanted === got || got.startsWith(wanted) || wanted.startsWith(got);
}

function dedupeLocationSuggestions(suggestions) {
  const byAddress = new Map();

  for (const item of suggestions) {
    const key = normalizeLocationText(item.display_name);
    const existing = byAddress.get(key);
    if (!existing || item.importance > existing.importance) {
      byAddress.set(key, item);
    }
  }

  return Array.from(byAddress.values());
}

async function forwardGeocode({ city, neighborhood, limit }) {
  const cacheKey = `forward:${normalizeLocationText(city)}:${normalizeLocationText(neighborhood)}:${limit}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  const parts = [];
  if (isNonEmptyString(neighborhood)) parts.push(neighborhood.trim());
  if (isNonEmptyString(city)) parts.push(city.trim());
  if (parts.length === 0) return [];

  const queryVariants = [parts.join(", ")];
  if (parts.length > 1 && isNonEmptyString(city)) {
    queryVariants.push(city.trim());
  }

  if (isNonEmptyString(city)) {
    const normalizedCity = city.trim().replace(/\s+/g, " ");
    const cityTokens = normalizedCity.split(" ");
    if (cityTokens.length > 1) {
      const lastToken = cityTokens[cityTokens.length - 1];
      if (lastToken.length > 0 && lastToken.length < 3) {
        const broaderCity = cityTokens.slice(0, -1).join(" ").trim();
        if (broaderCity) {
          queryVariants.push(broaderCity);
        }
      }
    }
  }

  const uniqueQueryVariants = Array.from(
    new Set(queryVariants.filter((item) => isNonEmptyString(item))),
  );

  let data = [];
  for (const query of uniqueQueryVariants) {
    const endpoint =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&accept-language=en&limit=" +
      encodeURIComponent(limit) +
      "&q=" +
      encodeURIComponent(query);

    let response;
    try {
      response = await fetchNominatim(endpoint);
    } catch {
      continue;
    }

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("[geocode] rate limited", { endpoint, query });
      }
      continue;
    }

    let result;
    try {
      result = await response.json();
    } catch {
      continue;
    }

    if (Array.isArray(result) && result.length > 0) {
      data = result;
      break;
    }
  }

  if (!Array.isArray(data) || data.length === 0) return [];

  const mapped = data.map((entry) => {
    const partsFromApi = extractAddressParts(entry.address);
    const fallbackCity = splitDisplayName(entry.display_name || "");
    return {
      display_name: entry.display_name || "",
      latitude: parseOptionalCoordinate(entry.lat),
      longitude: parseOptionalCoordinate(entry.lon),
      city: partsFromApi.city || entry.name || fallbackCity,
      neighborhood: partsFromApi.neighborhood,
      country: partsFromApi.country,
      importance:
        typeof entry.importance === "number"
          ? entry.importance
          : Number(entry.importance) || 0,
    };
  });

  const deduped = dedupeLocationSuggestions(mapped);
  setCachedValue(cacheKey, deduped);
  return deduped;
}

async function searchLocationsByQuery(query, limit) {
  const cacheKey = `search:${normalizeLocationText(query)}:${limit}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  const endpoint =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&accept-language=en&limit=" +
    encodeURIComponent(limit) +
    "&q=" +
    encodeURIComponent(query);

  let response;
  try {
    response = await fetchNominatim(endpoint);
  } catch {
    return [];
  }

  if (!response.ok) {
    if (response.status === 429) {
      console.warn("[searchLocationsByQuery] rate limited", { query, limit });
    }
    return [];
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return [];
  }

  if (!Array.isArray(data)) return [];

  const mapped = data.map((entry) => {
    const partsFromApi = extractAddressParts(entry.address);
    return {
      display_name: entry.display_name || "",
      city: partsFromApi.city,
      neighborhood: partsFromApi.neighborhood,
      country: partsFromApi.country,
      importance:
        typeof entry.importance === "number"
          ? entry.importance
          : Number(entry.importance) || 0,
    };
  });

  setCachedValue(cacheKey, mapped);
  return mapped;
}

async function fetchNeighborhoodsForCity(city, limit) {
  const cacheKey = `neighborhoods:${normalizeLocationText(city)}:${limit}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  const cleanCity = city.trim();
  const cityResults = await forwardGeocode({
    city: cleanCity,
    neighborhood: "",
    limit: 1,
  });

  if (cityResults.length === 0) {
    setCachedValue(cacheKey, []);
    return [];
  }

  const cityCountry = cityResults[0].country || "";
  const normalizedCityCountry = normalizeLocationText(cityCountry);
  const variants = [
    cleanCity,
    `district, ${cleanCity}`,
    `borough, ${cleanCity}`,
    `arrondissement, ${cleanCity}`,
    `quartier, ${cleanCity}`,
    `neighborhood, ${cleanCity}`,
  ];

  const uniqueVariants = Array.from(new Set(variants));
  const neighborhoodsByKey = new Map();

  for (const query of uniqueVariants) {
    const results = await searchLocationsByQuery(query, limit);
    for (const item of results) {
      const neighborhood = (item.neighborhood || "").trim();
      if (!neighborhood) continue;

      const itemCountry = (item.country || "").trim();
      const normalizedItemCountry = normalizeLocationText(itemCountry);
      if (
        normalizedCityCountry &&
        normalizedItemCountry &&
        normalizedItemCountry !== normalizedCityCountry
      ) {
        continue;
      }

      const key = normalizeLocationText(neighborhood);
      const existing = neighborhoodsByKey.get(key);
      if (!existing || item.importance > existing.importance) {
        neighborhoodsByKey.set(key, {
          name: neighborhood,
          display_name: item.display_name,
          importance: item.importance,
        });
      }
    }
  }

  if (neighborhoodsByKey.size === 0) {
    for (const query of uniqueVariants) {
      const results = await searchLocationsByQuery(query, limit);
      for (const item of results) {
        const neighborhood = (item.neighborhood || "").trim();
        if (!neighborhood) continue;

        const key = normalizeLocationText(neighborhood);
        const existing = neighborhoodsByKey.get(key);
        if (!existing || item.importance > existing.importance) {
          neighborhoodsByKey.set(key, {
            name: neighborhood,
            display_name: item.display_name,
            importance: item.importance,
          });
        }
      }
    }
  }

  const result = Array.from(neighborhoodsByKey.values())
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    )
    .slice(0, limit);

  setCachedValue(cacheKey, result);
  return result;
}

module.exports = {
  normalizeLocationText,
  splitDisplayName,
  locationTextMatches,
  dedupeLocationSuggestions,
  forwardGeocode,
  searchLocationsByQuery,
  fetchNeighborhoodsForCity,
};