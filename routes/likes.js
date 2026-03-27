const express = require("express");
const pool = require("../db");

const router = express.Router();

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
    const { min_age, max_age, min_fame, max_fame } = req.query;
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

    if (!userId) {
      return res.status(400).json({ error: "x-user-id header requis" });
    }

    const cityResult = await pool.query(
      `SELECT city FROM profiles WHERE user_id = $1`,
      [userId],
    );
    const myCity = cityResult.rows[0]?.city || null;

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
        p.fame_rating,
        p.birth_date
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      CROSS JOIN me
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
      ORDER BY
        (p.city IS NOT NULL AND p.city = me.city) DESC,
        p.fame_rating DESC NULLS LAST,
        u.id ASC
      LIMIT $6::int
      OFFSET $7::int
    `;
    const result = await pool.query(sql, [
      userId,
      minAge,
      maxAge,
      minFame,
      maxFame,
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

    const sql = `DELETE FROM likes WHERE liker_user_id = $1 AND liked_user_id = $2`;
    const result = await pool.query(sql, [liker_user_id, liked_user_id]);
    if (result.rowCount === 0) {
      return res
        .status(200)
        .json({ message: "Like déjà retiré ou inexistant" });
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
