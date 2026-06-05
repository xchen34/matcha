const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Read the list of origins allowed to perform state-changing requests.
 *
 * Implementation details:
 * - prefers `CSRF_ALLOWED_ORIGINS` so deployment can override the list
 * - falls back to `CORS_ORIGIN`, then to the local frontend origin in dev
 * - splits comma-separated values and trims whitespace so the env var is easy
 *   to maintain
 */
function parseAllowedOrigins() {
  const raw = process.env.CSRF_ALLOWED_ORIGINS || process.env.CORS_ORIGIN || "http://localhost:5173";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Reduce a request header or referrer value down to its origin only.
 *
 * Implementation details:
 * - returns an empty string for missing or invalid values
 * - uses the `URL` parser so both `Origin` and `Referer` headers are handled
 *   consistently
 */
function toOrigin(value) {
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

/**
 * Basic CSRF origin check for non-safe HTTP methods.
 *
 * What it does:
 * - allows read-only methods immediately
 * - checks whether mutating requests come from a trusted origin
 * - lets non-browser clients through when they do not send Origin/Referer
 *
 * How it works:
 * - reads `Origin` first, then falls back to `Referer`
 * - normalizes the header down to only the origin so paths and query strings
 *   do not affect the check
 * - compares the request origin against the allowed origin list
 * - returns 403 when the request looks like it came from an untrusted site
 */
function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Build the allowlist from environment configuration on each request.
  const allowedOrigins = parseAllowedOrigins();
  const originHeader = req.header("origin");
  const refererHeader = req.header("referer");

  // Prefer Origin, then fall back to Referer for older browser flows.
  const requestOrigin = toOrigin(originHeader) || toOrigin(refererHeader);

  // Allow non-browser clients (curl/Postman) that do not send Origin/Referer.
  if (!requestOrigin) {
    return next();
  }

  // Only allow requests from trusted frontend origins.
  if (allowedOrigins.includes(requestOrigin)) {
    return next();
  }

  // Reject suspicious cross-site state-changing requests.
  return res.status(403).json({
    error: "CSRF validation failed: untrusted request origin.",
  });
}

module.exports = {
  csrfProtection,
};
