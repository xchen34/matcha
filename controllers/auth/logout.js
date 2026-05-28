const pool = require("../../db");

async function logout(req, res, next) {
  try {
    // Validate user ID from auth middleware
    const currentUserId = Number(req.userId);
    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      return res.status(401).json({ 
        error: "Unauthorized" 
      });
    }

    // Update user's last_seen_at to now to mark as offline
    await pool.query(
      `
      UPDATE users
      SET last_seen_at = NOW()
      WHERE id = $1
      `,
      [currentUserId],
    );

    return res.json({ 
      message: "Logged out successfully" 
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { logout };
