const pool = require("../db");
const { verifyRealtimeToken } = require("../realtime/authToken");

/**
 * Authenticate an API request using a Bearer token.
 *
 * What it does:
 * - Reads `Authorization: Bearer <token>` from the request headers.
 * - Verifies the token and extracts the user claims.
 * - Confirms the user still exists and is not soft-deleted in the database.
 * - Attaches the authenticated user ID to `req.userId` for downstream controllers.
 *
 * How it works:
 * - Rejects the request immediately with 401 if the header is missing or malformed.
 * - Uses `verifyRealtimeToken()` to validate the token signature and expiry.
 * - Queries the `users` table to ensure the account is still active.
 * - Calls `next()` only after all checks pass so protected routes can continue.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const claims = verifyRealtimeToken(token);

    console.log("[requireAuth DEBUG] URL:", req.originalUrl);
    console.log("[requireAuth DEBUG] tokenPresent:", Boolean(token));
    console.log("[requireAuth DEBUG] authenticatedUserId:", claims?.userId || null);

    if (!claims || !claims.userId) {
      console.log("[requireAuth DEBUG] Rejecting request 401");
      return res.status(401).json({ error: "Invalid or expired token." });
    }

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

    // 将验证解析出的 userId 挂载在 req 对象上，传递给下游
    req.userId = claims.userId;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireAuth };
