const likeService = require("../../services/likeService");

/**
 * Check whether two users are mutually matched.
 *
 * Implementation details:
 * - Treats the authenticated user as one side of the pair and `req.params.id`
 *   as the other side.
 * - Rejects invalid IDs and self-match attempts before querying.
 * - Calls `likeService.checkMatchExists()` to hide the matching logic inside
 *   the service layer and returns the result as `is_match`.
 */
async function checkMatch(req, res, next) {
  try {
    const userA = String(req.userId ?? "");
    const userB = req.params.id;
    if (!userA || !userB) {
      return res.status(400).json({ error: "authenticated user and id param required" });
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
