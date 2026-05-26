const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

/* ========== DATE ========== */
const getTodayUTCStart = () => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const getMinBirthDateIso = () => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(date.getUTCFullYear() - 100);

  return date.toISOString().slice(0, 10);
};

/* ========== EMAIL ========== */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ========== USERNAME ========== */
function isValidUsername(username) {
  return /^[A-Za-z0-9._-]{2,20}$/.test(username);
}

/* ========== BIRTH DATE ========== */
function parseBirthDate(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function isAtLeast18YearsOld(birthDate) {
  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - birthDate.getUTCMonth();

  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }

  return age >= 18;
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

/*  ========== PROFILE ========== */
function isProfileCompleted(user) {
  const hasValue = (value) =>
    typeof value === "string" && value.trim().length > 0;

  const hasUsername = hasValue(user?.username);
  const hasFirstName = hasValue(user?.first_name);
  const hasLastName = hasValue(user?.last_name);
  const hasEmail = hasValue(user?.email);
  const hasGender = hasValue(user?.gender);
  const hasBirthDate = Boolean(user?.birth_date);
  const hasCity = hasValue(user?.city);

  return (
    hasUsername &&
    hasFirstName &&
    hasLastName &&
    hasEmail &&
    hasGender &&
    hasBirthDate &&
    hasCity
  );
}

/* ========== EXPORTS ========== */
module.exports = {
  getTodayUTCStart,
  getMinBirthDateIso,
  isValidEmail,
  isValidUsername,
  isValidatePassword,
  parseBirthDate,
  isAtLeast18YearsOld,
  generateVerificationToken,
  generateResetToken,
  isProfileCompleted,
};
