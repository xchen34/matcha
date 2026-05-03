const bcrypt = require("bcrypt");
const authService = require("../../services/authService");
const { sendVerificationEmail, getFrontendBaseUrl, buildEmailDeliveryFromResult, buildFailedEmailDelivery } = require("./shared");
const { generateVerificationToken, isValidEmail } = require("./helpers");

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Verification token is required" });
    }

    const user = await authService.findUserByVerificationToken(token);

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired verification token" });
    }

    if (typeof user.pending_email === "string" && user.pending_email.trim().length > 0) {
      const nextEmail = user.pending_email.trim();
      await authService.verifyEmailChange(user.id, nextEmail);
      return res.json({ message: "Email changed and verified successfully.", email: nextEmail, user_id: user.id, redirect_to: "/profile" });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    await authService.verifyEmail(user.id);
    return res.json({ message: "Email verified successfully. You can now log in.", email: user.email, user_id: user.id, redirect_to: "/login" });
  } catch (error) {
    return next(error);
  }
}

async function requestEmailChange(req, res, next) {
  try {
    await authService.ensurePendingEmailColumn();
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

    const user = await authService.findUserByIdForEmailChange(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
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

    const conflict = await authService.checkEmailConflict(newEmail, userId);
    if (conflict) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await authService.setPendingEmailAndToken(userId, newEmail, verificationToken, tokenExpiry);

    const frontendBaseUrl = getFrontendBaseUrl();
    let emailDelivery = buildFailedEmailDelivery("unknown");
    try {
      const emailResult = await sendVerificationEmail(newEmail, verificationToken, frontendBaseUrl);
      emailDelivery = buildEmailDeliveryFromResult(emailResult);
    } catch (emailError) {
      emailDelivery = buildFailedEmailDelivery(emailError.message);
    }

    return res.json({
      message: "Verification email sent to your new address. Please verify the new email before it replaces your current email.",
      pending_email: newEmail,
      email_delivery: emailDelivery,
      dev_verify_url: process.env.NODE_ENV === "production" ? null : `${frontendBaseUrl}/verify-email?token=${verificationToken}`,
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
    const user = await authService.findUserByEmail(normalizedEmail);

    if (!user) {
      return res.json({ message: "If an account with this email exists, a verification link has been sent." });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await authService.updateVerificationToken(user.id, verificationToken, tokenExpiry);

    const frontendBaseUrl = getFrontendBaseUrl();
    let emailDelivery = buildFailedEmailDelivery("unknown");
    try {
      const emailResult = await sendVerificationEmail(user.email, verificationToken, frontendBaseUrl);
      emailDelivery = buildEmailDeliveryFromResult(emailResult);
    } catch (emailError) {
      emailDelivery = buildFailedEmailDelivery(emailError.message);
    }

    return res.json({
      message: "If an account with this email exists, a verification link has been sent.",
      email_delivery: emailDelivery,
      dev_verify_url: process.env.NODE_ENV === "production" ? null : `${frontendBaseUrl}/verify-email?token=${verificationToken}`,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { verifyEmail, requestEmailChange, resendVerificationEmail };