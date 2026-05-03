const likeService = require("../../services/likeService");

async function checkLike(req, res, next) {
  try {
    const likerId = req.header("x-user-id");
    const likedId = req.params.id;
    if (!likerId || !likedId) {
      return res.status(400).json({ error: "x-user-id header and user id param required" });
    }
    const liked = await likeService.checkLikeExists(likerId, likedId);
    res.json({ liked });
  } catch (error) {
    next(error);
  }
}

module.exports = { checkLike };
