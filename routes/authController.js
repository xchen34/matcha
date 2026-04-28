const bcrypt = require("bcrypt");
const pool = require("../db");
const { createRealtimeToken } = require("../realtime/authToken");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/emailService");
const {
  authLimiter,
  authSensitiveLimiter,
} = require("../middleware/rateLimit");
const {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  USERNAME_PATTERN,
  MIN_BIRTH_DATE_ISO,
  isValidEmail,
  parseBirthDate,
  isAtLeast18YearsOld,
  generateVerificationToken,
  generateResetToken,
  isProfileCompleted,
  ensurePendingEmailColumn,
  getCommonPasswords,
  validatePasswordStrength,
} = require("./authHelpers");

function getFrontendBaseUrl() {
  return process.env.FRONTEND_BASE_URL || "http://localhost:5173";
}

function buildEmailDeliveryFromResult(emailResult) {
  return {
    sent: true,
    message_id: emailResult.messageId,
    preview_url: emailResult.previewUrl || null,
  };
}

function buildFailedEmailDelivery(reason) {
  return {
    sent: false,
    reason,
  };
}

async function register(req, res, next) {
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

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (parsedBirthDate > today) {
      return res
        .status(400)
        .json({ error: "birth_date cannot be in the future" });
    }

    if (birth_date < MIN_BIRTH_DATE_ISO) {
      return res.status(400).json({
        error: `birth_date must be on or after ${MIN_BIRTH_DATE_ISO}`,
      });
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
          "username is invalid (use 2-20 characters: letters, numbers, dot, underscore, hyphen)",
      });
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 10);
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await client.query("BEGIN");

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

    const userId = result.rows[0].id;
    await client.query(
      `INSERT INTO profiles (user_id, birth_date)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET birth_date = EXCLUDED.birth_date`,
      [userId, birth_date],
    );

    await client.query("COMMIT");

    const frontendBaseUrl = getFrontendBaseUrl();
    let emailDelivery = buildFailedEmailDelivery("unknown");
    try {
      const emailResult = await sendVerificationEmail(
        normalizedEmail,
        verificationToken,
        frontendBaseUrl,
      );
      emailDelivery = buildEmailDeliveryFromResult(emailResult);
    } catch (emailError) {
      console.error("Warning: Could not send verification email:", emailError);
      emailDelivery = buildFailedEmailDelivery(emailError.message);
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
}

async function login(req, res, next) {
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

async function getRealtimeToken(req, res, next) {
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
}

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Verification token is required" });
    }

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
        error: "Invalid or expired verification token",
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
        error: "Email is already verified",
      });
    }

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
}

async function requestEmailChange(req, res, next) {
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

    const frontendBaseUrl = getFrontendBaseUrl();
    let emailDelivery = buildFailedEmailDelivery("unknown");
    try {
      const emailResult = await sendVerificationEmail(
        newEmail,
        verificationToken,
        frontendBaseUrl,
      );
      emailDelivery = buildEmailDeliveryFromResult(emailResult);
    } catch (emailError) {
      emailDelivery = buildFailedEmailDelivery(emailError.message);
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
      return next(error);
    }
    return next(error);
  }
}

async function resendVerificationEmail(req, res, next) {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.trim();

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

    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `
      UPDATE users
      SET email_verification_token = $1,
          email_verification_token_expiry = $2
      WHERE id = $3
      `,
      [verificationToken, tokenExpiry, user.id],
    );

    const frontendBaseUrl = getFrontendBaseUrl();
    let emailDelivery = buildFailedEmailDelivery("unknown");
    try {
      const emailResult = await sendVerificationEmail(
        user.email,
        verificationToken,
        frontendBaseUrl,
      );
      emailDelivery = buildEmailDeliveryFromResult(emailResult);
    } catch (emailError) {
      console.error("Warning: Could not send verification email:", emailError);
      emailDelivery = buildFailedEmailDelivery(emailError.message);
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
}

async function forgotPassword(req, res, next) {
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
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `
      UPDATE users
      SET password_reset_token = $1,
          password_reset_token_expiry = $2
      WHERE id = $3
      `,
      [resetToken, resetExpiry, user.id],
    );

    const frontendBaseUrl = getFrontendBaseUrl();
    let emailDelivery = buildFailedEmailDelivery("unknown");
    try {
      const emailResult = await sendPasswordResetEmail(
        user.email,
        resetToken,
        frontendBaseUrl,
      );
      emailDelivery = buildEmailDeliveryFromResult(emailResult);
    } catch (emailError) {
      console.error("Warning: Could not send password reset email:", emailError);
      emailDelivery = buildFailedEmailDelivery(emailError.message);
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
}

async function resetPassword(req, res, next) {
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
}

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
}

module.exports = {
  register,
  login,
  getRealtimeToken,
  verifyEmail,
  requestEmailChange,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  deleteAccount,
  authLimiter,
  authSensitiveLimiter,
};