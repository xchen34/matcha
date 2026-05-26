const { verifyRealtimeToken } = require("../realtime/authToken");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.substring(7); // 提取 "Bearer " 后面的 token 字符串
  const claims = verifyRealtimeToken(token);

  if (!claims || !claims.userId) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  // 将验证解析出的 userId 挂载在 req 对象上，传递给下游
  req.userId = claims.userId;
  // Overwrite the header internally on the server to keep legacy controllers working securely
  req.headers["x-user-id"] = String(claims.userId);
  next();
}

module.exports = { requireAuth };