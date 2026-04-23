const express = require("express");
const pool = require("../db");
const { getIO, REALTIME_EVENTS } = require("../realtime");

const router = express.Router();

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

async function usersExist(userIds) {
  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM users
    WHERE id = ANY($1::int[])
    `,
    [userIds],
  );
  return (result.rows[0]?.count || 0) === userIds.length;
}

router.get("/moderation/blocked-users", async (req, res, next) => {
  try {
    const currentUserId = parsePositiveInt(req.header("x-user-id"));
    if (!currentUserId) {
      return res.status(400).json({
        error: "x-user-id header is required",
      });
    }

    const result = await pool.query(
      `
      SELECT u.id, u.username, u.email, ub.created_at
      FROM user_blocks ub
      JOIN users u ON u.id = ub.blocked_user_id
      WHERE ub.blocker_user_id = $1
      ORDER BY ub.created_at DESC
      `,
      [currentUserId],
    );

    return res.json({
      users: result.rows,
    });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res.json({ users: [] });
    }
    return next(error);
  }
});

router.get("/users/:id/moderation-status", async (req, res, next) => {
  try {
    const actorUserId = parsePositiveInt(req.header("x-user-id"));
    const targetUserId = parsePositiveInt(req.params.id);

    if (!actorUserId || !targetUserId) {
      return res.status(400).json({
        error: "x-user-id header and user id param are required",
      });
    }

    const [reportResult, blockResult] = await Promise.all([
      pool.query(
        `
        SELECT 1
        FROM fake_account_reports
        WHERE reporter_user_id = $1
          AND reported_user_id = $2
        LIMIT 1
        `,
        [actorUserId, targetUserId],
      ),
      pool.query(
        `
        SELECT 1
        FROM user_blocks
        WHERE blocker_user_id = $1
          AND blocked_user_id = $2
        LIMIT 1
        `,
        [actorUserId, targetUserId],
      ),
    ]);

    return res.json({
      reported_fake: reportResult.rowCount > 0,
      blocked: blockResult.rowCount > 0,
    });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res.json({ reported_fake: false, blocked: false });
    }
    return next(error);
  }
});

router.post("/users/:id/report-fake", async (req, res, next) => {
  try {
    const reporterUserId = parsePositiveInt(req.header("x-user-id"));
    const reportedUserId = parsePositiveInt(req.params.id);

    if (!reporterUserId || !reportedUserId) {
      return res.status(400).json({
        error: "x-user-id header and user id param are required",
      });
    }

    if (reporterUserId === reportedUserId) {
      return res.status(400).json({ error: "You cannot report yourself" });
    }

    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (reason.length < 5) {
      return res.status(400).json({
        error: "Please provide a reason (minimum 5 characters)",
      });
    }

    const exists = await usersExist([reporterUserId, reportedUserId]);
    if (!exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const result = await pool.query(
      `
      INSERT INTO fake_account_reports (reporter_user_id, reported_user_id, reason)
      VALUES ($1, $2, $3)
      ON CONFLICT (reporter_user_id, reported_user_id) DO UPDATE
      SET reason = EXCLUDED.reason
      RETURNING id, created_at
      `,
      [reporterUserId, reportedUserId, reason.slice(0, 500)],
    );

    return res.status(200).json({
      message: "The user has been reported successfully. Under review.",
      report: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/users/:id/block", async (req, res, next) => {
  try {
    const blockerUserId = parsePositiveInt(req.header("x-user-id"));
    const blockedUserId = parsePositiveInt(req.params.id);

    if (!blockerUserId || !blockedUserId) {
      return res.status(400).json({
        error: "x-user-id header and user id param are required",
      });
    }

    if (blockerUserId === blockedUserId) {
      return res.status(400).json({ error: "You cannot block yourself" });
    }

    const exists = await usersExist([blockerUserId, blockedUserId]);
    if (!exists) {
      return res.status(404).json({ error: "User not found" });
    }

    await pool.query(
      `
      INSERT INTO user_blocks (blocker_user_id, blocked_user_id)
      VALUES ($1, $2)
      ON CONFLICT (blocker_user_id, blocked_user_id) DO NOTHING
      `,
      [blockerUserId, blockedUserId],
    );

    const io = getIO();
    if (io) {
      const payload = {
        user_a_id: blockerUserId,
        user_b_id: blockedUserId,
        blocked_by_user_id: blockerUserId,
        blocked_user_id: blockedUserId,
        is_blocked: true,
      };
      io.to(`user:${blockerUserId}`).emit(
        REALTIME_EVENTS.CHAT_BLOCK_STATUS_CHANGED,
        payload,
      );
      io.to(`user:${blockedUserId}`).emit(
        REALTIME_EVENTS.CHAT_BLOCK_STATUS_CHANGED,
        payload,
      );
    }

    return res.status(200).json({
      message: "User blocked successfully",
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/users/:id/block", async (req, res, next) => {
  try {
    const blockerUserId = parsePositiveInt(req.header("x-user-id"));
    const blockedUserId = parsePositiveInt(req.params.id);

    if (!blockerUserId || !blockedUserId) {
      return res.status(400).json({
        error: "x-user-id header and user id param are required",
      });
    }

    const result = await pool.query(
      `
      DELETE FROM user_blocks
      WHERE blocker_user_id = $1
        AND blocked_user_id = $2
      RETURNING id
      `,
      [blockerUserId, blockedUserId],
    );

    if (result.rowCount === 0) {
      return res.status(200).json({ message: "User was not blocked" });
    }

    const io = getIO();
    if (io) {
      const payload = {
        user_a_id: blockerUserId,
        user_b_id: blockedUserId,
        blocked_by_user_id: blockerUserId,
        blocked_user_id: blockedUserId,
        is_blocked: false,
      };
      io.to(`user:${blockerUserId}`).emit(
        REALTIME_EVENTS.CHAT_BLOCK_STATUS_CHANGED,
        payload,
      );
      io.to(`user:${blockedUserId}`).emit(
        REALTIME_EVENTS.CHAT_BLOCK_STATUS_CHANGED,
        payload,
      );
    }

    return res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
