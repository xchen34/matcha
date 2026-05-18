const moderationService = require("../../services/moderationService");
const { parsePositiveInt } = require("./helpers");

async function getStatus(req, res, next) {
  try {
    const actorUserId = parsePositiveInt(req.header("x-user-id"));
    const targetUserId = parsePositiveInt(req.params.id);

    if (!actorUserId || !targetUserId) {
      return res.status(400).json({ error: "x-user-id header and user id param are required" });
    }

    const status = await moderationService.getModerationStatus(actorUserId, targetUserId);
    
    return res.json(status);
  } catch (error) {
    if (error && error.code === "42P01") {
      return res.json({ reported_fake: false, blocked: false });
    }
    return next(error);
  }
}

module.exports = { getStatus };
