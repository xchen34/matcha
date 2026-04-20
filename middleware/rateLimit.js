const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getClientKey(req) {
  // Prefer real IP; fallback keeps limits stable in local/dev tests.
  const clientIp = req.ip || req.socket?.remoteAddress;
  if (clientIp) {
    return ipKeyGenerator(clientIp);
  }

  return "unknown";
}

const globalWindowMs = parsePositiveInt(
  process.env.RATE_LIMIT_GLOBAL_WINDOW_MS,
  15 * 60 * 1000,
);
const globalMax = parsePositiveInt(process.env.RATE_LIMIT_GLOBAL_MAX, 600);

const authWindowMs = parsePositiveInt(
  process.env.RATE_LIMIT_AUTH_WINDOW_MS,
  15 * 60 * 1000,
);
const authMax = parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 20);

const authSensitiveWindowMs = parsePositiveInt(
  process.env.RATE_LIMIT_AUTH_SENSITIVE_WINDOW_MS,
  15 * 60 * 1000,
);
const authSensitiveMax = parsePositiveInt(
  process.env.RATE_LIMIT_AUTH_SENSITIVE_MAX,
  8,
);

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
