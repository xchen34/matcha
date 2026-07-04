const bcrypt = require("bcrypt");
const authService = require("../../services/authService");
const {
  sendVerificationEmail,
  getFrontendBaseUrl,
  buildEmailDeliveryFromResult,
  buildFailedEmailDelivery,
} = require("./shared");
const {
  getTodayUTCStart,
  getMinBirthDateIso,
  normalizeString,
  isValidEmail,
  isValidUsername,
  parseBirthDate,
  isAtLeast18YearsOld,
  isValidatePassword,
  generateVerificationToken,
  generateResetToken,
} = require("./helpers");

async function register(req, res, next) {
  try {
    const demoAutoVerifyUsers =
      String(process.env.DEMO_AUTO_VERIFY_USERS || "").trim().toLowerCase() ===
      "true";
    const { email, username, first_name, last_name, birth_date, password: rawPassword } = req.body;
    const normalizedEmail = normalizeString(email);
    const normalizedUsername = normalizeString(username);
    const normalizedFirstName = normalizeString(first_name);
    const normalizedLastName = normalizeString(last_name);
    const password = typeof rawPassword === "string" ? rawPassword : "";

    if (!normalizedEmail || !normalizedUsername || !normalizedFirstName || !normalizedLastName || !birth_date || !password) {
      return res
        .status(400)
        .json({
        error:
          "email, username, first_name, last_name, birth_date and password are required",
      });
    }

    // Check email format
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Check username format
    if (!isValidUsername(normalizedUsername)) {
      return res.status(400).json({
        error:
          "username is invalid (use 2-20 characters: letters, numbers, dot, underscore, hyphen)",
      });
    }

    // Check birth date format and age
    const parsedBirthDate = parseBirthDate(birth_date);
    if (!parsedBirthDate) {
      return res.status(400).json({
        error: "birth_date must be a valid date (YYYY-MM-DD)",
      });
    }

    if (parsedBirthDate > getTodayUTCStart()) {
      return res.status(400).json({
        error: "birth_date cannot be in the future",
      });
    }

    const minBirthDateIso = getMinBirthDateIso();
    if (parsedBirthDate < new Date(minBirthDateIso)) {
      return res.status(400).json({
        error: `birth_date must be on or after ${minBirthDateIso}`,
      });
    }

    if (!isAtLeast18YearsOld(parsedBirthDate)) {
      return res.status(400).json({
        error: "You must be at least 18 years old to register",
      });
    }

    // Check password format and not common passwords
    const passwordValidation = isValidatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: passwordValidation.error,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Check token for email verification and create user (24-hour expiry)
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Check for existing email or username conflicts before creating user
    const user = await authService.registerUser(
      {
        email: normalizedEmail,
        username: normalizedUsername,
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        passwordHash,
        verificationToken,
        tokenExpiry,
      },
      birth_date,
    );

    if (demoAutoVerifyUsers) {
      await authService.verifyEmail(user.id);

      return res.status(201).json({
        message: "User registered successfully. You can now log in.",
        user: {
          ...user,
          email_verified: true,
        },
        profile_completed: false,
        email_delivery: {
          success: false,
          skipped: true,
          reason: "demo_auto_verify_enabled",
        },
        next_step: "login",
        dev_verify_url: null,
      });
    }

    // Send the verification email
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
      user,
      profile_completed: false,
      email_delivery: emailDelivery,
      next_step: "verify_email",
      dev_verify_url:
        process.env.NODE_ENV === "production"
          ? null
          : `${frontendBaseUrl}/verify-email?token=${verificationToken}`,
    });
  } catch (error) {
    if (error.code === "23505") {
      if (error.constraint === "users_email_key")
        return res.status(409).json({
          error: "Email already exists",
        });

      if (error.constraint === "users_username_key")
        return res.status(409).json({
          error: "Username already exists",
        });

      return res.status(409).json({
        error: "Email or username already exists",
      });
    }

    return next(error);
  }
}

module.exports = { register };
