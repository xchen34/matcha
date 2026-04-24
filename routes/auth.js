const express = require("express");
const bcrypt = require("bcrypt"); // bcrypt 是一个流行的密码哈希库，提供了安全的哈希算法和自动加盐功能，适合用于存储用户密码。相比于简单的哈希函数（如 SHA-256），bcrypt 设计上更慢，可以有效抵抗暴力破解攻击。
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { createRealtimeToken } = require("../realtime/authToken");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/emailService");
const {
  authLimiter,
  authSensitiveLimiter,
} = require("../middleware/rateLimit");

const router = express.Router(); //router 是一个独立的 Express 应用实例，可以定义自己的路由和中间件。最后通过 module.exports 导出，供 app.js 挂载使用。
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,20}$/;

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

function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function isProfileCompleted(user) {
  const hasUsername = typeof user?.username === "string" && user.username.trim().length > 0;
  const hasFirstName = typeof user?.first_name === "string" && user.first_name.trim().length > 0;
  const hasLastName = typeof user?.last_name === "string" && user.last_name.trim().length > 0;
  const hasEmail = typeof user?.email === "string" && user.email.trim().length > 0;
  const hasGender = typeof user?.gender === "string" && user.gender.trim().length > 0;
  const hasBirthDate = Boolean(user?.birth_date);
  const hasCity = typeof user?.city === "string" && user.city.trim().length > 0;

  return (
    hasUsername &&
    hasFirstName &&
    hasLastName &&
    hasEmail &&
    hasGender &&
    hasBirthDate &&
    hasCity
  );
}

let pendingEmailColumnReady = false;

async function ensurePendingEmailColumn() {
  if (pendingEmailColumnReady) return;

  await pool.query(
    `
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255)
    `,
  );

  await pool.query(
    `
    CREATE INDEX IF NOT EXISTS idx_users_pending_email ON users(pending_email)
    `,
  );

  pendingEmailColumnReady = true;
}

function getCommonPasswords() {
  const commonPasswordsPath = path.join(__dirname, "..", "common_passwords.txt");
  try {
    const fileContent = fs.readFileSync(commonPasswordsPath, "utf-8");
    return fileContent
      .split(/\r?\n/)
      .map((w) => w.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function validatePasswordStrength(password, commonPasswords) {
  const value = typeof password === "string" ? password : "";

  if (value.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    };
  }

  // bcrypt only uses first 72 bytes; enforce an upper bound to avoid confusion.
  if (value.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters long.`,
    };
  }

  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);

  if (!hasLower || !hasUpper || !hasDigit) {
    return {
      valid: false,
      error:
        "Password must include at least one uppercase letter, one lowercase letter, and one number.",
    };
  }

  if (commonPasswords.includes(value.toLowerCase())) {
    return {
      valid: false,
      error: "Password is too common. Please choose a stronger password.",
    };
  }

  return { valid: true };
}

router.post("/auth/register", authLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { email, username, first_name, last_name, birth_date, password } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim() : "";
    const normalizedUsername =
      typeof username === "string" ? username.trim() : "";
    const normalizedFirstName =
      typeof first_name === "string" ? first_name.trim() : "";
    const normalizedLastName =
      typeof last_name === "string" ? last_name.trim() : "";
    const normalizedPassword =
      typeof password === "string" ? password.trim() : "";

    if (
      !normalizedEmail ||
      !normalizedUsername ||
      !normalizedFirstName ||
      !normalizedLastName ||
      !birth_date ||
      !normalizedPassword
    ) {
      return res.status(400).json({
        error:
          "email, username, first_name, last_name, birth_date and password are required",
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

    const commonPasswords = getCommonPasswords();
    const passwordValidation = validatePasswordStrength(
      normalizedPassword,
      commonPasswords,
    );
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      return res.status(400).json({
        error:
          "username is invalid (use 3-20 characters: letters, numbers, dot, underscore, hyphen)",
      });
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 10); // bcrypt.hash() 方法用于将用户提供的密码进行哈希处理，生成一个安全的密码哈希值。第一个参数是要哈希的密码字符串，第二个参数是 saltRounds，表示哈希算法的复杂度（迭代次数）。较高的 saltRounds 会增加哈希计算的时间，从而提高安全性，但也会增加服务器负载。通常建议使用 10 或更高的值。

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await client.query("BEGIN");

    // Création de l'utilisateur
    const sql = `
      INSERT INTO users (email, username, first_name, last_name, password_hash, email_verification_token, email_verification_token_expiry)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, username, first_name, last_name, email_verified, created_at
    `;
    const values = [
      normalizedEmail,
      normalizedUsername,
      normalizedFirstName,
      normalizedLastName,
      passwordHash,
      verificationToken,
      tokenExpiry,
    ];
    const result = await client.query(sql, values);

    // Ajout du profil avec uniquement birth_date
    const userId = result.rows[0].id;
    await client.query(
      `INSERT INTO profiles (user_id, birth_date)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET birth_date = EXCLUDED.birth_date`,
      [userId, birth_date],
    );

    await client.query("COMMIT");

    // Send verification email
    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
    let emailDelivery = { sent: false, reason: "unknown" };
    try {
      const emailResult = await sendVerificationEmail(
        normalizedEmail,
        verificationToken,
        frontendBaseUrl,
      );
      emailDelivery = {
        sent: true,
        message_id: emailResult.messageId,
        preview_url: emailResult.previewUrl || null,
      };
    } catch (emailError) {
      console.error("Warning: Could not send verification email:", emailError);
      emailDelivery = {
        sent: false,
        reason: emailError.message,
      };
    }

    return res.status(201).json({
      message:
        "User registered successfully. Please check your email to verify your account.",
      user: result.rows[0],
      profile_completed: false,
      email_delivery: emailDelivery,
      next_step: "verify_email",
      dev_verify_url:
        process.env.NODE_ENV === "production"
          ? null
          : `${frontendBaseUrl}/verify-email?token=${verificationToken}`,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Register rollback failed:", rollbackError);
    }

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
  } finally {
    client.release();
  }
});

router.post("/auth/login", authSensitiveLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const identifier = typeof username === "string" ? username.trim() : "";
    const rawPassword = typeof password === "string" ? password : "";
    const normalizedPassword = rawPassword.trim();

    if (!identifier || !rawPassword) {
      return res
        .status(400)
        .json({ error: "username and password are required" });
    }

    const sql = `
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
    `;

    const result = await pool.query(sql, [identifier]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = result.rows[0];
    let isPasswordValid = await bcrypt.compare(rawPassword, user.password_hash);
    if (!isPasswordValid && normalizedPassword !== rawPassword) {
      // Backward-compatible fallback for users who accidentally typed leading/trailing spaces.
      isPasswordValid = await bcrypt.compare(normalizedPassword, user.password_hash);
    }

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Check if email is verified
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

router.post("/auth/verify-email", authLimiter, async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Verification token is required" });
    }

    // Find user with this token and check expiry
    const result = await pool.query(
      `
      SELECT id, email, email_verified, pending_email
      FROM users
      WHERE email_verification_token = $1
      AND email_verification_token_expiry > NOW()
      LIMIT 1
      `,
      [token],
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ 
        error: "Invalid or expired verification token" 
      });
    }

    const user = result.rows[0];

    if (typeof user.pending_email === "string" && user.pending_email.trim().length > 0) {
      const nextEmail = user.pending_email.trim();

      await pool.query(
        `
        UPDATE users
        SET email = $1,
            pending_email = NULL,
            email_verified = TRUE,
            email_verification_token = NULL,
            email_verification_token_expiry = NULL
        WHERE id = $2
        `,
        [nextEmail, user.id],
      );

      return res.json({
        message: "Email changed and verified successfully.",
        email: nextEmail,
        user_id: user.id,
        redirect_to: "/profile",
      });
    }

    if (user.email_verified) {
      return res.status(400).json({ 
        error: "Email is already verified" 
      });
    }

    // Mark email as verified and clear token
    await pool.query(
      `
      UPDATE users
      SET email_verified = TRUE,
          email_verification_token = NULL,
          email_verification_token_expiry = NULL
      WHERE id = $1
      `,
      [user.id],
    );

    return res.json({
      message: "Email verified successfully. You can now log in.",
      email: user.email,
      user_id: user.id,
      redirect_to: "/login",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/auth/request-email-change", authSensitiveLimiter, async (req, res, next) => {
  try {
    await ensurePendingEmailColumn();

    const userId = Number(req.header("x-user-id"));
    const newEmail = typeof req.body?.new_email === "string" ? req.body.new_email.trim() : "";
    const rawPassword = typeof req.body?.password === "string" ? req.body.password : "";
    const normalizedPassword = rawPassword.trim();

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "x-user-id header is required" });
    }

    if (!newEmail || !rawPassword) {
      return res.status(400).json({ error: "new_email and password are required" });
    }

    if (!isValidEmail(newEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const userResult = await pool.query(
      `
      SELECT id, email, email_verified, password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId],
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];
    if (!user.email_verified) {
      return res.status(403).json({
        error: "Current email must be verified before changing email",
      });
    }

    let isPasswordValid = await bcrypt.compare(rawPassword, user.password_hash);
    if (!isPasswordValid && normalizedPassword !== rawPassword) {
      isPasswordValid = await bcrypt.compare(normalizedPassword, user.password_hash);
    }
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    if (String(user.email || "").toLowerCase() === newEmail.toLowerCase()) {
      return res.status(400).json({ error: "New email must be different from current email" });
    }

    const conflictResult = await pool.query(
      `
      SELECT id
      FROM users
      WHERE (LOWER(email) = LOWER($1) OR LOWER(COALESCE(pending_email, '')) = LOWER($1))
        AND id <> $2
      LIMIT 1
      `,
      [newEmail, userId],
    );
    if (conflictResult.rowCount > 0) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `
      UPDATE users
      SET pending_email = $1,
          email_verification_token = $2,
          email_verification_token_expiry = $3
      WHERE id = $4
      `,
      [newEmail, verificationToken, tokenExpiry, userId],
    );

    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || "http://localhost:5173";
    let emailDelivery = { sent: false, reason: "unknown" };
    try {
      const emailResult = await sendVerificationEmail(
        newEmail,
        verificationToken,
        frontendBaseUrl,
      );
      emailDelivery = {
        sent: true,
        message_id: emailResult.messageId,
        preview_url: emailResult.previewUrl || null,
      };
    } catch (emailError) {
      emailDelivery = {
        sent: false,
        reason: emailError.message,
      };
    }

    return res.json({
      message:
        "Verification email sent to your new address. Please verify the new email before it replaces your current email.",
      pending_email: newEmail,
      email_delivery: emailDelivery,
      dev_verify_url:
        process.env.NODE_ENV === "production"
          ? null
          : `${frontendBaseUrl}/verify-email?token=${verificationToken}`,
    });
  } catch (error) {
    if (error && error.code === "42703") {
      pendingEmailColumnReady = false;
      try {
        await ensurePendingEmailColumn();
      } catch (ensureError) {
        return next(ensureError);
      }
      try {
        const retryReq = req;
        const userId = Number(retryReq.header("x-user-id"));
        const newEmail = typeof retryReq.body?.new_email === "string" ? retryReq.body.new_email.trim() : "";
        const rawPassword = typeof retryReq.body?.password === "string" ? retryReq.body.password : "";
        const normalizedPassword = rawPassword.trim();

        if (!Number.isInteger(userId) || userId <= 0) {
          return res.status(400).json({ error: "x-user-id header is required" });
        }
        if (!newEmail || !rawPassword) {
          return res.status(400).json({ error: "new_email and password are required" });
        }
        if (!isValidEmail(newEmail)) {
          return res.status(400).json({ error: "Invalid email format" });
        }

        const userResult = await pool.query(
          `
          SELECT id, email, email_verified, password_hash
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [userId],
        );
        if (userResult.rowCount === 0) {
          return res.status(404).json({ error: "User not found" });
        }

        const user = userResult.rows[0];
        if (!user.email_verified) {
          return res.status(403).json({
            error: "Current email must be verified before changing email",
          });
        }

        let isPasswordValid = await bcrypt.compare(rawPassword, user.password_hash);
        if (!isPasswordValid && normalizedPassword !== rawPassword) {
          isPasswordValid = await bcrypt.compare(normalizedPassword, user.password_hash);
        }
        if (!isPasswordValid) {
          return res.status(401).json({ error: "Invalid password" });
        }

        if (String(user.email || "").toLowerCase() === newEmail.toLowerCase()) {
          return res.status(400).json({ error: "New email must be different from current email" });
        }

        const conflictResult = await pool.query(
          `
          SELECT id
          FROM users
          WHERE (LOWER(email) = LOWER($1) OR LOWER(COALESCE(pending_email, '')) = LOWER($1))
            AND id <> $2
          LIMIT 1
          `,
          [newEmail, userId],
        );
        if (conflictResult.rowCount > 0) {
          return res.status(409).json({ error: "Email already exists" });
        }

        const verificationToken = generateVerificationToken();
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await pool.query(
          `
          UPDATE users
          SET pending_email = $1,
              email_verification_token = $2,
              email_verification_token_expiry = $3
          WHERE id = $4
          `,
          [newEmail, verificationToken, tokenExpiry, userId],
        );

        const frontendBaseUrl = process.env.FRONTEND_BASE_URL || "http://localhost:5173";
        let emailDelivery = { sent: false, reason: "unknown" };
        try {
          const emailResult = await sendVerificationEmail(
            newEmail,
            verificationToken,
            frontendBaseUrl,
          );
          emailDelivery = {
            sent: true,
            message_id: emailResult.messageId,
            preview_url: emailResult.previewUrl || null,
          };
        } catch (emailError) {
          emailDelivery = {
            sent: false,
            reason: emailError.message,
          };
        }

        return res.json({
          message:
            "Verification email sent to your new address. Please verify the new email before it replaces your current email.",
          pending_email: newEmail,
          email_delivery: emailDelivery,
          dev_verify_url:
            process.env.NODE_ENV === "production"
              ? null
              : `${frontendBaseUrl}/verify-email?token=${verificationToken}`,
        });
      } catch (retryError) {
        return next(retryError);
      }
    }
    return next(error);
  }
});

router.post("/auth/resend-verification-email", authSensitiveLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.trim();

    // Find user
    const result = await pool.query(
      `
      SELECT id, email, email_verified
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [normalizedEmail],
    );

    if (result.rowCount === 0) {
      // Don't reveal if email exists or not (security)
      return res.json({
        message: "If an account with this email exists, a verification link will be sent.",
        email_delivery: { sent: false, reason: "unknown_account" },
        dev_verify_url: null,
      });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.json({
        message: "Email is already verified.",
        email_delivery: { sent: false, reason: "already_verified" },
        dev_verify_url: null,
      });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update token
    await pool.query(
      `
      UPDATE users
      SET email_verification_token = $1,
          email_verification_token_expiry = $2
      WHERE id = $3
      `,
      [verificationToken, tokenExpiry, user.id],
    );

    // Send verification email
    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
    let emailDelivery = { sent: false, reason: "unknown" };
    try {
      const emailResult = await sendVerificationEmail(
        user.email,
        verificationToken,
        frontendBaseUrl,
      );
      emailDelivery = {
        sent: true,
        message_id: emailResult.messageId,
        preview_url: emailResult.previewUrl || null,
      };
    } catch (emailError) {
      console.error("Warning: Could not send verification email:", emailError);
      emailDelivery = {
        sent: false,
        reason: emailError.message,
      };
    }

    return res.json({
      message: "If an account with this email exists, a verification link will be sent.",
      email_delivery: emailDelivery,
      dev_verify_url:
        process.env.NODE_ENV === "production"
          ? null
          : `${frontendBaseUrl}/verify-email?token=${verificationToken}`,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/auth/forgot-password", authSensitiveLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim() : "";

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    const result = await pool.query(
      `
      SELECT id, email
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [normalizedEmail],
    );

    if (result.rowCount === 0) {
      return res.json({
        message:
          "If an account with this email exists, a password reset link has been sent.",
      });
    }

    const user = result.rows[0];
    const resetToken = generateResetToken();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `
      UPDATE users
      SET password_reset_token = $1,
          password_reset_token_expiry = $2
      WHERE id = $3
      `,
      [resetToken, resetExpiry, user.id],
    );

    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || "http://localhost:5173";
    let emailDelivery = { sent: false, reason: "unknown" };
    try {
      const emailResult = await sendPasswordResetEmail(
        user.email,
        resetToken,
        frontendBaseUrl,
      );
      emailDelivery = {
        sent: true,
        message_id: emailResult.messageId,
        preview_url: emailResult.previewUrl || null,
      };
    } catch (emailError) {
      console.error("Warning: Could not send password reset email:", emailError);
      emailDelivery = {
        sent: false,
        reason: emailError.message,
      };
    }

    return res.json({
      message:
        "If an account with this email exists, a password reset link has been sent.",
      email_delivery: emailDelivery,
      dev_reset_url:
        process.env.NODE_ENV === "production"
          ? null
          : `${frontendBaseUrl}/reset-password?token=${resetToken}`,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/auth/reset-password", authSensitiveLimiter, async (req, res, next) => {
  try {
    const { token, new_password } = req.body;
    const normalizedToken = typeof token === "string" ? token.trim() : "";
    const normalizedPassword =
      typeof new_password === "string" ? new_password.trim() : "";

    if (!normalizedToken || !normalizedPassword) {
      return res.status(400).json({
        error: "token and new_password are required",
      });
    }

    const commonPasswords = getCommonPasswords();
    const passwordValidation = validatePasswordStrength(
      normalizedPassword,
      commonPasswords,
    );
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const result = await pool.query(
      `
      SELECT id
      FROM users
      WHERE password_reset_token = $1
      AND password_reset_token_expiry > NOW()
      LIMIT 1
      `,
      [normalizedToken],
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 10);
    await pool.query(
      `
      UPDATE users
      SET password_hash = $1,
          password_reset_token = NULL,
          password_reset_token_expiry = NULL
      WHERE id = $2
      `,
      [passwordHash, result.rows[0].id],
    );

    return res.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    return next(error);
  }
});

router.delete(
  "/auth/delete-account",
  authSensitiveLimiter,
  async (req, res, next) => {
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

      await pool.query(
        `
      DELETE FROM users
      WHERE id = $1
      `,
        [user.id],
      );

      return res.json({ message: "Account deleted successfully" });
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = router;
