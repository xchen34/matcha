const bcrypt = require("bcrypt");
const pool = require("../../db");
const { createRealtimeToken } = require("./shared");
const { isProfileCompleted } = require("../../routes/authHelpers");

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const identifier = typeof username === "string" ? username.trim() : "";
    const rawPassword = typeof password === "string" ? password : "";
    const normalizedPassword = rawPassword.trim();

    if (!identifier || !rawPassword) {
      return res.status(400).json({ error: "username and password are required" });
    }

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.email,
        u.username,
        u.first_name,
        u.last_name,
        u.password_hash,
        u.email_verified,
        u.created_at,
        p.gender,
        p.birth_date,
        p.city
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1)
      LIMIT 1
      `,
      [identifier],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = result.rows[0];
    let isPasswordValid = await bcrypt.compare(rawPassword, user.password_hash);
    if (!isPasswordValid && normalizedPassword !== rawPassword) {
      isPasswordValid = await bcrypt.compare(normalizedPassword, user.password_hash);
    }
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        error: "Email not verified. Please check your email and click the verification link to complete registration.",
        requires_email_verification: true,
        email: user.email,
      });
    }

    await pool.query(
      `
      UPDATE users
      SET last_seen_at = NOW()
      WHERE id = $1
      `,
      [user.id],
    );

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email_verified: user.email_verified,
        profile_completed: isProfileCompleted(user),
        created_at: user.created_at,
        realtime_token: createRealtimeToken(user.id),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { login };