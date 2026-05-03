const bcrypt = require("bcrypt");
const authService = require("../../services/authService");
const { sendPasswordResetEmail, getFrontendBaseUrl, buildEmailDeliveryFromResult, buildFailedEmailDelivery } = require("./shared");
const { isValidEmail, generateResetToken, getCommonPasswords, validatePasswordStrength } = require("./helpers");

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim() : "";

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    const user = await authService.findUserByEmail(normalizedEmail);

    if (!user) {
      return res.json({ message: "If an account with this email exists, a password reset link has been sent." });
    }

    const resetToken = generateResetToken();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await authService.setPasswordResetToken(user.id, resetToken, resetExpiry);

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

    const user = await authService.findUserByResetToken(normalizedToken);
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 10);
    await authService.updatePassword(user.id, passwordHash);

    return res.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    return next(error);
  }
}

module.exports = { forgotPassword, resetPassword };