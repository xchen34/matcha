/**
 * XSS (Cross-Site Scripting) escaping utilities
 * Use these functions to escape user-generated content before displaying it
 */

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} - Escaped text safe for HTML display
 */
export function escapeHtml(text) {
  if (!text) return "";
  
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  
  return String(text).replace(/[&<>"'\/]/g, (char) => map[char]);
}

/**
 * Strip HTML tags (more aggressive than escapeHtml)
 * Use this when you want only plain text
 * @param {string} html - The HTML text to strip
 * @returns {string} - Plain text without any HTML tags
 */
export function stripHtmlTags(html) {
  if (!html) return "";
  return String(html).replace(/<[^>]*>/g, "");
}

/**
 * Sanitize text for safe display in text nodes
 * This is the most common use case - escapes HTML and trims
 * @param {string} text - The text to sanitize
 * @returns {string} - Safe text for display
 */
export function sanitizeText(text) {
  if (!text) return "";
  return escapeHtml(String(text).trim());
}

/**
 * Truncate text to a maximum length and add ellipsis if needed
 * Also escapes HTML to prevent XSS
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} - Truncated and escaped text
 */
export function truncateAndEscape(text, maxLength = 100) {
  if (!text) return "";
  const sanitized = sanitizeText(text);
  if (sanitized.length <= maxLength) return sanitized;
  return sanitized.substring(0, maxLength) + "…";
}

/**
 * Validate and escape user input for profile fields
 * @param {string} input - The input to validate
 * @param {object} options - Validation options
 * @returns {string} - Validated and escaped text
 */
export function validateAndEscape(input, options = {}) {
  const {
    maxLength = 500,
    allowLineBreaks = true,
  } = options;
  
  if (!input) return "";
  
  let text = String(input).trim();
  
  // Remove multiple spaces
  text = text.replace(/\s+/g, " ");
  
  // Optionally normalize line breaks
  if (!allowLineBreaks) {
    text = text.replace(/[\n\r]/g, " ");
  }
  
  // Truncate if needed
  if (text.length > maxLength) {
    text = text.substring(0, maxLength);
  }
  
  // Escape HTML
  return escapeHtml(text);
}

export default {
  escapeHtml,
  stripHtmlTags,
  sanitizeText,
  truncateAndEscape,
  validateAndEscape,
};
