const express = require("express");
const pool = require("../db");
const { getIO, REALTIME_EVENTS } = require("../realtime");
const { isUserOnline } = require("../realtime/presence");
const {
  validatePhotoMimeType,
  normalizePhotosInput,
  ALLOWED_PHOTO_MIMES,
  MAX_PHOTO_SIZE_BYTES,
  MAX_TOTAL_PHOTOS_SIZE_BYTES,
} = require("../utils/photoValidator");

const router = express.Router();
const MAX_BIO_LENGTH = 500;
const allowedGenders = ["male", "female", "non_binary", "other"];
const allowedPreferences = ["male", "female", "both", "other"];
const GEO_CACHE_TTL_MS = 5 * 60 * 1000;
const geocodeCache = new Map();
const NOMINATIM_MIN_INTERVAL_MS = 1100;
const NOMINATIM_HEADERS = {
  "User-Agent": "matcha/1.0 (education project)",
  Accept: "application/json",
  "Accept-Language": "en",
};
let nominatimQueue = Promise.resolve();
let lastNominatimRequestAt = 0;

function getCachedValue(cacheKey) {
  const cached = geocodeCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    geocodeCache.delete(cacheKey);
    return null;
  }
  return cached.value;
}

function setCachedValue(cacheKey, value) {
  geocodeCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + GEO_CACHE_TTL_MS,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchNominatim(endpoint) {
  const run = async () => {
    const now = Date.now();
    const waitMs = Math.max(
      0,
      NOMINATIM_MIN_INTERVAL_MS - (now - lastNominatimRequestAt),
    );
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    lastNominatimRequestAt = Date.now();
    let response = await fetch(endpoint, { headers: NOMINATIM_HEADERS });

    if (response.status === 429) {
      console.warn("[nominatim] rate limited, retrying", { endpoint });
      await sleep(1500);
      lastNominatimRequestAt = Date.now();
      response = await fetch(endpoint, { headers: NOMINATIM_HEADERS });
    }

    return response;
  };

  const task = nominatimQueue.then(run, run);
  nominatimQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseUserIdFromRequest(req) {
  const rawUserId = req.header("x-user-id");
  if (!rawUserId) return null;
  const parsed = Number(rawUserId);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

async function resolveCurrentUserId(req) {
  const requestedUserId = parseUserIdFromRequest(req);
  if (!requestedUserId) return null;
  const userResult = await pool.query("SELECT id FROM users WHERE id = $1", [
    requestedUserId,
  ]);
  if (userResult.rows.length === 0) return null;
  return userResult.rows[0].id;
}

function normalizeTag(tag) {
  if (typeof tag !== "string") return "";
  let normalized = tag.trim().toLowerCase();
  if (!normalized) return "";
  if (!normalized.startsWith("#")) normalized = `#${normalized}`;
  if (!/^#[a-z0-9_]{1,30}$/.test(normalized)) return "";
  return normalized;
}

function normalizeTagsInput(tags) {
  if (!Array.isArray(tags)) return null;
  const normalized = [];
  const seen = new Set();
  for (const tag of tags) {
    const cleaned = normalizeTag(tag);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    normalized.push(cleaned);
  }
  return normalized;
}

function parseOptionalCoordinate(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function getAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function isProfileCompleted(user, profile) {
  const hasUsername = typeof user?.username === "string" && user.username.trim().length > 0;
  const hasFirstName = typeof user?.first_name === "string" && user.first_name.trim().length > 0;
  const hasLastName = typeof user?.last_name === "string" && user.last_name.trim().length > 0;
  const hasEmail = typeof user?.email === "string" && user.email.trim().length > 0;
  const hasGender = typeof profile?.gender === "string" && profile.gender.trim().length > 0;
  const hasBirthDate = Boolean(profile?.birth_date);
  const hasCity = typeof profile?.city === "string" && profile.city.trim().length > 0;

  return (
    hasUsername &&
    hasFirstName &&
    hasLastName &&
    hasEmail &&
    hasGender &&
    hasBirthDate &&
    hasCity
  );
}

async function reverseGeocode(latitude, longitude) {
  const cacheKey = `reverse:${latitude}:${longitude}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  const endpoint = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1&accept-language=en`;
  let response;
  try {
    response = await fetchNominatim(endpoint);
  } catch {
    return { city: "", neighborhood: "", display_name: "" };
  }

  if (!response.ok) {
    return { city: "", neighborhood: "", display_name: "" };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return { city: "", neighborhood: "", display_name: "" };
  }

  const address = data.address || {};
  const resolved = {
    city:
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      "",
    neighborhood:
      address.neighbourhood ||
      address.suburb ||
      address.quarter ||
      address.city_district ||
      "",
    display_name: data.display_name || "",
  };

  setCachedValue(cacheKey, resolved);
  return resolved;
}

function extractAddressParts(address) {
  const source = address || {};
  return {
    city:
      source.city || source.town || source.village || source.municipality || "",
    neighborhood:
      source.neighbourhood ||
      source.suburb ||
      source.quarter ||
      source.city_district ||
      "",
    country: source.country || "",
  };
}

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

    // Keep the most relevant duplicate when Nominatim returns the same address multiple times.
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
    // Fallback to city-only query when neighborhood+city is too restrictive.
    queryVariants.push(city.trim());
  }

  // If the user types an incomplete second word (e.g. "las v"), try a broader prefix ("las").
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

  // First, resolve the city to get its country
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

  // Now search for neighborhoods within that country
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

      // Filter by country: only include neighborhoods from the same country
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

  // Fallback: if strict country filtering produced no result, try once without country filter.
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

router.get("/profile/tags", async (req, res, next) => {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isInteger(rawLimit)
      ? Math.max(1, Math.min(rawLimit, 100))
      : 100;
    const result = await pool.query(
      `
      SELECT t.name, COUNT(upt.user_id)::int AS usage_count
      FROM tags t
      LEFT JOIN user_profile_tags upt ON upt.tag_id = t.id
      GROUP BY t.id, t.name
      ORDER BY usage_count DESC, t.name ASC
      LIMIT $1
      `,
      [limit],
    );
    return res.json({
      tags: result.rows.map((row) => ({
        name: row.name,
        usage_count: row.usage_count,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/profile/reverse-geocode", async (req, res, next) => {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({
        error: "Not authenticated. Please login and provide x-user-id.",
      });
    }
    const latitude = parseOptionalCoordinate(req.query.latitude);
    const longitude = parseOptionalCoordinate(req.query.longitude);
    if (latitude === null || longitude === null) {
      return res
        .status(400)
        .json({ error: "latitude and longitude query params are required" });
    }
    const resolved = await reverseGeocode(latitude, longitude);
    return res.json(resolved);
  } catch (error) {
    return next(error);
  }
});

router.get("/profile/validate-location", async (req, res, next) => {
  try {
    const currentUserId = parseUserIdFromRequest(req);

    const city = isNonEmptyString(req.query.city) ? req.query.city.trim() : "";
    const neighborhood = isNonEmptyString(req.query.neighborhood)
      ? req.query.neighborhood.trim()
      : "";
    const latitude = parseOptionalCoordinate(req.query.latitude);
    const longitude = parseOptionalCoordinate(req.query.longitude);

    const rawLimit = Number(req.query.limit);
    const limit = Number.isInteger(rawLimit)
      ? Math.max(1, Math.min(rawLimit, 20))
      : 12;

    // console.info("[profile/validate-location] request", {
    //   userId: currentUserId,
    //   city,
    //   neighborhood,
    //   latitude,
    //   longitude,
    //   limit,
    // });

    if (!city && !neighborhood && (latitude === null || longitude === null)) {
      return res.status(400).json({
        error:
          "Provide city/neighborhood or latitude/longitude to validate location.",
      });
    }

    let gpsResolved = null;
    if (latitude !== null && longitude !== null) {
      try {
        gpsResolved = await reverseGeocode(latitude, longitude);
      } catch {
        gpsResolved = { city: "", neighborhood: "", display_name: "" };
      }
    }

    const effectiveCity = city || (gpsResolved ? gpsResolved.city : "");
    const effectiveNeighborhood =
      neighborhood || (gpsResolved ? gpsResolved.neighborhood : "");

    let suggestions = await forwardGeocode({
      city: effectiveCity,
      neighborhood: effectiveNeighborhood,
      limit,
    });

    if (suggestions.length === 0 && effectiveCity) {
      const fallbackResults = await searchLocationsByQuery(
        effectiveNeighborhood
          ? `${effectiveNeighborhood}, ${effectiveCity}`
          : effectiveCity,
        Math.max(limit * 3, 20),
      );

      suggestions = dedupeLocationSuggestions(
        fallbackResults.map((item) => ({
          display_name: item.display_name || "",
          latitude: null,
          longitude: null,
          city: item.city || splitDisplayName(item.display_name || ""),
          neighborhood: item.neighborhood || "",
          country: item.country || "",
          importance: item.importance || 0,
        })),
      ).slice(0, limit);
    }

    const wantedCity = normalizeLocationText(city);
    const wantedNeighborhood = normalizeLocationText(neighborhood);

    const matchedSuggestion =
      suggestions.find((item) => {
        const cityOk = wantedCity
          ? normalizeLocationText(item.city) === wantedCity
          : true;
        const neighborhoodOk = wantedNeighborhood
          ? normalizeLocationText(item.neighborhood) === wantedNeighborhood
          : true;
        return cityOk && neighborhoodOk;
      }) || null;

    const cityExists = wantedCity
      ? suggestions.some((item) => locationTextMatches(wantedCity, item.city))
      : true;
    const neighborhoodExists = wantedNeighborhood
      ? suggestions.some((item) =>
          locationTextMatches(wantedNeighborhood, item.neighborhood),
        )
      : true;

    const isValid = suggestions.length > 0 && cityExists && neighborhoodExists;

    // console.info("[profile/validate-location] result", {
    //   city,
    //   neighborhood,
    //   suggestionsCount: suggestions.length,
    //   cityExists,
    //   neighborhoodExists,
    //   isValid,
    // });

    return res.json({
      validation: {
        is_valid: isValid,
        city_exists: cityExists,
        neighborhood_exists: neighborhoodExists,
        matched_exact_suggestion: Boolean(matchedSuggestion),
      },
      requested: {
        city,
        neighborhood,
        latitude,
        longitude,
      },
      resolved_from_gps: gpsResolved,
      matched_suggestion: matchedSuggestion,
      suggestions,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/profile/city-neighborhoods", async (req, res, next) => {
  try {
    const currentUserId = parseUserIdFromRequest(req);

    const city = isNonEmptyString(req.query.city) ? req.query.city.trim() : "";
    if (!city) {
      return res.status(400).json({ error: "city query param is required" });
    }

    const rawLimit = Number(req.query.limit);
    const limit = Number.isInteger(rawLimit)
      ? Math.max(1, Math.min(rawLimit, 30))
      : 20;

    const neighborhoods = await fetchNeighborhoodsForCity(city, limit);
    return res.json({ city, neighborhoods });
  } catch (error) {
    return next(error);
  }
});

router.get("/profile/city-suggestions", async (req, res, next) => {
  try {
    const currentUserId = parseUserIdFromRequest(req);

    const query = isNonEmptyString(req.query.query)
      ? req.query.query.trim()
      : "";
    if (query.length < 2) {
      // console.info("[profile/city-suggestions] short query", {
      //   userId: currentUserId,
      //   query,
      // });
      return res.json({ query, suggestions: [] });
    }

    const rawLimit = Number(req.query.limit);
    const limit = Number.isInteger(rawLimit)
      ? Math.max(1, Math.min(rawLimit, 50))
      : 20;

    const searchLimit = Math.max(limit * 6, 60);
    const primaryResults = await searchLocationsByQuery(query, searchLimit);
    let results = primaryResults;
    if (results.length === 0) {
      const geocodeFallback = await forwardGeocode({
        city: query,
        neighborhood: "",
        limit: searchLimit,
      });
      results = geocodeFallback.map((item) => ({
        display_name: item.display_name || item.city || "",
        city: item.city || "",
        neighborhood: item.neighborhood || "",
        country: item.country || "",
        importance: item.importance || 0,
      }));
    }

    // Trouver le pays de la première suggestion
    let countryFilter = null;
    if (results.length > 0 && results[0].country) {
      countryFilter = results[0].country.trim();
    }

    // Filtrer toutes les suggestions pour ne garder que celles du même pays (et country non vide)
    let filteredResults = results;
    if (countryFilter) {
      filteredResults = results.filter(
        (item) => {
          // Filtrer toutes les suggestions pour ne garder que celles du même pays (pas de pays voisins)
          const itemCountry = (item.country || "").trim();
          return itemCountry && itemCountry === countryFilter;
        }
      );
    }

    const normalizedQuery = normalizeLocationText(query);
    const byCity = new Map();

    for (const item of filteredResults) {
      const city = (item.city || splitDisplayName(item.display_name)).trim();
      if (!city) continue;

      const normalizedCity = normalizeLocationText(city);
      if (
        normalizedQuery &&
        !normalizedCity.startsWith(normalizedQuery) &&
        !normalizedCity.includes(normalizedQuery)
      ) {
        continue;
      }

      const existing = byCity.get(normalizedCity);
      if (!existing || item.importance > existing.importance) {
        byCity.set(normalizedCity, {
          city,
          display_name: item.display_name || city,
          importance: item.importance || 0,
        });
      }
    }

    const suggestions = Array.from(byCity.values())
      .sort((a, b) => {
        const aStarts = normalizeLocationText(a.city).startsWith(
          normalizedQuery,
        )
          ? 1
          : 0;
        const bStarts = normalizeLocationText(b.city).startsWith(
          normalizedQuery,
        )
          ? 1
          : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;
        if ((b.importance || 0) !== (a.importance || 0)) {
          return (b.importance || 0) - (a.importance || 0);
        }
        return a.city.localeCompare(b.city, undefined, { sensitivity: "base" });
      })
      .slice(0, limit)
      .map((item) => ({
        city: item.city,
        display_name: item.display_name,
      }));

    console.info("[profile/city-suggestions] result", {
      userId: currentUserId,
      query,
      searchLimit,
      rawResults: results.length,
      filteredResults: filteredResults.length,
      primaryRawResults: primaryResults.length,
      suggestionsCount: suggestions.length,
      countryFilter,
      sample: suggestions.slice(0, 3).map((item) => item.city),
    });

    return res.json({ query, suggestions });
  } catch (error) {
    return next(error);
  }
});

router.get("/profile/me", async (req, res, next) => {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({
        error: "Not authenticated. Please login and provide x-user-id.",
      });
    }

    const [profileResult, tagsResult, photosResult, relationResult] =
      await Promise.all([
        pool.query(
          `
        SELECT
          u.id AS user_id,
          u.email,
          u.username,
          u.first_name,
          u.last_name,
          u.email_verified,
          u.created_at,
          p.gender,
          p.sexual_preference,
          p.biography,
          p.birth_date,
          p.city,
          p.neighborhood,
          p.gps_consent,
          p.latitude,
          p.longitude,
          GREATEST(
            LEAST(
              FLOOR(
                COALESCE((SELECT COUNT(*) FROM profile_views WHERE viewed_user_id = u.id), 0)::numeric / 20
              ) + FLOOR(
                COALESCE((SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id), 0)::numeric / 5
              ) + CASE
                WHEN COALESCE((SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id AND created_at > NOW() - INTERVAL '7 days'), 0) = 0
                  THEN -1
                ELSE 0
              END,
              100
            ),
            0
          )::int AS fame_rating
        FROM users AS u
        LEFT JOIN profiles AS p ON p.user_id = u.id
        WHERE u.id = $1
        LIMIT 1
        `,
          [currentUserId],
        ),
        pool.query(
          `
        SELECT t.name
        FROM user_profile_tags upt
        JOIN tags t ON t.id = upt.tag_id
        WHERE upt.user_id = $1
        ORDER BY t.name ASC
        `,
          [currentUserId],
        ),
        pool.query(
          `
        SELECT id, data_url, is_primary
        FROM user_photos
        WHERE user_id = $1
        ORDER BY is_primary DESC, id ASC
        `,
          [currentUserId],
        ),
      ]);

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = profileResult.rows[0];
    const profilePayload = {
      gender: row.gender || "",
      sexual_preference: row.sexual_preference || "",
      biography: row.biography || "",
      birth_date: row.birth_date,
      age: getAge(row.birth_date),
      city: row.city || "",
      neighborhood: row.neighborhood || "",
      gps_consent: Boolean(row.gps_consent),
      latitude: row.latitude,
      longitude: row.longitude,
      tags: tagsResult.rows.map((entry) => entry.name),
      fame_rating: row.fame_rating ?? 0,
      photos: photosResult.rows.map((item) => ({
        id: item.id,
        data_url: item.data_url,
        is_primary: item.is_primary,
      })),
    };
    return res.json({
      user: {
        id: row.user_id,
        email: row.email,
        username: row.username,
        first_name: row.first_name,
        last_name: row.last_name,
        email_verified: row.email_verified,
        profile_completed: isProfileCompleted(
          {
            username: row.username,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
          },
          profilePayload,
        ),
        created_at: row.created_at,
      },
      profile: profilePayload,
    });
  } catch (error) {
    return next(error);
  }
});

// Public profile for viewing another user
router.get("/profile/:id", async (req, res, next) => {
  try {
    const requestedId = Number(req.params.id);
    if (!Number.isInteger(requestedId) || requestedId <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const currentUserId = parseUserIdFromRequest(req);

    const [profileResult, tagsResult, photosResult, relationResult] =
      await Promise.all([
        pool.query(
          `
        SELECT
          u.id AS user_id,
          u.username,
          u.first_name,
          u.last_name,
          u.last_seen_at,
          p.gender,
          p.sexual_preference,
          p.biography,
          p.birth_date,
          p.city,
          p.neighborhood,
          GREATEST(
            LEAST(
              FLOOR(
                COALESCE((SELECT COUNT(*) FROM profile_views WHERE viewed_user_id = u.id), 0)::numeric / 20
              ) + FLOOR(
                COALESCE((SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id), 0)::numeric / 5
              ) + CASE
                WHEN COALESCE((SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id AND created_at > NOW() - INTERVAL '7 days'), 0) = 0
                  THEN -1
                ELSE 0
              END,
              100
            ),
            0
          )::int AS fame_rating
        FROM users AS u
        LEFT JOIN profiles AS p ON p.user_id = u.id
        WHERE u.id = $1
        LIMIT 1
        `,
          [requestedId],
        ),
        pool.query(
          `
        SELECT t.name
        FROM user_profile_tags upt
        JOIN tags t ON t.id = upt.tag_id
        WHERE upt.user_id = $1
        ORDER BY t.name ASC
        `,
          [requestedId],
        ),
        pool.query(
          `
        SELECT id, data_url, is_primary
        FROM user_photos
        WHERE user_id = $1
        ORDER BY is_primary DESC, id ASC
        `,
          [requestedId],
        ),
        currentUserId
          ? pool.query(
              `
            SELECT
              EXISTS(
                SELECT 1
                FROM likes
                WHERE liker_user_id = $1 AND liked_user_id = $2
              ) AS i_liked,
              EXISTS(
                SELECT 1
                FROM likes
                WHERE liker_user_id = $2 AND liked_user_id = $1
              ) AS liked_me,
              EXISTS(
                SELECT 1
                FROM fake_account_reports
                WHERE reporter_user_id = $1
                  AND reported_user_id = $2
              ) AS reported_fake_by_me,
              EXISTS(
                SELECT 1
                FROM user_blocks
                WHERE blocker_user_id = $1
                  AND blocked_user_id = $2
              ) AS blocked_by_you,
              EXISTS(
                SELECT 1
                FROM user_blocks
                WHERE blocker_user_id = $2
                  AND blocked_user_id = $1
              ) AS blocked_you
            `,
              [currentUserId, requestedId],
            )
          : Promise.resolve({
              rows: [
                {
                  i_liked: false,
                  liked_me: false,
                  reported_fake_by_me: false,
                  blocked_by_you: false,
                  blocked_you: false,
                },
              ],
            }),
      ]);

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = profileResult.rows[0];
    const relation = relationResult.rows[0] || {
      i_liked: false,
      liked_me: false,
      reported_fake_by_me: false,
      blocked_by_you: false,
      blocked_you: false,
    };
    const iLiked = Boolean(relation.i_liked);
    const likedMe = Boolean(relation.liked_me);
    return res.json({
      user: {
        id: row.user_id,
        username: row.username,
        first_name: row.first_name,
        last_name: row.last_name,
        is_online: isUserOnline(row.user_id),
        last_seen_at: row.last_seen_at,
      },
      profile: {
        gender: row.gender || "",
        sexual_preference: row.sexual_preference || "",
        biography: row.biography || "",
        birth_date: row.birth_date,
        age: getAge(row.birth_date),
        city: row.city || "",
        neighborhood: row.neighborhood || "",
        fame_rating: row.fame_rating ?? 0,
        tags: tagsResult.rows.map((entry) => entry.name),
        photos: photosResult.rows.map((item) => ({
          id: item.id,
          data_url: item.data_url,
          is_primary: item.is_primary,
        })),
      },
      relation: {
        i_liked: iLiked,
        liked_me: likedMe,
        is_match: iLiked && likedMe,
        reported_fake_by_me: Boolean(relation.reported_fake_by_me),
        blocked_by_you: Boolean(relation.blocked_by_you),
        blocked_you: Boolean(relation.blocked_you),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/profile/me", async (req, res, next) => {
  const client = await pool.connect();
  let inTransaction = false;

  try {
    const currentUserId = await resolveCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({
        error: "Not authenticated. Please login and provide x-user-id.",
      });
    }

    const {
      username,
      first_name,
      last_name,
      email,
      biography,
      gender,
      sexual_preference,
      city,
      neighborhood,
      birth_date,
      gps_consent,
      latitude,
      longitude,
      tags,
      photos,
    } = req.body;

    if (
      biography !== undefined &&
      biography !== null &&
      typeof biography !== "string"
    ) {
      return res.status(400).json({ error: "biography must be a string" });
    }

    const safeBiography = typeof biography === "string" ? biography.trim() : "";
    if (safeBiography.length > MAX_BIO_LENGTH) {
      return res.status(400).json({
        error: `biography must be at most ${MAX_BIO_LENGTH} characters`,
      });
    }
    const safeGender = isNonEmptyString(gender) ? gender.trim() : null;
    if (!safeGender) {
      return res.status(400).json({ error: "gender is required" });
    }
    if (!allowedGenders.includes(safeGender)) {
      return res.status(400).json({
        error: "gender must be valid",
        allowed_values: allowedGenders,
      });
    }
    let safeSexualPreference = sexual_preference;
    if (
      !safeSexualPreference ||
      !allowedPreferences.includes(safeSexualPreference)
    ) {
      safeSexualPreference = "both";
    }

    const gpsConsent = Boolean(gps_consent);
    const safeCity = isNonEmptyString(city) ? city.trim() : "";
    let safeNeighborhood = isNonEmptyString(neighborhood)
      ? neighborhood.trim()
      : "";
    const parsedLatitude = parseOptionalCoordinate(latitude);
    const parsedLongitude = parseOptionalCoordinate(longitude);

    if (gpsConsent) {
      if (parsedLatitude === null || parsedLongitude === null) {
        return res.status(400).json({
          error:
            "latitude and longitude are required when gps_consent is enabled",
        });
      }
      const resolved = await reverseGeocode(parsedLatitude, parsedLongitude);
      safeNeighborhood = safeNeighborhood || resolved.neighborhood;
      if (!safeNeighborhood) {
        return res.status(400).json({
          error:
            "Unable to determine neighborhood from GPS. Please enter it manually to confirm.",
        });
      }
    } else if (!safeCity && !safeNeighborhood) {
      return res.status(400).json({
        error: "city or neighborhood is required when gps_consent is disabled",
      });
    }

    const locationSuggestions = await forwardGeocode({
      city: safeCity,
      neighborhood: safeNeighborhood,
      limit: 5,
    });

    if (locationSuggestions.length === 0) {
      return res.status(400).json({
        error: "Unable to validate the provided city/neighborhood",
      });
    }

    const wantedCity = normalizeLocationText(safeCity);
    const wantedNeighborhood = normalizeLocationText(safeNeighborhood);
    const cityExists = wantedCity
      ? locationSuggestions.some(
          (item) => normalizeLocationText(item.city) === wantedCity,
        )
      : true;
    const neighborhoodExists = wantedNeighborhood
      ? locationSuggestions.some(
          (item) =>
            normalizeLocationText(item.neighborhood) === wantedNeighborhood,
        )
      : true;

    if (!cityExists || !neighborhoodExists) {
      return res.status(400).json({
        error:
          "Location could not be verified. Please choose a valid city/neighborhood suggestion.",
      });
    }

    let normalizedTags = null;
    if (tags !== undefined) {
      normalizedTags = normalizeTagsInput(tags);
      if (normalizedTags === null) {
        return res
          .status(400)
          .json({ error: "tags must be an array of strings" });
      }
      if (normalizedTags.length > 10) {
        return res
          .status(400)
          .json({ error: "A maximum of 10 tags is allowed" });
      }
    }

    let normalizedPhotos = null;
    if (photos !== undefined) {
      const photoResult = await normalizePhotosInput(photos);
      if (photoResult && photoResult.error) {
        return res.status(400).json({ error: photoResult.error });
      }
      normalizedPhotos = photoResult ? photoResult.photos : null;
    }

    const normalizedFirstName = isNonEmptyString(first_name)
      ? first_name.trim()
      : null;
    const normalizedLastName = isNonEmptyString(last_name)
      ? last_name.trim()
      : null;
    const normalizedUsername = isNonEmptyString(username)
      ? username.trim()
      : null;
    const normalizedBirthDate = isNonEmptyString(birth_date)
      ? birth_date.trim()
      : null;

    if (
      normalizedUsername &&
      !/^[a-zA-Z0-9_]{3,50}$/.test(normalizedUsername)
    ) {
      return res.status(400).json({
        error:
          "username is invalid (use 3-50 characters: letters, numbers, underscore)",
      });
    }

    if (normalizedBirthDate) {
      const parsedBirthDate = new Date(`${normalizedBirthDate}T00:00:00Z`);
      if (Number.isNaN(parsedBirthDate.getTime())) {
        return res
          .status(400)
          .json({ error: "birth_date must be a valid date" });
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (parsedBirthDate > today) {
        return res
          .status(400)
          .json({ error: "birth_date cannot be in the future" });
      }
    }

    await client.query("BEGIN");
    inTransaction = true;

    if (
      normalizedFirstName ||
      normalizedLastName ||
      normalizedUsername
    ) {
      await client.query(
        `
        UPDATE users
        SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          username = COALESCE($3, username)
        WHERE id = $4
        `,
        [
          normalizedFirstName,
          normalizedLastName,
          normalizedUsername,
          currentUserId,
        ],
      );
    }

    const updated = await client.query(
      `
      INSERT INTO profiles (
        user_id,
        gender,
        sexual_preference,
        biography,
        birth_date,
        city,
        neighborhood,
        gps_consent,
        latitude,
        longitude,
        fame_rating
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        COALESCE($5, (SELECT birth_date FROM profiles WHERE user_id = $1), (CURRENT_DATE - INTERVAL '18 years')::date),
        $6,
        $7,
        $8,
        $9,
        $10,
        COALESCE((SELECT fame_rating FROM profiles WHERE user_id = $1), 0)
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        biography = EXCLUDED.biography,
        gender = COALESCE(EXCLUDED.gender, profiles.gender),
        sexual_preference = COALESCE(EXCLUDED.sexual_preference, profiles.sexual_preference),
        city = EXCLUDED.city,
        neighborhood = EXCLUDED.neighborhood,
        gps_consent = EXCLUDED.gps_consent,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date)
      RETURNING
        user_id,
        biography,
        gender,
        sexual_preference,
        city,
        neighborhood,
        gps_consent,
        birth_date,
        latitude,
        longitude,
        fame_rating
      `,
      [
        currentUserId,
        safeGender,
        safeSexualPreference,
        biography.trim(),
        normalizedBirthDate,
        safeCity,
        safeNeighborhood,
        gpsConsent,
        parsedLatitude,
        parsedLongitude,
      ],
    );

    if (normalizedTags !== null) {
      await client.query("DELETE FROM user_profile_tags WHERE user_id = $1", [
        currentUserId,
      ]);
      for (const tag of normalizedTags) {
        const tagResult = await client.query(
          `
          INSERT INTO tags (name)
          VALUES ($1)
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
          `,
          [tag],
        );

        await client.query(
          `
          INSERT INTO user_profile_tags (user_id, tag_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
          `,
          [currentUserId, tagResult.rows[0].id],
        );
      }
    }

    const tagsResult = await client.query(
      `
      SELECT t.name
      FROM user_profile_tags upt
      JOIN tags t ON t.id = upt.tag_id
      WHERE upt.user_id = $1
      ORDER BY t.name ASC
      `,
      [currentUserId],
    );

    if (normalizedPhotos !== null) {
      await client.query("DELETE FROM user_photos WHERE user_id = $1", [
        currentUserId,
      ]);
      for (const photo of normalizedPhotos) {
        await client.query(
          `
          INSERT INTO user_photos (user_id, data_url, is_primary)
          VALUES ($1, $2, $3)
          `,
          [currentUserId, photo.data_url, photo.is_primary],
        );
      }
    }

    const updatedUserResult = await client.query(
      `
      SELECT id, email, username, first_name, last_name, email_verified, created_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [currentUserId],
    );

    await client.query("COMMIT");
    inTransaction = false;

    const profile = updated.rows[0];
    const updatedUser = updatedUserResult.rows[0];
    const photosResult = await client.query(
      `
      SELECT id, data_url, is_primary
      FROM user_photos
      WHERE user_id = $1
      ORDER BY is_primary DESC, id ASC
      `,
      [currentUserId],
    );
    const io = getIO();
    if (io && updatedUser) {
      const primaryPhoto = photosResult.rows.find((item) => item.is_primary);
      io.emit(REALTIME_EVENTS.PROFILE_UPDATED, {
        user_id: Number(updatedUser.id),
        profile: {
          username: updatedUser.username,
          gender: profile.gender || "",
          sexual_preference: profile.sexual_preference || "",
          city: profile.city || "",
          neighborhood: profile.neighborhood || "",
          age: getAge(profile.birth_date),
          fame_rating: profile.fame_rating ?? 0,
          tags: tagsResult.rows.map((entry) => entry.name),
          primary_photo_url: primaryPhoto ? primaryPhoto.data_url : null,
        },
      });
    }

    const profilePayload = {
      gender: profile.gender,
      sexual_preference: profile.sexual_preference,
      biography: profile.biography,
      birth_date: profile.birth_date,
      city: profile.city,
      neighborhood: profile.neighborhood,
      gps_consent: Boolean(profile.gps_consent),
      latitude: profile.latitude,
      longitude: profile.longitude,
      tags: tagsResult.rows.map((entry) => entry.name),
      fame_rating: profile.fame_rating,
      photos: photosResult.rows.map((item) => ({
        id: item.id,
        data_url: item.data_url,
        is_primary: item.is_primary,
      })),
    };

    return res.json({
      message: "Profile updated successfully",
      user: updatedUser
        ? {
            id: updatedUser.id,
            email: updatedUser.email,
            username: updatedUser.username,
            first_name: updatedUser.first_name,
            last_name: updatedUser.last_name,
            email_verified: updatedUser.email_verified,
            profile_completed: isProfileCompleted(
              {
                username: updatedUser.username,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name,
                email: updatedUser.email,
              },
              profilePayload,
            ),
            created_at: updatedUser.created_at,
          }
        : undefined,
      profile: profilePayload,
    });
  } catch (error) {
    if (inTransaction) {
      await client.query("ROLLBACK");
    }

    if (error.code === "23505") {
      if (error.constraint === "users_email_key") {
        return res.status(409).json({ error: "Email already exists" });
      }
      if (error.constraint === "users_username_key") {
        return res.status(409).json({ error: "Username already exists" });
      }
      return res
        .status(409)
        .json({ error: "Email or username already exists" });
    }

    return next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
