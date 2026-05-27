const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  USERNAME_PATTERN,
  MIN_BIRTH_DATE_ISO,
  getMinBirthDateIso,
  normalizeString,
  isValidEmail,
  parseBirthDate,
  isAtLeast18YearsOld,
  isProfileCompleted,
} = require("../../utils/userValidation");

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

/* ========== DATE ========== */
const getTodayUTCStart = () => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);

  return date;
};

/* ========== USERNAME ========== */
function isValidUsername(username) {
  return USERNAME_PATTERN.test(username);
}

/* ========== Password ========== */
function isValidatePassword(password) {
  if (/\s/.test(password)) {
    return {
      valid: false,
      error: "password must not contain spaces",
    };
  }

  const commonPasswords = getCommonPasswords();

  return validatePasswordStrength(password, commonPasswords);
}

// Gets a list of common passwords
function getCommonPasswords() {
  const commonPasswordsPath = path.join(
    __dirname,
    "..",
    "..",
    "common_passwords.txt",
  );
  try {
    const fileContent = fs.readFileSync(commonPasswordsPath, "utf-8");

    return fileContent
      .split(/\r?\n/)
      .map((w) => w.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

// Validates password strength and checks
function validatePasswordStrength(password, commonPasswords) {
  const value = typeof password === "string" ? password : "";

  if (value.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    };
  }

  if (value.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters long.`,
    };
  }

  if (/\s/.test(value)) {
    return {
      valid: false,
      error:
        "Password must not contain spaces, tabs, or other whitespace characters.",
    };
  }

  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);

  if (!hasLower || !hasUpper || !hasDigit) {
    return {
      valid: false,
      error:
        "Password must include at least one uppercase letter, one lowercase letter, and one number.",
    };
  }

  if (commonPasswords.includes(value.toLowerCase())) {
    return {
      valid: false,
      error: "Password is too common. Please choose a stronger password.",
    };
  }

  return { valid: true };
}

/* ========== TOKENS ========== */
function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

/* ========== EXPORTS ========== */
module.exports = {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  USERNAME_PATTERN,
  MIN_BIRTH_DATE_ISO,
  getTodayUTCStart,
  getMinBirthDateIso,
  normalizeString,
  isValidEmail,
  isValidUsername,
  isValidatePassword,
  parseBirthDate,
  isAtLeast18YearsOld,
  generateVerificationToken,
  generateResetToken,
  isProfileCompleted,
  getCommonPasswords,
  validatePasswordStrength,
};
