const bcrypt = require("bcrypt");
const pool = require("../../db");
const {
  sendVerificationEmail,
  getFrontendBaseUrl,
  buildEmailDeliveryFromResult,
  buildFailedEmailDelivery,
} = require("./shared");
const {
  MIN_BIRTH_DATE_ISO,
  USERNAME_PATTERN,
  isValidEmail,
  parseBirthDate,
  isAtLeast18YearsOld,
  generateVerificationToken,
  getCommonPasswords,
  validatePasswordStrength,
} = require("../../routes/authHelpers");

async function register(req, res, next) {
  const client = await pool.connect();
  try {
    const { email, username, first_name, last_name, birth_date, password } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim() : "";
    const normalizedUsername = typeof username === "string" ? username.trim() : "";
    const normalizedFirstName = typeof first_name === "string" ? first_name.trim() : "";
    const normalizedLastName = typeof last_name === "string" ? last_name.trim() : "";
    const normalizedPassword = typeof password === "string" ? password.trim() : "";

    if (
      !normalizedEmail ||
      !normalizedUsername ||
      !normalizedFirstName ||
      !normalizedLastName ||
      !birth_date ||
      !normalizedPassword
    ) {
      return res.status(400).json({
        error: "email, username, first_name, last_name, birth_date and password are required",
      });
    }

    const parsedBirthDate = parseBirthDate(birth_date);
    if (!parsedBirthDate) {
      return res.status(400).json({ error: "birth_date must be a valid date (YYYY-MM-DD)" });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (parsedBirthDate > today) {
      return res.status(400).json({ error: "birth_date cannot be in the future" });
    }

    if (birth_date < MIN_BIRTH_DATE_ISO) {
      return res.status(400).json({
        error: `birth_date must be on or after ${MIN_BIRTH_DATE_ISO}`,
      });
    }

    if (!isAtLeast18YearsOld(parsedBirthDate)) {
      return res.status(400).json({ error: "You must be at least 18 years old to register" });
    }

    const commonPasswords = getCommonPasswords();
    const passwordValidation = validatePasswordStrength(normalizedPassword, commonPasswords);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      return res.status(400).json({
        error: "username is invalid (use 2-20 characters: letters, numbers, dot, underscore, hyphen)",
      });
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 10);
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await client.query("BEGIN");
    const result = await client.query(
      `
      INSERT INTO users (email, username, first_name, last_name, password_hash, email_verification_token, email_verification_token_expiry)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, username, first_name, last_name, email_verified, created_at
      `,
      [
        normalizedEmail,
        normalizedUsername,
        normalizedFirstName,
        normalizedLastName,
        passwordHash,
        verificationToken,
        tokenExpiry,
      ],
    );

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
      const emailResult = await sendVerificationEmail(normalizedEmail, verificationToken, frontendBaseUrl);
      emailDelivery = buildEmailDeliveryFromResult(emailResult);
    } catch (emailError) {
      console.error("Warning: Could not send verification email:", emailError);
      emailDelivery = buildFailedEmailDelivery(emailError.message);
    }

    return res.status(201).json({
      message: "User registered successfully. Please check your email to verify your account.",
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
      return res.status(409).json({ error: "Email or username already exists" });
    }

    return next(error);
  } finally {
    client.release();
  }
}

module.exports = { register };