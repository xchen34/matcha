const authService = require("../../services/authService");
const { createRealtimeToken } = require("./shared");
const { REALTIME_TOKEN_TTL_SECONDS } = require("../../realtime/authToken");

/*  Get a new realtime token for the authenticated user */
async function getRealtimeToken(req, res, next) {
  try {
    // The userId should be set by the authentication middleware
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    // Check if the user still exists (in case they were deleted)
    const exists = await authService.checkUserExists(userId);
    if (!exists) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    return res.json({
      realtime_token: createRealtimeToken(userId),
      realtime_token_expires_in: REALTIME_TOKEN_TTL_SECONDS,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getRealtimeToken };
