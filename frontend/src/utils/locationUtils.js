/* ========== Location Utilities ========== */
export function normalizeLocationPrefix(value) {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* ========== Validation cache key generation ========== */
export function getValidationCacheKey(city, neighborhood, latitude, longitude) {
  return [
    normalizeLocationPrefix(city),
    normalizeLocationPrefix(neighborhood),
    latitude || "",
    longitude || "",
  ].join("|");
}