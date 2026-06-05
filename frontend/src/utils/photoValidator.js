export const ALLOWED_PHOTO_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
export const MAX_PHOTO_SIZE_BYTES = 500 * 1024; // 500KB per photo
export const MAX_PHOTOS_COUNT = 5;
export const MAX_TOTAL_PHOTOS_SIZE_BYTES =
  MAX_PHOTO_SIZE_BYTES * MAX_PHOTOS_COUNT; // 2500KB total for 5 photos

/* ========== Validate MIME type from a File object ========== */
export function validatePhotoFile(file) {
  // Check file type
  if (!ALLOWED_PHOTO_MIMES.has(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Only JPEG, PNG, WebP, GIF are allowed.`,
    };
  }

  // Check file size
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Photo is too large: ${sizeMB}MB. Maximum 500KB per photo.`,
    };
  }

  return { valid: true };
}

/* ========== Validate MIME type from a data URL string ========== */
export function validatePhotoMimeType(dataUrl) {
  // Extract MIME type from data URL
  const match = dataUrl.match(/^data:([a-z0-9\-+]+\/[a-z0-9\-+]+);base64,/i);
  if (!match) {
    return {
      valid: false,
      error: "Invalid photo format. Photos must be base64-encoded data URLs.",
    };
  }

  // Check if MIME type is allowed
  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_PHOTO_MIMES.has(mimeType)) {
    return {
      valid: false,
      error: `Invalid photo type: ${mimeType}. Allowed types: JPEG, PNG, WebP, GIF.`,
    };
  }

  return { valid: true, mimeType };
}
