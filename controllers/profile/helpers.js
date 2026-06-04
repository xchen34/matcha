const {
  USERNAME_PATTERN,
  getMinBirthDateIso,
  isValidEmail,
  parseBirthDate,
  isAtLeast18YearsOld,
  isProfileCompleted,
  isNonEmptyString,
  MAX_BIO_LENGTH,
  normalizeTag,
} = require("../../utils/userValidation");

/* ========== CONSTANTS ========== */
const allowedGenders = ["male", "female", "non_binary", "other"];
const allowedPreferences = ["male", "female", "both", "other"];

// Geocoding cache TTL (5minutes) to reduce load on Nominatim and improve performance
const GEO_CACHE_TTL_MS = 5 * 60 * 1000;

// Nominatim API Rate limit: 1 request per second max
const NOMINATIM_MIN_INTERVAL_MS = 1100;

// Nominatim API headers (required by OpenStreetMap usage policy)
const NOMINATIM_HEADERS = {
  "User-Agent": "matcha/1.0 (education project)",
  Accept: "application/json",
  "Accept-Language": "en",
};

/* ========= Global state (Cache and Rate Limiting) ========== */
const geocodeCache = new Map();
let nominatimQueue = Promise.resolve();
let lastNominatimRequestAt = 0;

/* ========= Cache functions ========= */
// Retrieve a value from cache (if exists and not expired)
function getCachedValue(cacheKey) {
  const cached = geocodeCache.get(cacheKey);
  if (!cached) return null;

  if (cached.expiresAt < Date.now()) {
    geocodeCache.delete(cacheKey);
    return null;
  }

  return cached.value;
}

// Store value in cache with expiration time
function setCachedValue(cacheKey, value) {
  geocodeCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + GEO_CACHE_TTL_MS,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ========= Nominatim API with Rate Limiting ========= */
// Fetches data from Nominatim API with built-in rate limiting and retry logic
async function fetchNominatim(endpoint) {
  const run = async () => {
    // Apply rate limiting if not enough time has passed since last request
    const now = Date.now();
    const waitMs = Math.max(
      0,
      NOMINATIM_MIN_INTERVAL_MS - (now - lastNominatimRequestAt),
    );
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    lastNominatimRequestAt = Date.now();
    let response = await fetch(endpoint, {
      headers: NOMINATIM_HEADERS,
    });

    // Handle rate limit with retry after delay
    if (response.status === 429) {
      console.warn("[nominatim] rate limited, retrying", { endpoint });
      await sleep(1500);
      lastNominatimRequestAt = Date.now();
      response = await fetch(endpoint, { headers: NOMINATIM_HEADERS });
    }

    return response;
  };

  // Queue the request to prevent concurrent calls
  const task = nominatimQueue.then(run, run);
  nominatimQueue = task.then(
    () => undefined,
    () => undefined,
  );

  return task;
}

// Converts GPS coordinates to a human-readable address
async function reverseGeocode(latitude, longitude) {
  const cacheKey = `reverse:${latitude}:${longitude}`;

  // Check cache first to avoid unnecessary API calls
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  const endpoint = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1&accept-language=en`;
  let response;
  try {
    response = await fetchNominatim(endpoint);
  } catch (error) {
    return {
      city: "",
      neighborhood: "",
      display_name: "",
    };
  }

  if (!response.ok) {
    return {
      city: "",
      neighborhood: "",
      display_name: "",
    };
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    return {
      city: "",
      neighborhood: "",
      display_name: "",
    };
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
      address.neighborhood ||
      address.suburb ||
      address.quarter ||
      address.city_district ||
      "",
    display_name: data.display_name || "",
  };

  setCachedValue(cacheKey, resolved);

  return resolved;
}

// Extracts city, neighborhood, and country from a Nominatim address object
function extractAddressParts(address) {
  const source = address || {};

  return {
    city:
      source.city || source.town || source.village || source.municipality || "",
    neighborhood:
      source.neighborhood ||
      source.suburb ||
      source.quarter ||
      source.city_district ||
      "",
    country: source.country || "",
  };
}

/* ======== User & request helpers ======== */
// Extracts user ID from request
function parseUserIdFromRequest(req) {
  return req.userId || null;
}

// Resolves the current user's ID and verifies if the user exists in the database
async function resolveCurrentUserId(req) {
  const requestedUserId = parseUserIdFromRequest(req);
  if (!requestedUserId) return null;

  const user = await require("../../services/profileService").getUserById(
    requestedUserId,
  );
  if (!user) return null;

  return user.id;
}

/* ======== Tags helpers ======== */
// Normalizes an array of tags by trimming, lowercasing, and removing duplicates
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

/* ========== Coordinates helpers ========== */
// Parse limit parameter 
function parseLimit(value, defaultValue, min = 1, max = 100) {
  const raw = Number(value);
  if (!Number.isInteger(raw)) return defaultValue;
  return Math.max(min, Math.min(raw, max));
}

// Parses an optional coordinate value
function parseOptionalCoordinate(value) {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return null;

  return parsed;
}

/* ========== Birthdate & Age helpers ========== */
// Calculates age from birth date
function getAge(birthDate) {
  if (!birthDate) return null;

  const today = new Date();
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;

  return age;
}

module.exports = {
  MAX_BIO_LENGTH,
  USERNAME_PATTERN,
  getMinBirthDateIso,
  parseBirthDate,
  isAtLeast18YearsOld,
  isProfileCompleted,
  isValidEmail,
  isNonEmptyString,
  allowedGenders,
  allowedPreferences,
  getCachedValue,
  setCachedValue,
  sleep,
  fetchNominatim,
  reverseGeocode,
  extractAddressParts,
  parseUserIdFromRequest,
  resolveCurrentUserId,
  normalizeTag,
  normalizeTagsInput,
  parseLimit,
  parseOptionalCoordinate,
  getAge,
};
