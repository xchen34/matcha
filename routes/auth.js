const express = require("express");
const bcrypt = require("bcrypt"); // bcrypt 是一个流行的密码哈希库，提供了安全的哈希算法和自动加盐功能，适合用于存储用户密码。相比于简单的哈希函数（如 SHA-256），bcrypt 设计上更慢，可以有效抵抗暴力破解攻击。
const pool = require("../db");
const { createRealtimeToken } = require("../realtime/authToken");

const router = express.Router(); //router 是一个独立的 Express 应用实例，可以定义自己的路由和中间件。最后通过 module.exports 导出，供 app.js 挂载使用。

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); // 简单的邮箱格式验证，确保包含一个 @ 和一个 .，且没有空格。实际项目中可以使用更复杂的验证库，如 validator.js。
} //[^\s@]+：匹配一个或多个非空格和非 @ 字符，确保用户名部分不包含空格和 @。
// @：匹配 @ 字符，分隔用户名和域名。
// [^\s@]+：匹配一个或多个非空格和非 @ 字符，确保域名部分不包含空格和 @。
// \.：匹配 . 字符，分隔域名和顶级域名。
// [^\s@]+：匹配一个或多个非空格和非 @ 字符，确保顶级域名部分不包含空格和 @。

function parseBirthDate(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const date = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isAtLeast18YearsOld(birthDate) {
  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - birthDate.getUTCMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }
  return age >= 18;
}

router.post("/auth/register", async (req, res, next) => {
  try {
    const { email, username, birth_date, password } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim() : "";
    const normalizedUsername =
      typeof username === "string" ? username.trim() : "";

    if (!normalizedEmail || !normalizedUsername || !birth_date || !password) {
      return res.status(400).json({
        error: "email, username, birth_date and password are required",
      });
    }

    const parsedBirthDate = parseBirthDate(birth_date);
    if (!parsedBirthDate) {
      return res
        .status(400)
        .json({ error: "birth_date must be a valid date (YYYY-MM-DD)" });
    }

    if (!isAtLeast18YearsOld(parsedBirthDate)) {
      return res
        .status(400)
        .json({ error: "You must be at least 18 years old to register" });
    }

    // Load common passwords from file and check if the provided password is too common
    const fs = require("fs"); // 这是 Node.js 的内置文件系统模块，用于读取 common_passwords.txt 文件，获取常见密码列表。
    const path = require("path");
    const commonPasswordsPath = path.join(
      __dirname,
      "..",
      "common_passwords.txt",
    );
    let commonPasswords = []; // commonPasswords 是一个数组，存储从 common_passwords.txt 文件中读取的常见密码列表。注册时会检查用户提供的密码是否在这个列表中，如果是，则拒绝注册并提示用户选择更强的密码。
    try {
      const fileContent = fs.readFileSync(commonPasswordsPath, "utf-8"); // 读取 common_passwords.txt 文件内容，得到一个包含所有常见密码的字符串。utf-8 参数确保正确解析文本文件。
      commonPasswords = fileContent
        .split(/\r?\n/) // 按行分割文件内容，得到一个密码数组。正则 /\r?\n/ 兼容 Windows (\r\n) 和 Unix (\n) 的换行符。? 表示 \r 是可选的，适应不同系统的换行格式。
        .map((w) => w.trim()) // 去除每个密码的前后空白字符，得到干净的密码列表。trim() 方法移除字符串两端的空格、制表符等空白字符，确保比较时不受额外空格影响。
        .filter(Boolean); // 过滤掉空字符串，得到最终的常见密码数组。filter(Boolean) 会移除数组中的所有 falsy 值（如空字符串、null、undefined、0 等），确保 commonPasswords 数组只包含有效的密码字符串。
    } catch (e) {
      commonPasswords = []; //
    }
    if (commonPasswords.includes(password.toLowerCase())) {
      return res.status(400).json({
        error: "Password is too common. Please choose a stronger password.",
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const passwordHash = await bcrypt.hash(password, 10); // bcrypt.hash() 方法用于将用户提供的密码进行哈希处理，生成一个安全的密码哈希值。第一个参数是要哈希的密码字符串，第二个参数是 saltRounds，表示哈希算法的复杂度（迭代次数）。较高的 saltRounds 会增加哈希计算的时间，从而提高安全性，但也会增加服务器负载。通常建议使用 10 或更高的值。

    // Création de l'utilisateur
    const sql = `
      INSERT INTO users (email, username, first_name, last_name, password_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, username, first_name, last_name, email_verified, created_at
    `;
    const values = [normalizedEmail, normalizedUsername, "", "", passwordHash];
    const result = await pool.query(sql, values);

    // Ajout du profil avec uniquement birth_date
    const userId = result.rows[0].id;
    await pool.query(
      `INSERT INTO profiles (user_id, birth_date)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET birth_date = EXCLUDED.birth_date`,
      [userId, birth_date],
    );

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
        created_at: user.created_at,
        realtime_token: createRealtimeToken(user.id),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/auth/realtime-token", async (req, res, next) => {
  try {
    const rawUserId = req.header("x-user-id");
    const userId = Number(rawUserId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "x-user-id header is required" });
    }

    const result = await pool.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      realtime_token: createRealtimeToken(userId),
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
