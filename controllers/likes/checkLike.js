const likeService = require("../../services/likeService");

/**
 * Check whether the authenticated user has liked a specific target user.
 *
 * Implementation details:
 * - Uses `req.userId` for the current user and `req.params.id` for the target.
 * - Validates both IDs before querying so the service layer only receives
 *   meaningful values.
 * - Delegates the actual lookup to `likeService.checkLikeExists()` and returns
 *   the boolean result as JSON.
 */
async function checkLike(req, res, next) {
  try {
    const likerId = String(req.userId ?? "");
    const likedId = req.params.id;
    if (!likerId || !likedId) {
      return res.status(400).json({ error: "authenticated user and user id param required" });
    }

    const liked = await likeService.checkLikeExists(likerId, likedId);
    res.json({ liked });
  } catch (error) {
    next(error);
  }
}

module.exports = { checkLike };
