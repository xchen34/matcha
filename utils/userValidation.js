const USERNAME_PATTERN = /^[A-Za-z0-9._-]{2,20}$/;
const MIN_BIRTH_DATE_ISO = "1900-01-01";

/* ========== Normalize strings ========== */
const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

function normalizeTag(value) {
  if (typeof value !== "string") return "";

  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/* ========== Email validation ========== */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ========== Birth date validation ========== */
function getMinBirthDateIso() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(date.getUTCFullYear() - 100);

  return date.toISOString().slice(0, 10);
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

/* ========== Profile completion ========== */
function isProfileCompleted(user, profile = {}) {
  const u = user || {};
  const p = profile || {};
  const gender = p.gender || u.gender;
  const birthDate = p.birth_date || u.birth_date;
  const city = p.city || u.city;

  const hasUsername = isNonEmptyString(u.username);
  const hasFirstName = isNonEmptyString(u.first_name);
  const hasLastName = isNonEmptyString(u.last_name);
  const hasEmail = isNonEmptyString(u.email);
  const hasGender = isNonEmptyString(gender);
  const hasBirthDate = Boolean(birthDate);
  const hasCity = isNonEmptyString(city);

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

module.exports = {
  USERNAME_PATTERN,
  MIN_BIRTH_DATE_ISO,
  getMinBirthDateIso,
  normalizeString,
  normalizeTag,
  isNonEmptyString,
  isValidEmail,
  parseBirthDate,
  isAtLeast18YearsOld,
  isProfileCompleted,
};
