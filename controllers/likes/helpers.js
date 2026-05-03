

function normalizeTag(tag) {
  if (typeof tag !== "string") return "";
  let normalized = tag.trim().toLowerCase();
  if (!normalized) return "";
  if (!normalized.startsWith("#")) normalized = `#${normalized}`;
  if (!/^#[a-z0-9_]{1,30}$/.test(normalized)) return "";
  return normalized;
}

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