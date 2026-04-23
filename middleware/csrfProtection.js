const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function parseAllowedOrigins() {
  const raw = process.env.CSRF_ALLOWED_ORIGINS || process.env.CORS_ORIGIN || "http://localhost:5173";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function toOrigin(value) {
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

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
