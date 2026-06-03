const likeService = require("../../services/likeService");

/**
 * Return the list of users who viewed the authenticated user's profile.
 *
 * Implementation details:
 * - Pulls the current user ID from `req.userId`.
 * - Calls `likeService.getViewsReceived()` to keep the persistence logic out
 *   of the controller.
 * - Projects the raw rows into the compact payload expected by the frontend.
 */
async function getViews(req, res, next) {
  try {
    const currentUserId = String(req.userId ?? "");
    if (!currentUserId) {
      return res.status(400).json({ error: "authenticated user required" });
    }

    const rows = await likeService.getViewsReceived(currentUserId);
    
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

module.exports = { getViews };
