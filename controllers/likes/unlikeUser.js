const likeService = require("../../services/likeService");
const { createNotification } = require("../../services/notificationService");
const { insertSystemMessage } = require("../../utils/chatSystemMessage");

/**
 * Remove an existing like from the authenticated user toward another user.
 *
 * Implementation details:
 * - Uses the authenticated user as the liker and `req.params.id` as the target.
 * - Validates required IDs and rejects self-unlikes up front.
 * - Calls `likeService.removeLike()` first so the endpoint behaves safely when
 *   the like is already gone.
 * - If the removed like was part of a match, it writes system messages and
 *   emits realtime match-change events to both users so the UI can react.
 * - Always sends an "unlike" notification to the affected user after a real
 *   removal so the event trail stays consistent.
 */
async function unlikeUser(req, res, next) {
  try {
    const likerId = String(req.userId ?? "");
    const likedId = req.params.id;
    if (!likerId || !likedId) {
      return res.status(400).json({ error: "authenticated user and user id param required" });
    }
    
    if (String(likerId) === String(likedId)) {
      return res.status(400).json({ error: "Cannot unlike yourself" });
    }

    const removed = await likeService.removeLike(likerId, likedId);
    if (!removed) {
      return res.status(200).json({ message: "Like already removed or non-existent" });
    }

    const isMatch = await likeService.checkLikeExists(likedId, likerId);
    if (isMatch) {
      await insertSystemMessage(likerId, likedId, "You are no longer matched. You cannot send messages.");
      await insertSystemMessage(likedId, likerId, "You are no longer matched. You cannot send messages.");

      try {
        const { getIO } = require("../../realtime");
        const { REALTIME_EVENTS } = require("../../realtime/events");
        const io = getIO && getIO();
        if (io) {
          io.to(`user:${likerId}`).emit(REALTIME_EVENTS.MATCH_STATUS_CHANGED, { userId: Number(likedId), matched: false });
          io.to(`user:${likedId}`).emit(REALTIME_EVENTS.MATCH_STATUS_CHANGED, { userId: Number(likerId), matched: false });
        }
      } catch (e) {}
    }

    await createNotification({
      userId: likedId,
      actorUserId: likerId,
      type: "unlike",
      message: "A connected user unliked you.",
      metadata: { unliked_by_user_id: likerId },
    });

    return res.status(200).json({ message: "Like removed" });
  } catch (error) {
    return next(error);
  }
}

module.exports = { unlikeUser };
