const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const isProduction = process.env.NODE_ENV === "production";

/* ========== Helpers ========== */
/**
 * Parse a positive integer from an environment variable.
 *
 * Implementation details:
 * - Uses base-10 parsing so accidental hex-like strings do not slip through.
 * - Returns the provided fallback when the value is missing or invalid.
 */
function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

/**
 * Build a stable per-client key for rate limiting.
 *
 * Implementation details:
 * - Prefers the request IP address.
 * - Falls back to the socket remote address.
 * - Uses `ipKeyGenerator()` so the key format matches express-rate-limit's
 *   expectations.
 */
function getClientKey(req) {
  // Prefer real IP; fallback keeps limits stable in local/dev tests.
  const clientIp = req.ip || req.socket?.remoteAddress;
  if (clientIp) {
    return ipKeyGenerator(clientIp);
  }

  return "unknown";
}

/* ========== Config values ========== */
const globalWindowMs = parsePositiveInt(
  process.env.RATE_LIMIT_GLOBAL_WINDOW_MS,
  isProduction ? 15 * 60 * 1000 : 5 * 60 * 1000,
);

const globalMax = parsePositiveInt(
  process.env.RATE_LIMIT_GLOBAL_MAX,
  isProduction ? 600 : 5000,
);

const authWindowMs = parsePositiveInt(
  process.env.RATE_LIMIT_AUTH_WINDOW_MS,
  15 * 60 * 1000,
);

const authMax = parsePositiveInt(
  process.env.RATE_LIMIT_AUTH_MAX,
  isProduction ? 20 : 200,
);

const authSensitiveWindowMs = parsePositiveInt(
  process.env.RATE_LIMIT_AUTH_SENSITIVE_WINDOW_MS,
  isProduction ? 15 * 60 * 1000 : 5 * 60 * 1000,
);

const authSensitiveMax = parsePositiveInt(
  process.env.RATE_LIMIT_AUTH_SENSITIVE_MAX,
  isProduction ? 8 : 100,
);

/* ========== Rate limiters ========== */
const globalApiLimiter = rateLimit({
  windowMs: globalWindowMs,
  max: globalMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientKey,
  message: { error: "Too many requests. Please try again later." },
});

const authLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientKey,
  message: {
    error: "Too many authentication requests. Please try again later.",
  },
});

const authSensitiveLimiter = rateLimit({
  windowMs: authSensitiveWindowMs,
  max: authSensitiveMax,
  // Count only failed attempts to avoid locking out users after successful logins.
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientKey,
  message: {
    error: "Too many attempts for this action. Please try again later.",
  },
});

module.exports = {
  globalApiLimiter,
  authLimiter,
  authSensitiveLimiter,
};
