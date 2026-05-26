const { verifyRealtimeToken } = require("../realtime/authToken");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  const claims = verifyRealtimeToken(token);

  console.log("[requireAuth DEBUG] URL:", req.originalUrl);
  console.log("[requireAuth DEBUG] authHeader:", authHeader);
  console.log("[requireAuth DEBUG] claims:", claims);

  if (!claims || !claims.userId) {
    console.log("[requireAuth DEBUG] Rejecting request 401");
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  // 将验证解析出的 userId 挂载在 req 对象上，传递给下游
  req.userId = claims.userId;
  next();
}

module.exports = { requireAuth };
