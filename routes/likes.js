const express = require("express");
const pool = require("../db");
const { createNotification } = require("./notificationsService");

const router = express.Router();

// GET /api/profile/likes — users who liked the current user
router.get("/profile/likes", async (req, res, next) => {
  try {
    const currentUserId = req.header("x-user-id");
    if (!currentUserId) {
      return res.status(400).json({ error: "x-user-id header requis" });
    }

    const result = await pool.query(
      `
      SELECT DISTINCT ON (u.id)
        u.id,
        u.username,
        u.email,
        l.created_at
      FROM likes l
      JOIN users u ON u.id = l.liker_user_id
      WHERE l.liked_user_id = $1
      ORDER BY u.id, l.created_at DESC
      `,
      [currentUserId],
    );

    return res.json({
      users: result.rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        created_at: row.created_at,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/profile/views — users who viewed the current user
router.get("/profile/views", async (req, res, next) => {
  try {
    const currentUserId = req.header("x-user-id");
    if (!currentUserId) {
      return res.status(400).json({ error: "x-user-id header requis" });
    }

    const result = await pool.query(
      `
      SELECT DISTINCT ON (u.id)
        u.id,
        u.username,
        u.email,
        v.created_at
      FROM profile_views v
      JOIN users u ON u.id = v.viewer_user_id
      WHERE v.viewed_user_id = $1
      ORDER BY u.id, v.created_at DESC
      `,
      [currentUserId],
    );

    return res.json({
      users: result.rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        created_at: row.created_at,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/users/:id/view — record that the current user viewed user :id
router.post("/users/:id/view", async (req, res, next) => {
  try {
    const viewer_user_id = req.header("x-user-id");
    const viewed_user_id = req.params.id;

    if (!viewer_user_id || !viewed_user_id) {
      return res.status(400).json({
        error: "viewer_user_id (header) et viewed_user_id (param) requis",
      });
    }

    if (String(viewer_user_id) === String(viewed_user_id)) {
      return res.status(400).json({ error: "Impossible to view myself" });
    }

    const result = await pool.query(
      `
      INSERT INTO profile_views (viewer_user_id, viewed_user_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING viewer_user_id, viewed_user_id, created_at
      `,
      [viewer_user_id, viewed_user_id],
    );

    if (result.rowCount > 0) {
      await createNotification({
        userId: viewed_user_id,
        actorUserId: viewer_user_id,
        type: "profile_view",
        message: "Your profile was viewed.",
        metadata: { viewer_user_id },
      });
    }

    return res.status(result.rowCount > 0 ? 201 : 200).json({
      message: result.rowCount > 0 ? "View recorded" : "View already recorded",
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/users/:id/like — check if current user likes user :id
router.get("/users/:id/like", async (req, res, next) => {
  try {
    const liker_user_id = req.header("x-user-id");
    const liked_user_id = req.params.id;
    if (!liker_user_id || !liked_user_id) {
      return res.status(400).json({
        error: "liker_user_id (header) et liked_user_id (param) requis",
      });
    }
    const sql = `SELECT 1 FROM likes WHERE liker_user_id = $1 AND liked_user_id = $2`;
    const result = await pool.query(sql, [liker_user_id, liked_user_id]);
    res.json({ liked: result.rowCount > 0 });
  } catch (error) {
    next(error);
  }
});

// GET /api/matches — recommandations of users (same city first, then popularity)
router.get("/matches", async (req, res, next) => {
  try {
    const userId = req.header("x-user-id");
    const { min_age, max_age, min_fame, max_fame, username } = req.query;
    const parsedLimit = Number(req.query.limit);
    const parsedOffset = Number(req.query.offset);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 20;
    const offset = Number.isFinite(parsedOffset)
      ? Math.max(parsedOffset, 0)
      : 0;

    function parseOptionalNumber(value) {
      if (value === undefined || value === null || value === "") {
        return null;
      }

      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        return null;
      }

      return parsed;
    }

    const minAge = parseOptionalNumber(min_age);
    const maxAge = parseOptionalNumber(max_age);
    const minFame = parseOptionalNumber(min_fame);
    const maxFame = parseOptionalNumber(max_fame);
    const usernameFilter =
      typeof username === "string" && username.trim().length > 0
        ? username.trim()
        : null;

    if (!userId) {
      return res.status(400).json({ error: "x-user-id header requis" });
    }

    // Retrieve likes to determine liked and is_match status
    const likesGivenRes = await pool.query(
      `SELECT liked_user_id FROM likes WHERE liker_user_id = $1`,
      [userId],
    );
    const likesReceivedRes = await pool.query(
      `SELECT liker_user_id FROM likes WHERE liked_user_id = $1`,
      [userId],
    );
    const likesGiven = new Set(
      likesGivenRes.rows.map((r) => String(r.liked_user_id)),
    );
    const likesReceived = new Set(
      likesReceivedRes.rows.map((r) => String(r.liker_user_id)),
    );

    const sql = `
      WITH me AS (
        SELECT city
        FROM profiles
        WHERE user_id = $1
      )
      SELECT
        u.id,
        u.username,
        u.email,
        p.city,
        p.neighborhood,
        p.fame_rating,
        p.birth_date,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT t.name), NULL),
          ARRAY[]::varchar[]
        ) AS tags
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN user_profile_tags upt ON upt.user_id = u.id
      LEFT JOIN tags t ON t.id = upt.tag_id
      LEFT JOIN me ON TRUE
      WHERE u.id <> $1
        AND (
          $2::int IS NULL
          OR (p.birth_date IS NOT NULL AND p.birth_date <= CURRENT_DATE - ($2::text || ' years')::interval)
        ) -- 至少 min_age
        AND (
          $3::int IS NULL
          OR (p.birth_date IS NOT NULL AND p.birth_date >= CURRENT_DATE - ($3::text || ' years')::interval)
        ) -- 至多 max_age
        AND (
          $4::numeric IS NULL OR p.fame_rating >= $4::numeric
        )
        AND (
          $5::numeric IS NULL OR p.fame_rating <= $5::numeric
        )
        AND (
          $6::text IS NULL OR u.username ILIKE ('%' || $6::text || '%')
        )
      GROUP BY u.id, u.username, u.email, p.city, p.neighborhood, p.fame_rating, p.birth_date, me.city
      ORDER BY
        (me.city IS NOT NULL AND p.city IS NOT NULL AND p.city = me.city) DESC,
        p.fame_rating DESC NULLS LAST,
        u.id ASC
      LIMIT $7::int
      OFFSET $8::int
    `;
    const result = await pool.query(sql, [
      userId,
      minAge,
      maxAge,
      minFame,
      maxFame,
      usernameFilter,
      limit,
      offset,
    ]);

    // Calculate age from birth_date
    function getAge(birthDate) {
      if (!birthDate) return null;
      const today = new Date();
      const dob = new Date(birthDate);
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age;
    }

    // Add liked, is_match, and age to each user
    const users = result.rows.map((u) => {
      const liked = likesGiven.has(String(u.id));
      const likedBack = likesReceived.has(String(u.id));
      return {
        ...u,
        liked,
        is_match: liked && likedBack,
        age: getAge(u.birth_date),
      };
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// POST /api/users/:id/like — current user likes user :id
router.post("/users/:id/like", async (req, res, next) => {
  try {
    const liker_user_id = req.header("x-user-id");
    const liked_user_id = req.params.id;
    if (!liker_user_id || !liked_user_id) {
      return res.status(400).json({
        error: "liker_user_id (header) et liked_user_id (param) requis",
      });
    }
    if (liker_user_id === liked_user_id) {
      return res.status(400).json({ error: "Impossible to like myse" });
    }

    const sql = `INSERT INTO likes (liker_user_id, liked_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *`;
    const result = await pool.query(sql, [liker_user_id, liked_user_id]);
    if (result.rowCount === 0) {
      return res.status(200).json({ message: "Déjà liké" });
    }

    await createNotification({
      userId: liked_user_id,
      actorUserId: liker_user_id,
      type: "like_received",
      message: "You received a like.",
      metadata: { liker_user_id },
    });

    const reciprocalLike = await pool.query(
      `SELECT 1 FROM likes WHERE liker_user_id = $1 AND liked_user_id = $2`,
      [liked_user_id, liker_user_id],
    );

    if (reciprocalLike.rowCount > 0) {
      await createNotification({
        userId: liked_user_id,
        actorUserId: liker_user_id,
        type: "match",
        message: "A user you liked liked you back.",
        metadata: { with_user_id: liker_user_id },
      });

      await createNotification({
        userId: liker_user_id,
        actorUserId: liked_user_id,
        type: "match",
        message: "A user you liked liked you back.",
        metadata: { with_user_id: liked_user_id },
      });
    }

    res.status(201).json({ message: "Like enregistré" });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id/like — current user unlikes user :id
router.delete("/users/:id/like", async (req, res, next) => {
  try {
    const liker_user_id = req.header("x-user-id");
    const liked_user_id = req.params.id;
    if (!liker_user_id || !liked_user_id) {
      return res.status(400).json({
        error: "liker_user_id (header) et liked_user_id (param) requis",
      });
    }
    if (liker_user_id === liked_user_id) {
      return res.status(400).json({ error: "Impossible to unlike myself" });
    }

    const wasMatch = await pool.query(
      `SELECT 1 FROM likes WHERE liker_user_id = $1 AND liked_user_id = $2`,
      [liked_user_id, liker_user_id],
    );

    const sql = `DELETE FROM likes WHERE liker_user_id = $1 AND liked_user_id = $2`;
    const result = await pool.query(sql, [liker_user_id, liked_user_id]);
    if (result.rowCount === 0) {
      return res
        .status(200)
        .json({ message: "Like déjà retiré ou inexistant" });
    }

    if (wasMatch.rowCount > 0) {
      await createNotification({
        userId: liked_user_id,
        actorUserId: liker_user_id,
        type: "unlike",
        message: "A connected user unliked you.",
        metadata: { unliked_by_user_id: liker_user_id },
      });
    }

    res.status(200).json({ message: "Like retiré" });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id/is-match — check if current user and user :id are a match
router.get("/users/:id/is-match", async (req, res, next) => {
  try {
    const userA = req.header("x-user-id");
    const userB = req.params.id;
    if (!userA || !userB) {
      return res
        .status(400)
        .json({ error: "user_id (header) et id (param) requis" });
    }
    if (userA === userB) {
      return res
        .status(400)
        .json({ error: "Impossible de matcher avec soi-même" });
    }
    const sql = `SELECT EXISTS (
			SELECT 1 FROM likes l1
			JOIN likes l2 ON l1.liker_user_id = l2.liked_user_id AND l1.liked_user_id = l2.liker_user_id
			WHERE l1.liker_user_id = $1 AND l1.liked_user_id = $2
		) AS is_match`;
    const result = await pool.query(sql, [userA, userB]);
    res.json({ is_match: result.rows[0].is_match });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
