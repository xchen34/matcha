const nodemailer = require("nodemailer");

const SMTP_PLACEHOLDERS = new Set([
  "your_ethereal_email@ethereal.email",
  "your_ethereal_password",
]);

let cachedDevMailer = null;

/* ========== Normalize email input (trim and lowercase) ========== */
function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

/* ========== Returns the SMTP authentication configuration ========== */
function getSmtpAuthConfig() {
  const smtpUser = (
    process.env.SMTP_USER ||
    process.env.ETHEREAL_USER ||
    ""
  ).trim();
  const smtpPass = (
    process.env.SMTP_PASSWORD ||
    process.env.ETHEREAL_PASSWORD ||
    ""
  ).trim();

  return { smtpUser, smtpPass };
}

/* ========== Checks if explicit SMTP credentials are provided (not placeholders) ========== */
function hasExplicitSmtpConfig() {
  const { smtpUser, smtpPass } = getSmtpAuthConfig();
  if (!smtpUser || !smtpPass) {
    return false;
  }

  return !SMTP_PLACEHOLDERS.has(smtpUser) && !SMTP_PLACEHOLDERS.has(smtpPass);
}

/* ========== Determines if SMTP is configured (either explicitly or via development fallback) ========== */
function isSmtpConfigured() {
  if (hasExplicitSmtpConfig()) {
    return true;
  }

  // Development fallback: auto-create Ethereal account when SMTP env is not set.
  return process.env.NODE_ENV !== "production";
}

/* ========== Creates and returns a nodemailer transporter based on the env and config ========== */
async function createMailer() {
  const smtpHost = process.env.SMTP_HOST || "smtp.ethereal.email";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const { smtpUser, smtpPass } = getSmtpAuthConfig();
  const smtpFromEmail = process.env.SMTP_FROM_EMAIL || "noreply@matcha.local";

  // Explicit SMTP credentials provided
  if (hasExplicitSmtpConfig()) {
    return nodemailer.createTransport(
      {
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      },
      {
        from: smtpFromEmail,
      },
    );
  }

  // Production without SMTP config → error
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SMTP is not configured. Set SMTP_USER and SMTP_PASSWORD in .env (not placeholder values).",
    );
  }

  // Development → auto-create Ethereal test account
  if (!cachedDevMailer) {
    const testAccount = await nodemailer.createTestAccount();
    cachedDevMailer = nodemailer.createTransport(
      {
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      },
      {
        from: smtpFromEmail,
      },
    );
    console.log(
      "Using auto-generated Ethereal test account for email delivery in development.",
    );
  }

  return cachedDevMailer;
}

/* ========== Send email verification link to user ========== */
async function sendVerificationEmail(
  email,
  verificationToken,
  frontendBaseUrl,
) {
  try {
    const mailer = await createMailer();

    const verificationLink = `${frontendBaseUrl}/verify-email?token=${verificationToken}`;

    const htmlContent = `
      <h1>Welcome to Matcha!</h1>
      <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
      <p>
        <a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Verify Email
        </a>
      </p>
      <p>Or copy and paste this link in your browser:</p>
      <p><code>${verificationLink}</code></p>
      <p>This link will expire in 24 hours.</p>
      <p>If you did not sign up for this account, please ignore this email.</p>
    `;

    const result = await mailer.sendMail({
      to: email,
      subject: "Verify Your Matcha Account",
      html: htmlContent,
      text: `Welcome to Matcha!\n\nPlease verify your email by visiting this link:\n${verificationLink}\n\nThis link will expire in 24 hours.`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(result) || null;
    console.log("Verification email sent:", result.messageId);
    if (previewUrl) {
      console.log("Verification email preview:", previewUrl);
    }

    return { success: true, messageId: result.messageId, previewUrl };
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw error;
  }
}

/* ========== Send password reset email to user ========== */
async function sendPasswordResetEmail(email, resetToken, frontendBaseUrl) {
  try {
    const mailer = await createMailer();

    const resetLink = `${frontendBaseUrl}/reset-password?token=${resetToken}`;

    const htmlContent = `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p>
        <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </p>
      <p>Or copy and paste this link in your browser:</p>
      <p><code>${resetLink}</code></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
    `;

    const result = await mailer.sendMail({
      to: email,
      subject: "Reset Your Matcha Password",
      html: htmlContent,
      text: `Password Reset Request\n\nClick this link to reset your password:\n${resetLink}\n\nThis link will expire in 1 hour.`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(result) || null;
    console.log("Password reset email sent:", result.messageId);
    if (previewUrl) {
      console.log("Password reset email preview:", previewUrl);
    }

    return { success: true, messageId: result.messageId, previewUrl };
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    throw error;
  }
}

module.exports = {
  normalizeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  createMailer,
  isSmtpConfigured,
};
