const likeService = require("../../services/likeService");

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
