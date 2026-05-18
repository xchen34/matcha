const likeService = require("../../services/likeService");

async function getViews(req, res, next) {
  try {
    const currentUserId = req.header("x-user-id");
    if (!currentUserId) {
      return res.status(400).json({ error: "x-user-id header required" });
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
