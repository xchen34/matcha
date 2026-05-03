const bcrypt = require("bcrypt");
const pool = require("../../db");

async function deleteAccount(req, res, next) {
  try {
    const currentUserId = Number(req.header("x-user-id"));
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const rawPassword = typeof req.body?.password === "string" ? req.body.password : "";
    const normalizedPassword = rawPassword.trim();

    if ((!Number.isInteger(currentUserId) || currentUserId <= 0) && !rawEmail) {
      return res.status(400).json({ error: "x-user-id header or email is required" });
    }
    if (!rawPassword) {
      return res.status(400).json({ error: "password is required" });
    }

    const result = await pool.query(
      `
      SELECT id, password_hash, email
      FROM users
      WHERE ($1::bigint IS NOT NULL AND id = $1)
         OR ($2 <> '' AND LOWER(email) = LOWER($2))
      ORDER BY CASE WHEN $1::bigint IS NOT NULL AND id = $1 THEN 0 ELSE 1 END
      LIMIT 1
      `,
      [Number.isInteger(currentUserId) && currentUserId > 0 ? currentUserId : null, rawEmail],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    let isPasswordValid = await bcrypt.compare(rawPassword, user.password_hash);
    if (!isPasswordValid && normalizedPassword !== rawPassword) {
      isPasswordValid = await bcrypt.compare(normalizedPassword, user.password_hash);
    }
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    await pool.query(`DELETE FROM users WHERE id = $1`, [user.id]);
    return res.json({ message: "Account deleted successfully" });
  } catch (error) {
    return next(error);
  }
}

module.exports = { deleteAccount };