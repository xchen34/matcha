/**
 * Photo validation utilities for secure file handling
 * Used by both backend routes and frontend components
 */
const imageType = require("image-type");

// Allowed MIME types for photos (whitelist)
const ALLOWED_PHOTO_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_PHOTO_SIZE_BYTES = 300 * 1024; // 300KB per photo
const MAX_PHOTOS_COUNT = 5;
const MAX_TOTAL_PHOTOS_SIZE_BYTES = MAX_PHOTO_SIZE_BYTES * MAX_PHOTOS_COUNT; // 1500KB total for 5 photos

/**
 * Validate MIME type from a data URL string
 * @param {string} dataUrl - Base64 data URL (e.g., "data:image/jpeg;base64,...")
 * @returns {Object} { valid: boolean, mimeType?: string, error?: string }
 */
function validatePhotoMimeType(dataUrl) {
  // Extract MIME type from data URL format: data:image/jpeg;base64,...
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

/**
 * Validate and normalize photos array for database storage
 * @param {Array} photos - Array of photo objects { data_url, is_primary }
 * @returns {Object} { photos?: Array, error?: string }
 */
function normalizePhotosInput(photos) {
  if (photos === undefined) return null;
  if (!Array.isArray(photos)) return null;
  if (photos.length > MAX_PHOTOS_COUNT) {
    return { error: `A maximum of ${MAX_PHOTOS_COUNT} photos is allowed` };
  }
  if (photos.length === 0) return { photos: [] };

  const normalized = [];
  let totalSize = 0;
  let hasPrimary = false;

  for (const item of photos) {
    if (!item || typeof item.data_url !== "string") {
      return { error: "Each photo must include a data_url string" };
    }

    const dataUrl = item.data_url.trim();

    // Validate MIME type (data URL)
    const mimeValidation = validatePhotoMimeType(dataUrl);
    if (!mimeValidation.valid) {
      return { error: mimeValidation.error };
    }

    // Decoding base64 to check actual file content and size (security measure)
    const base64Match = dataUrl.match(/^data:[^;]+;base64,(.*)$/);
    if (!base64Match) {
      return { error: "Invalid photo format (base64 missing)" };
    }
    let buffer;
    try {
      buffer = Buffer.from(base64Match[1], "base64");
    } catch (e) {
      return { error: "Photo base64 decoding failed" };
    }

    // Check actual file type from content (not just MIME type in data URL)
    const detected = imageType(buffer);
    if (!detected || !ALLOWED_PHOTO_MIMES.has(`image/${detected.ext}`)) {
      return {
        error: `Le contenu du fichier n'est pas une image valide (${detected ? detected.ext : "inconnu"}).`,
      };
    }

    // Check individual photo size (en bytes)
    if (buffer.length > MAX_PHOTO_SIZE_BYTES) {
      return {
        error: `Photo is too large (max 300KB). Size: ${Math.round(buffer.length / 1024)}KB.`,
      };
    }

    totalSize += buffer.length;
    if (totalSize > MAX_TOTAL_PHOTOS_SIZE_BYTES) {
      return {
        error: `Total photos size exceeds limit (max ${Math.round(MAX_TOTAL_PHOTOS_SIZE_BYTES / 1024)}KB). Current: ${Math.round(totalSize / 1024)}KB.`,
      };
    }

    const isPrimary = Boolean(item.is_primary);
    if (isPrimary) hasPrimary = true;
    normalized.push({ data_url: dataUrl, is_primary: isPrimary });
  }

  // Ensure exactly one primary photo
  if (!hasPrimary && normalized.length > 0) {
    normalized[0].is_primary = true;
  } else if (hasPrimary) {
    let foundPrimary = false;
    for (const photo of normalized) {
      if (photo.is_primary) {
        if (!foundPrimary) {
          foundPrimary = true;
        } else {
          photo.is_primary = false;
        }
      }
    }
  }

  return { photos: normalized };
}

module.exports = {
  ALLOWED_PHOTO_MIMES,
  MAX_PHOTO_SIZE_BYTES,
  MAX_TOTAL_PHOTOS_SIZE_BYTES,
  MAX_PHOTOS_COUNT,
  validatePhotoMimeType,
  normalizePhotosInput,
};
