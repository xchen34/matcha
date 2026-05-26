const moderationService = require("../../services/moderationService");
const { parsePositiveInt } = require("./helpers");

async function getBlockedUsers(req, res, next) {
  try {
    const currentUserId = parsePositiveInt(req.userId);
    if (!currentUserId) {
      return res.status(400).json({ error: "authenticated user is required" });
    }

    const users = await moderationService.getBlockedUsers(currentUserId);
    
    return res.json({ users });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res.json({ users: [] });
    }
    return next(error);
  }
}

module.exports = { getBlockedUsers };
