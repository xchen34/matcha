const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/auth/register", async (req, res, next) => {
  try {
    const { email, username, first_name, last_name, password } = req.body;

    if (!email || !username || !first_name || !last_name || !password) {
      return res.status(400).json({
        error:
          "email, username, first_name, last_name and password are required",
      });
    }

    // Load common passwords from file and check if the provided password is too common
    const fs = require("fs");
    const path = require("path");
    const commonPasswordsPath = path.join(
      __dirname,
      "..",
      "common_passwords.txt",
    );
    let commonPasswords = [];
    try {
      const fileContent = fs.readFileSync(commonPasswordsPath, "utf-8");
      commonPasswords = fileContent
        .split(/\r?\n/)
        .map((w) => w.trim())
        .filter(Boolean);
    } catch (e) {
      commonPasswords = [];
    }
    if (commonPasswords.includes(password.toLowerCase())) {
      return res
        .status(400)
        .json({
          error: "Password is too common. Please choose a stronger password.",
        });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (email, username, first_name, last_name, password_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, username, first_name, last_name, email_verified, created_at
    `;

    const values = [email, username, first_name, last_name, passwordHash];
    const result = await pool.query(sql, values);

    return res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      if (error.constraint === "users_email_key") {
        return res.status(409).json({ error: "Email already exists" });
      }

      if (error.constraint === "users_username_key") {
        return res.status(409).json({ error: "Username already exists" });
      }

      return res
        .status(409)
        .json({ error: "Email or username already exists" });
    }

    return next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "username and password are required" });
    }

    const sql = `
      SELECT id, email, username, first_name, last_name, password_hash, email_verified, created_at
      FROM users
      WHERE username = $1
      LIMIT 1
    `;

    const result = await pool.query(sql, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email_verified: user.email_verified,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
