const crypto = require("crypto");
const fs = require("fs");
const path = require("path");


const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{2,20}$/;
const MIN_BIRTH_DATE_ISO = "1900-01-01";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function isProfileCompleted(user) {
  const hasUsername = typeof user?.username === "string" && user.username.trim().length > 0;
  const hasFirstName = typeof user?.first_name === "string" && user.first_name.trim().length > 0;
  const hasLastName = typeof user?.last_name === "string" && user.last_name.trim().length > 0;
  const hasEmail = typeof user?.email === "string" && user.email.trim().length > 0;
  const hasGender = typeof user?.gender === "string" && user.gender.trim().length > 0;
  const hasBirthDate = Boolean(user?.birth_date);
  const hasCity = typeof user?.city === "string" && user.city.trim().length > 0;

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



function getCommonPasswords() {
  const commonPasswordsPath = path.join(__dirname, "..", "..", "common_passwords.txt");
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

module.exports = {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  USERNAME_PATTERN,
  MIN_BIRTH_DATE_ISO,
  isValidEmail,
  parseBirthDate,
  isAtLeast18YearsOld,
  generateVerificationToken,
  generateResetToken,
  isProfileCompleted,
  getCommonPasswords,
  validatePasswordStrength,
};