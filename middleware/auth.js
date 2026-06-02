const pool = require("../db");
const { verifyRealtimeToken } = require("../realtime/authToken");

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
