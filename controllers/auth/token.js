const authService = require("../../services/authService");
const { createRealtimeToken } = require("./shared");

async function getRealtimeToken(req, res, next) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const exists = await authService.checkUserExists(userId);

    if (!exists) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ realtime_token: createRealtimeToken(userId) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getRealtimeToken };