/**
 * Photo validation utilities for the frontend
 */

export const ALLOWED_PHOTO_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const MAX_PHOTO_SIZE_BYTES = 300 * 1024; // 300KB per photo
export const MAX_PHOTOS_COUNT = 5;
export const MAX_TOTAL_PHOTOS_SIZE_BYTES =
  MAX_PHOTO_SIZE_BYTES * MAX_PHOTOS_COUNT; // 1500KB total for 5 photos

/**
 * Validate MIME type from a File object
 * @param {File} file - The file object to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
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
      error: `File too large: ${sizeMB}MB. Maximum 300KB per photo.`,
    };
  }

  return { valid: true };
}

/**
 * Validate MIME type from a data URL string
 * @param {string} dataUrl - Base64 data URL
 * @returns {Object} { valid: boolean, mimeType?: string, error?: string }
 */
export function validatePhotoMimeType(dataUrl) {
  const match = dataUrl.match(/^data:([a-z0-9\-+]+\/[a-z0-9\-+]+);base64,/i);
  if (!match) {
    return {
      valid: false,
      error: "Invalid photo format. Photos must be base64-encoded data URLs.",
    };
  }

  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_PHOTO_MIMES.has(mimeType)) {
    return {
      valid: false,
      error: `Invalid photo type: ${mimeType}. Allowed types: JPEG, PNG, WebP, GIF.`,
    };
  }

  return { valid: true, mimeType };
}
