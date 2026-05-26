const moderationService = require("../../services/moderationService");
const { getIO, REALTIME_EVENTS } = require("../../realtime");
const { parsePositiveInt } = require("./helpers");

async function blockUser(req, res, next) {
  try {
    const blockerUserId = parsePositiveInt(req.userId);
    const blockedUserId = parsePositiveInt(req.params.id);

    if (!blockerUserId || !blockedUserId) {
      return res.status(400).json({ error: "authenticated user and user id param are required" });
    }
    
    if (blockerUserId === blockedUserId) {
      return res.status(400).json({ error: "You cannot block yourself" });
    }

    const exists = await moderationService.usersExist([blockerUserId, blockedUserId]);
    if (!exists) {
      return res.status(404).json({ error: "User not found" });
    }

    await moderationService.blockUser(blockerUserId, blockedUserId);

    const io = getIO();
    if (io) {
      const payload = {
        user_a_id: blockerUserId,
        user_b_id: blockedUserId,
        blocked_by_user_id: blockerUserId,
        blocked_user_id: blockedUserId,
        is_blocked: true,
      };
      io.to(`user:${blockerUserId}`).emit(REALTIME_EVENTS.CHAT_BLOCK_STATUS_CHANGED, payload);
      io.to(`user:${blockedUserId}`).emit(REALTIME_EVENTS.CHAT_BLOCK_STATUS_CHANGED, payload);
    }

    return res.status(200).json({ message: "User blocked successfully" });
  } catch (error) {
    return next(error);
  }
}

module.exports = { blockUser };
