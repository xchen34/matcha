const crypto = require("crypto");

const REALTIME_TOKEN_TTL_SECONDS = Number(
  process.env.REALTIME_TOKEN_TTL_SECONDS || 60 * 60 * 12,
);

function getRealtimeSecret() {
  return process.env.REALTIME_SECRET || "matcha-dev-realtime-secret-change-me";
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value) {
  const padding = "=".repeat((4 - (value.length % 4 || 4)) % 4);
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + padding;
  return Buffer.from(normalized, "base64").toString("utf8");
}

function signPayload(payloadString) {
  return crypto
    .createHmac("sha256", getRealtimeSecret())
    .update(payloadString)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createRealtimeToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: Number(userId),
    iat: now,
    exp: now + REALTIME_TOKEN_TTL_SECONDS,
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

function verifyRealtimeToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const tokenParts = token.split(".");
  if (tokenParts.length !== 2) {
    return null;
  }

  const [payloadEncoded, providedSignature] = tokenParts;
  const expectedSignature = signPayload(payloadEncoded);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadEncoded));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const userId = Number(payload?.sub);
  const exp = Number(payload?.exp);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  if (!Number.isInteger(exp) || exp <= now) {
    return null;
  }

  return {
    userId,
    exp,
  };
}

module.exports = {
  createRealtimeToken,
  verifyRealtimeToken,
};
