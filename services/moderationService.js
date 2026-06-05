const pool = require("../db");

class ModerationService {
  /*  ========== Helpers  ========== */
  // Check if all user IDs in the array exist in the database
  async usersExist(userIds) {
    const result = await pool.query(
      `
      SELECT COUNT(*)::int AS count 
      FROM users 
      WHERE id = ANY($1::int[])
      `,
      [userIds]
    );

    return (result.rows[0]?.count || 0) === userIds.length;
  }

  /*  ========== Blocked Users  ========== */
  // Blocking user
  async blockUser(blockerId, blockedId) {
    await pool.query(
      `
      INSERT INTO user_blocks (blocker_user_id, blocked_user_id)
      VALUES ($1, $2)
      ON CONFLICT (blocker_user_id, blocked_user_id) DO NOTHING
      `,
      [blockerId, blockedId]
    );
  }

  // Unblocking user
  async unblockUser(blockerId, blockedId) {
    const result = await pool.query(
      `
      DELETE FROM user_blocks
      WHERE blocker_user_id = $1 
        AND blocked_user_id = $2
      RETURNING id
      `,
      [blockerId, blockedId]
    );

    return result.rowCount > 0;
  }

  // Get list of blocked users for a given user
  async getBlockedUsers(userId) {
    const result = await pool.query(
      `
      SELECT u.id, u.username, u.email, ub.created_at
      FROM user_blocks ub
      JOIN users u ON u.id = ub.blocked_user_id
      WHERE ub.blocker_user_id = $1
      ORDER BY ub.created_at DESC
      `,
      [userId]
    );

    return result.rows;
  }

  /*  ========== Report Fake Accounts  ========== */
  // Reporting a user as fake (or updating existing report)
  async reportFake(reporterId, reportedId, reason) {
    const result = await pool.query(
      `
      INSERT INTO fake_account_reports (reporter_user_id, reported_user_id, reason)
      VALUES ($1, $2, $3)
      ON CONFLICT (reporter_user_id, reported_user_id) DO UPDATE
      SET reason = EXCLUDED.reason
      RETURNING id, created_at
      `,
      [reporterId, reportedId, reason]
    );

    return result.rows[0];
  }

  /*  ---------------- Moderation Status  ---------------- */
  // Get moderation status between two users
  async getModerationStatus(actorId, targetId) {
    const [reportResult, blockResult] = await Promise.all([
      pool.query(
        `
        SELECT 1 
        FROM fake_account_reports 
        WHERE reporter_user_id = $1 
          AND reported_user_id = $2 
        LIMIT 1`,
        [actorId, targetId]
      ),
      pool.query(
        `
        SELECT 1 
        FROM user_blocks 
        WHERE blocker_user_id = $1 
          AND blocked_user_id = $2 
        LIMIT 1`,
        [actorId, targetId]
      ),
    ]);
    
    return {
      reported_fake: reportResult.rowCount > 0,
      blocked: blockResult.rowCount > 0,
    };
  }
}

module.exports = new ModerationService();
