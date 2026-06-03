const likeService = require("../../services/likeService");

/**
 * Return the list of matched users for the authenticated user.
 *
 * Implementation details:
 * - Uses the current user ID from `req.userId`.
 * - Fetches match rows through `likeService.getMatches()` so the controller
 *   stays thin and only handles request/response shaping.
 * - Normalizes the response to a minimal user list including the match time.
 */
async function getMatches(req, res, next) {
  try {
    const currentUserId = String(req.userId ?? "");
    if (!currentUserId) {
      return res.status(400).json({ error: "authenticated user required" });
    }

    const rows = await likeService.getMatches(currentUserId);
    
    return res.json({
      users: rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        primary_photo_url: row.primary_photo_url || null,
        matched_at: row.matched_at,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getMatches };
