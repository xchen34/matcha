const likeService = require("../../services/likeService");

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
