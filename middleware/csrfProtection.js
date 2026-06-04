const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Read the list of origins allowed to perform state-changing requests.
 *
 * Implementation details:
 * - Prefers `CSRF_ALLOWED_ORIGINS` so deployment can override the list.
 * - Falls back to `CORS_ORIGIN`, then to the local frontend origin in dev.
 * - Splits comma-separated values and trims whitespace so the env var is easy
 *   to maintain.
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
 * - Returns an empty string for missing or invalid values.
 * - Uses the `URL` parser so both `Origin` and `Referer` headers are handled
 *   consistently.
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
 * - Allows read-only methods immediately.
 * - For mutating requests, checks whether the request origin is trusted.
 * - Lets non-browser clients through when they do not send Origin/Referer.
 *
 * How it works:
 * - Reads `Origin` first, then falls back to `Referer`.
 * - Compares the derived origin against the allowed origin list.
 * - Returns 403 when the request looks like it came from an untrusted site.
 */
function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const allowedOrigins = parseAllowedOrigins();
  const originHeader = req.header("origin");
  const refererHeader = req.header("referer");

  const requestOrigin = toOrigin(originHeader) || toOrigin(refererHeader);

  // Allow non-browser clients (curl/Postman) that do not send Origin/Referer.
  if (!requestOrigin) {
    return next();
  }

  if (allowedOrigins.includes(requestOrigin)) {
    return next();
  }

  return res.status(403).json({
    error: "CSRF validation failed: untrusted request origin.",
  });
}

module.exports = {
  csrfProtection,
};
