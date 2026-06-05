const pool = require("../db");
const { verifyRealtimeToken } = require("../realtime/authToken");

/**
 * Authenticate an API request using a Bearer token.
 *
 * What it does:
 * - reads `Authorization: Bearer <token>` from the request headers
 * - verifies the token and extracts the user claims
 * - confirms the user still exists and is not soft-deleted in the database
 * - attaches the authenticated user ID to `req.userId` for downstream controllers
 *
 * How it works:
 * - rejects the request immediately with 401 if the header is missing or malformed
 * - strips the `Bearer ` prefix to get the raw token string
 * - reuses `verifyRealtimeToken()` so API auth and realtime auth share the same
 *   token format and validation rules
 * - queries the `users` table to ensure the account is still active
 * - calls `next()` only after all checks pass so protected routes can continue
 */
async function requireAuth(req, res, next) {
  try {
    // Read the standard Bearer token from the Authorization header.
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    // Remove the "Bearer " prefix and validate the raw token.
    const token = authHeader.substring(7);
    const claims = verifyRealtimeToken(token);

    // Development logs that help trace auth flow and rejected requests.
    console.log("[requireAuth DEBUG] URL:", req.originalUrl);
    console.log("[requireAuth DEBUG] tokenPresent:", Boolean(token));
    console.log("[requireAuth DEBUG] authenticatedUserId:", claims?.userId || null);

    // Reject invalid, expired, or tampered tokens.
    if (!claims || !claims.userId) {
      console.log("[requireAuth DEBUG] Rejecting request 401");
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    // Confirm the user still exists and has not been soft-deleted.
    const result = await pool.query(
      `
      SELECT 1
      FROM users
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [claims.userId],
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Account is no longer active." });
    }

    // Attach the authenticated user ID for downstream handlers.
    req.userId = claims.userId;
    return next();
  } catch (error) {
    // Forward unexpected errors to the centralized error handler.
    return next(error);
  }
}

module.exports = { requireAuth };
