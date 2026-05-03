const { isNonEmptyString, parseUserIdFromRequest, resolveCurrentUserId, parseOptionalCoordinate, reverseGeocode } = require("./helpers");
const {
  normalizeLocationText,
  locationTextMatches,
  forwardGeocode,
  searchLocationsByQuery,
  fetchNeighborhoodsForCity,
} = require("./shared");

async function getReverseGeocode(req, res, next) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({ error: "Not authenticated. Please login and provide x-user-id." });
    }

    const latitude = parseOptionalCoordinate(req.query.latitude);
    const longitude = parseOptionalCoordinate(req.query.longitude);
    if (latitude === null || longitude === null) {
      return res.status(400).json({ error: "latitude and longitude query params are required" });
    }

    const resolved = await reverseGeocode(latitude, longitude);
    return res.json(resolved);
  } catch (error) {
    return next(error);
  }
}

async function validateLocation(req, res, next) {
  try {
    parseUserIdFromRequest(req);
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

      suggestions = fallbackResults.map((item) => ({
        display_name: item.display_name || "",
        latitude: null,
        longitude: null,
        city: item.city || "",
        neighborhood: item.neighborhood || "",
        country: item.country || "",
        importance: item.importance || 0,
      })).slice(0, limit);
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
      ? suggestions.some((item) => locationTextMatches(wantedNeighborhood, item.neighborhood))
      : true;

    const isValid = suggestions.length > 0 && cityExists && neighborhoodExists;
    return res.json({
      validation: {
        is_valid: isValid,
        city_exists: cityExists,
        neighborhood_exists: neighborhoodExists,
        matched_exact_suggestion: Boolean(matchedSuggestion),
      },
      requested: { city, neighborhood, latitude, longitude },
      resolved_from_gps: gpsResolved,
      matched_suggestion: matchedSuggestion,
      suggestions,
    });
  } catch (error) {
    return next(error);
  }
}

async function getCityNeighborhoods(req, res, next) {
  try {
    parseUserIdFromRequest(req);
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
}

async function getCitySuggestions(req, res, next) {
  try {
    parseUserIdFromRequest(req);
    const query = isNonEmptyString(req.query.query) ? req.query.query.trim() : "";
    if (query.length < 2) {
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

    let countryFilter = null;
    if (results.length > 0 && results[0].country) {
      countryFilter = results[0].country.trim();
    }

    let filteredResults = results;
    if (countryFilter) {
      filteredResults = results.filter((item) => {
        const itemCountry = (item.country || "").trim();
        return itemCountry && itemCountry === countryFilter;
      });
    }

    const normalizedQuery = normalizeLocationText(query);
    const byCity = new Map();

    for (const item of filteredResults) {
      const cityName = (item.city || item.display_name || "").trim();
      if (!cityName) continue;

      const normalizedCity = normalizeLocationText(cityName);
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
          city: cityName,
          display_name: item.display_name || cityName,
          importance: item.importance || 0,
        });
      }
    }

    const suggestions = Array.from(byCity.values())
      .sort((a, b) => {
        const aStarts = normalizeLocationText(a.city).startsWith(normalizedQuery)
          ? 1
          : 0;
        const bStarts = normalizeLocationText(b.city).startsWith(normalizedQuery)
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

    return res.json({ query, suggestions });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getReverseGeocode,
  validateLocation,
  getCityNeighborhoods,
  getCitySuggestions,
};