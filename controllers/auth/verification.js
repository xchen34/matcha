const bcrypt = require("bcrypt");
const authService = require("../../services/authService");
const {
  sendVerificationEmail,
  getFrontendBaseUrl,
  buildEmailDeliveryFromResult,
  buildFailedEmailDelivery,
} = require("./shared");
const {
  normalizeString,
  generateVerificationToken,
  isValidEmail,
} = require("./helpers");

/* Handles email verification and email change requests */
async function verifyEmail(req, res, next) {
  try {
    // Validate token
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({
        error: "Verification token is required",
      });
    }

    // Find the user associated with the token
    const user = await authService.findUserByVerificationToken(token);
    if (!user) {
      return res.status(400).json({
        error: "Invalid or expired verification token",
      });
    }

    // If the user has a pending email change, verify the new one instead of the current email
    if (
      typeof user.pending_email === "string" &&
      user.pending_email.trim().length > 0
    ) {
      const nextEmail = user.pending_email.trim().toLowerCase();

      await authService.verifyEmailChange(user.id, nextEmail);

      return res.json({
        message: "Email changed and verified successfully.",
        email: nextEmail,
        user_id: user.id,
        redirect_to: "/profile",
      });
    }

    // If the email is already verified, return an error
    if (user.email_verified) {
      return res.status(400).json({
        error: "Email is already verified",
      });
    }

    await authService.verifyEmail(user.id);

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

/* Request an email change, then send a verification email to the new address */
async function requestEmailChange(req, res, next) {
  try {
    const demoAutoVerifyUsers =
      String(process.env.DEMO_AUTO_VERIFY_USERS || "").trim().toLowerCase() ===
      "true";
    // Ensure the pending_email column exists
    await authService.ensurePendingEmailColumn();

    // Validate input
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const newEmail = normalizeString(req.body.new_email).toLowerCase();
    const rawPassword =
      typeof req.body?.password === "string" ? req.body.password : "";
    if (!newEmail || !rawPassword) {
      return res.status(400).json({
        error: "new_email and password are required",
      });
    }

    if (!isValidEmail(newEmail)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Check if the user exists and their current email is verified
    const user = await authService.findUserByIdForEmailChange(userId);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        error: "Current email must be verified before changing email",
      });
    }

    // Verify password
    if (/\s/.test(rawPassword)) {
      return res.status(400).json({
        error:
          "Password must not contain spaces, tabs, or other whitespace characters",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      rawPassword,
      user.password_hash,
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid password",
      });
    }

    // Ensure the new email is different from the current email and not already in use
    if (String(user.email || "").toLowerCase() === newEmail.toLowerCase()) {
      return res.status(400).json({
        error: "New email must be different from current email",
      });
    }

    const conflict = await authService.checkEmailConflict(newEmail, userId);
    if (conflict) {
      return res.status(409).json({
        error: "Email already exists",
      });
    }

    // Generate a verification token (24-hour expiry) 
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Save the pending email and verification token to the database
    await authService.setPendingEmailAndToken(
      userId,
      newEmail,
      verificationToken,
      tokenExpiry,
    );

    // Send the verification email to the new address
    const frontendBaseUrl = getFrontendBaseUrl();
    const demoVerifyUrl = `${frontendBaseUrl}/verify-email?token=${verificationToken}`;

    if (demoAutoVerifyUsers) {
      return res.json({
        message:
          "Verification link generated for your new address. Open it to confirm the email change.",
        pending_email: newEmail,
        email_delivery: {
          sent: false,
          skipped: true,
          reason: "demo_auto_verify_enabled",
        },
        dev_verify_url: demoVerifyUrl,
      });
    }

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
          : demoVerifyUrl,
    });
  } catch (error) {
    return next(error);
  }
}

/* Resend the verification email to the user's current email address */
async function resendVerificationEmail(req, res, next) {
  try {
    const demoAutoVerifyUsers =
      String(process.env.DEMO_AUTO_VERIFY_USERS || "").trim().toLowerCase() ===
      "true";
    // Validate input
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    const normalizedEmail = normalizeString(email).toLowerCase();
    const user = await authService.findUserByEmail(normalizedEmail);
    if (!user) {
      return res.json({
        message:
          "If an account with this email exists, a verification link has been sent.",
      });
    }

    if (user.email_verified) {
      return res.status(400).json({
        error: "Email is already verified",
      });
    }

    // Generate a new verification token and save it to the database
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Save the new token and expiry to the database, but only if the email is not already verified
    await authService.updateVerificationToken(
      user.id,
      verificationToken,
      tokenExpiry,
    );

    // Send the verification email
    const frontendBaseUrl = getFrontendBaseUrl();
    const demoVerifyUrl = `${frontendBaseUrl}/verify-email?token=${verificationToken}`;

    if (demoAutoVerifyUsers) {
      return res.json({
        message:
          "If an account with this email exists, a verification link has been generated.",
        email_delivery: {
          sent: false,
          skipped: true,
          reason: "demo_auto_verify_enabled",
        },
        dev_verify_url: demoVerifyUrl,
      });
    }

    let emailDelivery = buildFailedEmailDelivery("unknown");

    try {
      const emailResult = await sendVerificationEmail(
        user.email,
        verificationToken,
        frontendBaseUrl,
      );
      emailDelivery = buildEmailDeliveryFromResult(emailResult);
    } catch (emailError) {
      emailDelivery = buildFailedEmailDelivery(emailError.message);
    }

    return res.json({
      message:
        "If an account with this email exists, a verification link has been sent.",
      email_delivery: emailDelivery,
      dev_verify_url:
        process.env.NODE_ENV === "production"
          ? null
          : demoVerifyUrl,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  verifyEmail,
  requestEmailChange,
  resendVerificationEmail,
};
