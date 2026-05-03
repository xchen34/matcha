const likeService = require("../../services/likeService");

async function checkMatch(req, res, next) {
  try {
    const userA = req.header("x-user-id");
    const userB = req.params.id;
    if (!userA || !userB) {
      return res.status(400).json({ error: "x-user-id header and id param required" });
    }
    if (String(userA) === String(userB)) {
      return res.status(400).json({ error: "Impossible to match with yourself" });
    }
    const isMatch = await likeService.checkMatchExists(userA, userB);
    res.json({ is_match: isMatch });
  } catch (error) {
    next(error);
  }
}

module.exports = { checkMatch };
