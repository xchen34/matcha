const bcrypt = require("bcrypt");
const authService = require("../../services/authService");
const {
  sendPasswordResetEmail,
  getFrontendBaseUrl,
  buildEmailDeliveryFromResult,
  buildFailedEmailDelivery,
} = require("./shared");
const {
  isValidEmail,
  generateResetToken,
  getCommonPasswords,
  validatePasswordStrength,
  normalizeString,
} = require("./helpers");

/* Forgot password: generate a reset token and send email */
async function forgotPassword(req, res, next) {
  try {
    const demoAutoVerifyUsers =
      String(process.env.DEMO_AUTO_VERIFY_USERS || "").trim().toLowerCase() ===
      "true";
    const { email } = req.body;
    const normalizedEmail = normalizeString(email).toLowerCase();

    // Validate email
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        error: "Valid email is required",
      });
    }

    // Attempt to find the user by email
    const user = await authService.findUserByEmail(normalizedEmail);
    if (!user) {
      return res.json({
        message:
          "If an account with this email exists, a password reset link has been sent.",
      });
    }

    // Generate a password reset token and save it to the database (60-minute expiry)
    const resetToken = generateResetToken();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await authService.setPasswordResetToken(user.id, resetToken, resetExpiry);

    // Send the password reset email
    const frontendBaseUrl = getFrontendBaseUrl();
    const demoResetUrl = `${frontendBaseUrl}/reset-password?token=${resetToken}`;

    if (demoAutoVerifyUsers) {
      return res.json({
        message:
          "If an account with this email exists, a password reset link has been generated.",
        email_delivery: {
          sent: false,
          skipped: true,
          reason: "demo_auto_verify_enabled",
        },
        dev_reset_url: demoResetUrl,
      });
    }

    let emailDelivery = buildFailedEmailDelivery("unknown");

    try {
      const emailResult = await sendPasswordResetEmail(
        user.email,
        resetToken,
        frontendBaseUrl,
      );
      emailDelivery = buildEmailDeliveryFromResult(emailResult);
    } catch (emailError) {
      console.error(
        "Warning: Could not send password reset email:",
        emailError,
      );
      emailDelivery = buildFailedEmailDelivery(emailError.message);
    }

    return res.json({
      message:
        "If an account with this email exists, a password reset link has been sent.",
      email_delivery: emailDelivery,
      dev_reset_url:
        process.env.NODE_ENV === "production"
          ? null
          : demoResetUrl,
    });
  } catch (error) {
    return next(error);
  }
}

/* Reset password: validate token and update password */
async function resetPassword(req, res, next) {
  try {
    const { token, new_password } = req.body;
    const normalizedToken = normalizeString(token);
    const password = typeof new_password === "string" ? new_password : "";

    if (!normalizedToken || !password) {
      return res.status(400).json({
        error: "Token and new_password are required",
      });
    }

    if (/\s/.test(password)) {
      return res.status(400).json({
        error: "Password must not contain spaces, tabs, or other whitespace characters",
      });
    }

    // Validate password with common password and strength
    const commonPasswords = getCommonPasswords();
    const passwordValidation = validatePasswordStrength(
      password,
      commonPasswords,
    );
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: passwordValidation.error,
      });
    }

    // Find the user associated with the reset token
    const user = await authService.findUserByResetToken(normalizedToken);
    if (!user) {
      return res.status(400).json({
        error: "Invalid or expired reset token",
      });
    }

    // Hash the new password and update it in the database
    const passwordHash = await bcrypt.hash(password, 10);
    await authService.updatePassword(user.id, passwordHash);

    return res.json({
      message: "Password reset successful. You can now log in.",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { forgotPassword, resetPassword };
