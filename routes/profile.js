const express = require("express");
const pool = require("../db");

const router = express.Router();
const allowedGenders = ["male", "female", "non_binary", "other"];
const allowedPreferences = ["male", "female", "both", "other"];
const GEO_CACHE_TTL_MS = 5 * 60 * 1000;
const geocodeCache = new Map();

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

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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

async function reverseGeocode(latitude, longitude) {
  const cacheKey = `reverse:${latitude}:${longitude}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  const endpoint = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1&accept-language=en`;
  let response;
  try {
    response = await fetch(endpoint, {
      headers: {
        "User-Agent": "matcha/1.0 (education project)",
        Accept: "application/json",
        "Accept-Language": "en",
      },
    });
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

  const headers = {
    "User-Agent": "matcha/1.0 (education project)",
    Accept: "application/json",
    "Accept-Language": "en",
  };

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
      response = await fetch(endpoint, { headers });
    } catch {
      continue;
    }

    if (!response.ok) {
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
    response = await fetch(endpoint, {
      headers: {
        "User-Agent": "matcha/1.0 (education project)",
        Accept: "application/json",
        "Accept-Language": "en",
      },
    });
  } catch {
    return [];
  }

  if (!response.ok) return [];

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
    const currentUserId = await resolveCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({
        error: "Not authenticated. Please login and provide x-user-id.",
      });
    }

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

    const suggestions = await forwardGeocode({
      city: effectiveCity,
      neighborhood: effectiveNeighborhood,
      limit,
    });

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
    const currentUserId = await resolveCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({
        error: "Not authenticated. Please login and provide x-user-id.",
      });
    }

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

router.get("/profile/me", async (req, res, next) => {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({
        error: "Not authenticated. Please login and provide x-user-id.",
      });
    }

    const [profileResult, tagsResult] = await Promise.all([
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
          p.fame_rating
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
    ]);

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = profileResult.rows[0];
    return res.json({
      user: {
        id: row.user_id,
        email: row.email,
        username: row.username,
        first_name: row.first_name,
        last_name: row.last_name,
        email_verified: row.email_verified,
        created_at: row.created_at,
      },
      profile: {
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
    } = req.body;

    if (!isNonEmptyString(biography)) {
      return res.status(400).json({ error: "biography is required" });
    }
    if (!isNonEmptyString(gender) || !allowedGenders.includes(gender)) {
      return res
        .status(400)
        .json({ error: "gender is invalid", allowed_values: allowedGenders });
    }
    if (
      !isNonEmptyString(sexual_preference) ||
      !allowedPreferences.includes(sexual_preference)
    ) {
      return res.status(400).json({
        error: "sexual_preference is invalid",
        allowed_values: allowedPreferences,
      });
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

    await client.query("BEGIN");
    inTransaction = true;

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
        gender = EXCLUDED.gender,
        sexual_preference = EXCLUDED.sexual_preference,
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
        gender,
        sexual_preference,
        biography.trim(),
        birth_date || null,
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

    await client.query("COMMIT");
    inTransaction = false;

    const profile = updated.rows[0];
    return res.json({
      message: "Profile updated successfully",
      profile: {
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
      },
    });
  } catch (error) {
    if (inTransaction) {
      await client.query("ROLLBACK");
    }
    return next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
