const pool = require("../../db");
const bcrypt = require("bcrypt");
const {
  sendVerificationEmail,
  getFrontendBaseUrl,
  buildEmailDeliveryFromResult,
  buildFailedEmailDelivery,
} = require("./shared");
const {
  ensurePendingEmailColumn,
  generateVerificationToken,
  isValidEmail,
} = require("../../routes/authHelpers");

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
      return res.status(400).json({ error: "Invalid or expired verification token" });
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

      return res.json({ message: "Email changed and verified successfully.", email: nextEmail, user_id: user.id, redirect_to: "/profile" });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: "Email is already verified" });
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

    return res.json({ message: "Email verified successfully. You can now log in.", email: user.email, user_id: user.id, redirect_to: "/login" });
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
      return res.status(403).json({ error: "Current email must be verified before changing email" });
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

module.exports = { verifyEmail, requestEmailChange, resendVerificationEmail };