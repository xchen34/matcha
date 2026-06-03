/**
 * Normalize a tag query value into the canonical hashtag form used by the
 * suggestion filters.
 *
 * Implementation details:
 * - Rejects non-string input early.
 * - Trims whitespace and lowercases the tag so matching is case-insensitive.
 * - Ensures the value starts with `#` because the rest of the likes stack
 *   expects stored tags to use that prefix.
 * - Validates the final shape with a strict regex to avoid accepting
 *   unsupported characters or overly long tags.
 */
function normalizeTag(tag) {
  if (typeof tag !== "string") return "";

  let normalized = tag.trim().toLowerCase();
  if (!normalized) return "";

  if (!normalized.startsWith("#")) normalized = `#${normalized}`;

  if (!/^#[a-z0-9_]{1,30}$/.test(normalized)) return "";

  return normalized;
}

/**
 * Parse the `tags` query parameter used by the suggestions endpoint.
 *
 * Implementation details:
 * - Accepts either a comma-separated string or an array of raw tag values.
 * - Returns `null` when the caller did not provide a meaningful value so the
 *   service layer can skip the filter entirely.
 * - Normalizes every tag through `normalizeTag()` to keep matching consistent.
 * - Deduplicates tags while preserving the original order of the first
 *   occurrence so SQL filters stay deterministic.
 */
function parseTagsQueryParam(rawTags) {
  if (rawTags === undefined || rawTags === null || rawTags === "") {
    return null;
  }

  const values = Array.isArray(rawTags)
    ? rawTags
    : String(rawTags)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const unique = [];
  const seen = new Set();

  for (const value of values) {
    const normalized = normalizeTag(value);
    if (!normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    unique.push(normalized);
  }

  return unique.length > 0 ? unique : null;
}

module.exports = {
  normalizeTag,
  parseTagsQueryParam,
};
