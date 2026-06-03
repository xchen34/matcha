const likeService = require("../../services/likeService");

/**
 * Return the list of users who liked the authenticated user.
 *
 * Implementation details:
 * - Reads the current user from `req.userId`.
 * - Delegates the database lookup to `likeService.getLikesReceived()`.
 * - Maps the raw rows into a stable response shape so the client only receives
 *   the fields needed by the likes screen.
 */
async function getLikes(req, res, next) {
  try {
    const currentUserId = String(req.userId ?? "");
    if (!currentUserId) {
      return res.status(400).json({ error: "authenticated user required" });
    }

    const rows = await likeService.getLikesReceived(currentUserId);
    
    return res.json({
      users: rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        primary_photo_url: row.primary_photo_url || null,
        created_at: row.created_at,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getLikes };
