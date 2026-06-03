/**
 * Convert a request value into a positive integer notification/user ID.
 *
 * Implementation details:
 * - Uses `Number()` so both string and numeric inputs are accepted.
 * - Rejects non-integers and non-positive values so callers only work with
 *   valid database identifiers.
 * - Returns `null` for invalid input so controllers can fail fast with a
 *   consistent 400 response.
 */
function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

module.exports = { parsePositiveInt };
