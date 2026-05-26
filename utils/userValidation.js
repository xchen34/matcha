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

function isProfileCompleted(user, profile = {}) {
  const u = user || {};
  const p = profile || {};
  const gender = p.gender || u.gender;
  const birthDate = p.birth_date || u.birth_date;
  const city = p.city || u.city;

  const hasUsername = typeof u.username === "string" && u.username.trim().length > 0;
  const hasFirstName = typeof u.first_name === "string" && u.first_name.trim().length > 0;
  const hasLastName = typeof u.last_name === "string" && u.last_name.trim().length > 0;
  const hasEmail = typeof u.email === "string" && u.email.trim().length > 0;
  const hasGender = typeof gender === "string" && gender.trim().length > 0;
  const hasBirthDate = Boolean(birthDate);
  const hasCity = typeof city === "string" && city.trim().length > 0;

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
  isValidEmail,
  parseBirthDate,
  isAtLeast18YearsOld,
  isProfileCompleted,
};
