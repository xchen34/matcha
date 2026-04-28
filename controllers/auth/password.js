const bcrypt = require("bcrypt");
const pool = require("../../db");
const { sendPasswordResetEmail, getFrontendBaseUrl, buildEmailDeliveryFromResult, buildFailedEmailDelivery } = require("./shared");
const { isValidEmail, generateResetToken, getCommonPasswords, validatePasswordStrength } = require("../../routes/authHelpers");

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim() : "";

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    const result = await pool.query(
      `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [normalizedEmail],
    );

    if (result.rowCount === 0) {
      return res.json({ message: "If an account with this email exists, a password reset link has been sent." });
    }

    const user = result.rows[0];
    const resetToken = generateResetToken();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `UPDATE users SET password_reset_token = $1, password_reset_token_expiry = $2 WHERE id = $3`,
      [resetToken, resetExpiry, user.id],
    );

    const frontendBaseUrl = getFrontendBaseUrl();
    let emailDelivery = buildFailedEmailDelivery("unknown");
    try {
      const emailResult = await sendPasswordResetEmail(user.email, resetToken, frontendBaseUrl);
      emailDelivery = buildEmailDeliveryFromResult(emailResult);
    } catch (emailError) {
      console.error("Warning: Could not send password reset email:", emailError);
      emailDelivery = buildFailedEmailDelivery(emailError.message);
    }

    return res.json({
      message: "If an account with this email exists, a password reset link has been sent.",
      email_delivery: emailDelivery,
      dev_reset_url: process.env.NODE_ENV === "production" ? null : `${frontendBaseUrl}/reset-password?token=${resetToken}`,
    });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, new_password } = req.body;
    const normalizedToken = typeof token === "string" ? token.trim() : "";
    const normalizedPassword = typeof new_password === "string" ? new_password.trim() : "";

    if (!normalizedToken || !normalizedPassword) {
      return res.status(400).json({ error: "token and new_password are required" });
    }

    const commonPasswords = getCommonPasswords();
    const passwordValidation = validatePasswordStrength(normalizedPassword, commonPasswords);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const result = await pool.query(
      `SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_token_expiry > NOW() LIMIT 1`,
      [normalizedToken],
    );
    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 10);
    await pool.query(
      `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_token_expiry = NULL WHERE id = $2`,
      [passwordHash, result.rows[0].id],
    );

    return res.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    return next(error);
  }
}

module.exports = { forgotPassword, resetPassword };