const authService = require("../../services/authService");
const { createRealtimeToken } = require("./shared");

async function getRealtimeToken(req, res, next) {
  try {
    const rawUserId = req.header("x-user-id");
    const userId = Number(rawUserId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "x-user-id header is required" });
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