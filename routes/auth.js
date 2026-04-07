const express = require("express");
const bcrypt = require("bcrypt"); // bcrypt 是一个流行的密码哈希库，提供了安全的哈希算法和自动加盐功能，适合用于存储用户密码。相比于简单的哈希函数（如 SHA-256），bcrypt 设计上更慢，可以有效抵抗暴力破解攻击。
const pool = require("../db");

const router = express.Router(); //router 是一个独立的 Express 应用实例，可以定义自己的路由和中间件。最后通过 module.exports 导出，供 app.js 挂载使用。

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); // 简单的邮箱格式验证，确保包含一个 @ 和一个 .，且没有空格。实际项目中可以使用更复杂的验证库，如 validator.js。
} //[^\s@]+：匹配一个或多个非空格和非 @ 字符，确保用户名部分不包含空格和 @。
// @：匹配 @ 字符，分隔用户名和域名。
// [^\s@]+：匹配一个或多个非空格和非 @ 字符，确保域名部分不包含空格和 @。
// \.：匹配 . 字符，分隔域名和顶级域名。
// [^\s@]+：匹配一个或多个非空格和非 @ 字符，确保顶级域名部分不包含空格和 @。

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

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const passwordHash = await bcrypt.hash(password, 10); // bcrypt.hash() 方法用于将用户提供的密码进行哈希处理，生成一个安全的密码哈希值。第一个参数是要哈希的密码字符串，第二个参数是 saltRounds，表示哈希算法的复杂度（迭代次数）。较高的 saltRounds 会增加哈希计算的时间，从而提高安全性，但也会增加服务器负载。通常建议使用 10 或更高的值。

    const sql = `
      INSERT INTO users (email, username, first_name, last_name, password_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, username, first_name, last_name, email_verified, created_at
    `; // SQL 插入语句，使用参数化查询（$1、$2 等）来防止 SQL 注入攻击。RETURNING 子句允许在插入后立即返回新创建的用户记录，方便后续处理和响应。 $1 对应 email，$2 对应 username，依此类推。参数化查询确保用户输入被正确转义，避免恶意输入导致的 SQL 注入漏洞。

    /**
     * sql 里只包含占位符 $1…$5，没有真实值；values 数组就是把具体数据传给驱动做“参数绑定”。执行时，pool.query(sql, values) 会：

保留 sql 字符串的结构（表名、列名、占位符）。
把 values 按顺序绑定到 $1…$5，生成一条安全的参数化查询并发送给数据库。
驱动负责类型转换、转义，避免把用户输入当成 SQL 语句片段执行，从而防止注入。
如果不传 values，占位符里就没有实际数据，查询无法执行。
     */
    const values = [email, username, first_name, last_name, passwordHash]; // values 数组包含了 SQL 查询中对应参数的位置的实际值。这个数组会被传递给 pool.query() 方法，与 SQL 语句中的 $1、$2 等占位符一一对应，确保查询的安全性和正确性。]
    const result = await pool.query(sql, values); // 执行 SQL 查询，将用户数据插入数据库。pool.query() 方法接受 SQL 语句和参数数组，返回一个 Promise，解析后包含查询结果。这里使用 await 等待查询完成，并将结果存储在 result 变量中。result.rows[0] 将包含新创建的用户记录。values参数是一个数组，包含了 SQL 查询中对应参数的位置的实际值。这个数组会被传递给 pool.query() 方法，与 SQL 语句中的 $1、$2 等占位符一一对应，确保查询的安全性和正确性。

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
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
