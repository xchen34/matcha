const express = require("express");
const pool = require("../db");

const router = express.Router();
const allowedGenders = ["male", "female", "non_binary", "other"];
const allowedPreferences = ["male", "female", "both", "other"];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseUserIdFromRequest(req) {
  const rawUserId = req.header("x-user-id");
  console.log("x-user-id reçu:", rawUserId);

  if (!rawUserId) {
    return null;
  }

  const parsed = Number(rawUserId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function resolveCurrentUserId(req) {
  const requestedUserId = parseUserIdFromRequest(req);

  if (!requestedUserId) {
    return null;
  }

  const userResult = await pool.query("SELECT id FROM users WHERE id = $1", [
    requestedUserId,
  ]);

  if (userResult.rows.length === 0) {
    return null;
  }

  return userResult.rows[0].id;
}

router.get("/profile/me", async (req, res, next) => {
  try {
    const currentUserId = await resolveCurrentUserId(req);

    if (!currentUserId) {
      return res.status(401).json({
        error: "Not authenticated. Please login and provide x-user-id.",
      });
    }

    const sql = `
      SELECT
        u.id AS user_id,
        u.email,
        u.username,
        u.first_name,
        u.last_name,
        u.email_verified,
        u.created_at,
        p.gender,
        p.sexual_preference,
        p.biography,
        p.birth_date,
        p.city,
        p.latitude,
        p.longitude,
        p.fame_rating
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `;

    const result = await pool.query(sql, [currentUserId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = result.rows[0];

    return res.json({
      user: {
        id: row.user_id,
        email: row.email,
        username: row.username,
        first_name: row.first_name,
        last_name: row.last_name,
        email_verified: row.email_verified,
        created_at: row.created_at,
      },
      profile: {
        gender: row.gender || "",
        sexual_preference: row.sexual_preference || "",
        biography: row.biography || "",
        birth_date: row.birth_date,
        city: row.city || "",
        latitude: row.latitude,
        longitude: row.longitude,
        fame_rating: row.fame_rating ?? 0,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/profile/me", async (req, res, next) => {
  try {
    const currentUserId = await resolveCurrentUserId(req);

    if (!currentUserId) {
      return res.status(401).json({
        error: "Not authenticated. Please login and provide x-user-id.",
      });
    }

    const { biography, gender, sexual_preference, city } = req.body;

    if (!isNonEmptyString(biography)) {
      return res.status(400).json({ error: "biography is required" });
    }

    if (!isNonEmptyString(city)) {
      return res.status(400).json({ error: "city is required" });
    }

    if (!isNonEmptyString(gender) || !allowedGenders.includes(gender)) {
      return res.status(400).json({
        error: "gender is invalid",
        allowed_values: allowedGenders,
      });
    }

    if (
      !isNonEmptyString(sexual_preference) ||
      !allowedPreferences.includes(sexual_preference)
    ) {
      return res.status(400).json({
        error: "sexual_preference is invalid",
        allowed_values: allowedPreferences,
      });
    }

    const updateSql = `
      INSERT INTO profiles (
        user_id,
        gender,
        sexual_preference,
        biography,
        birth_date,
        city,
        fame_rating
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        COALESCE(
          (SELECT birth_date FROM profiles WHERE user_id = $1),
          (CURRENT_DATE - INTERVAL '18 years')::date
        ),
        $5,
        COALESCE((SELECT fame_rating FROM profiles WHERE user_id = $1), 0)
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        biography = EXCLUDED.biography,
        gender = EXCLUDED.gender,
        sexual_preference = EXCLUDED.sexual_preference,
        city = EXCLUDED.city
      RETURNING
        user_id,
        biography,
        gender,
        sexual_preference,
        city,
        birth_date,
        latitude,
        longitude,
        fame_rating
    `;

    const updateValues = [
      currentUserId,
      gender,
      sexual_preference,
      biography.trim(),
      city.trim(),
    ];

    const updated = await pool.query(updateSql, updateValues);

    const userSql = `
      SELECT id, email, username, first_name, last_name, email_verified, created_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `;

    const userResult = await pool.query(userSql, [currentUserId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];
    const profile = updated.rows[0];

    return res.json({
      message: "Profile updated successfully",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email_verified: user.email_verified,
        created_at: user.created_at,
      },
      profile: {
        gender: profile.gender,
        sexual_preference: profile.sexual_preference,
        biography: profile.biography,
        birth_date: profile.birth_date,
        city: profile.city,
        latitude: profile.latitude,
        longitude: profile.longitude,
        fame_rating: profile.fame_rating,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
