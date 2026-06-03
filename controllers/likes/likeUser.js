const likeService = require("../../services/likeService");
const { createNotification } = require("../../services/notificationService");
const { insertSystemMessage } = require("../../utils/chatSystemMessage");

/**
 * Record that the authenticated user liked another user.
 *
 * Implementation details:
 * - Reads the liker from `req.userId` and the target from `req.params.id`.
 * - Rejects invalid input, self-likes, and users without a primary photo
 *   before touching the database.
 * - Uses `likeService.insertLike()` as the idempotent write gate so repeated
 *   requests do not create duplicate likes or duplicate downstream effects.
 * - Sends a notification to the liked user immediately after a new like is
 *   created.
 * - Checks for a reciprocal like to detect a match, then creates match
 *   notifications, inserts system chat messages for both users, and emits a
 *   realtime match status event if socket support is available.
 */
async function likeUser(req, res, next) {
  try {
    const likerId = String(req.userId ?? "");
    const likedId = req.params.id;
    if (!likerId || !likedId) {
      return res.status(400).json({ error: "authenticated user and user id param required" });
    }
    if (String(likerId) === String(likedId)) {
      return res.status(400).json({ error: "Cannot like yourself" });
    }

    const hasPrimaryPhoto = await likeService.userHasPrimaryPhoto(likerId);
    if (!hasPrimaryPhoto) {
      return res.status(403).json({ error: "You need a profile picture before liking another user." });
    }

    const isNewLike = await likeService.insertLike(likerId, likedId);
    if (!isNewLike) {
      return res.status(200).json({ message: "Already liked" });
    }

    await createNotification({
      userId: likedId,
      actorUserId: likerId,
      type: "like_received",
      message: "You received a like.",
      metadata: { liker_user_id: likerId },
    });

    const isMatch = await likeService.checkLikeExists(likedId, likerId);
    if (isMatch) {
      await createNotification({
        userId: likedId, actorUserId: likerId, type: "match",
        message: "A user you liked liked you back.", metadata: { with_user_id: likerId },
      });
      await createNotification({
        userId: likerId, actorUserId: likedId, type: "match",
        message: "A user you liked liked you back.", metadata: { with_user_id: likedId },
      });

      const users = await likeService.getUserNames(likerId, likedId);
      const userA = users.find((u) => String(u.id) === String(likerId));
      const userB = users.find((u) => String(u.id) === String(likedId));
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-GB");
      const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

      await insertSystemMessage(likerId, likedId, `You matched with ${userB.first_name || userB.username || userB.id} on ${dateStr} at ${timeStr}`);
      await insertSystemMessage(likedId, likerId, `You matched with ${userA.first_name || userA.username || userA.id} on ${dateStr} at ${timeStr}`);

      try {
        const { getIO } = require("../../realtime");
        const { REALTIME_EVENTS } = require("../../realtime/events");
        const io = getIO && getIO();
        if (io) {
          io.to(`user:${likerId}`).emit(REALTIME_EVENTS.MATCH_STATUS_CHANGED, { userId: Number(likedId), matched: true });
          io.to(`user:${likedId}`).emit(REALTIME_EVENTS.MATCH_STATUS_CHANGED, { userId: Number(likerId), matched: true });
        }
      } catch (e) {}
    }

    return res.status(201).json({ message: "Like recorded" });
  } catch (error) {
    return next(error);
  }
}

module.exports = { likeUser };
