const {
  USERNAME_PATTERN,
  isValidEmail,
  parseBirthDate,
  isAtLeast18YearsOld,
  isProfileCompleted,
} = require("../../utils/userValidation");

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

function parseUserIdFromRequest(req) {
  // 中间件鉴权通过后，userId 会直接被挂在 req.userId 上
  return req.userId || null;
}

async function resolveCurrentUserId(req) {
  const requestedUserId = parseUserIdFromRequest(req);
  if (!requestedUserId) return null;

  const user = await require("../../services/profileService").getUserById(requestedUserId);
  if (!user) return null;

  return user.id;
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

function getMinBirthDateIso() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(date.getUTCFullYear() - 100);

  return date.toISOString().slice(0, 10);
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
    response = await fetchNominatim(endpoint);
  } catch (error) {
    return { city: "", neighborhood: "", display_name: "" };
  }

  if (!response.ok) {
    return { city: "", neighborhood: "", display_name: "" };
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
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

module.exports = {
  MAX_BIO_LENGTH,
  USERNAME_PATTERN,
  getMinBirthDateIso,
  allowedGenders,
  allowedPreferences,
  getCachedValue,
  setCachedValue,
  sleep,
  fetchNominatim,
  isNonEmptyString,
  isValidEmail,
  parseUserIdFromRequest,
  resolveCurrentUserId,
  normalizeTag,
  normalizeTagsInput,
  parseOptionalCoordinate,
  parseBirthDate,
  isAtLeast18YearsOld,
  getAge,
  isProfileCompleted,
  reverseGeocode,
  extractAddressParts,
};
