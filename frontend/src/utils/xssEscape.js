/* ========== Escape HTML special characters to prevent XSS attacks ========== */
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
  
  return String(text).replace(/[&<>"'/]/g, (char) => map[char]);
}

/* ========== Sanitize text by trimming and escaping HTML ========== */
export function sanitizeText(text) {
  if (!text) return "";
  
  return escapeHtml(String(text).trim());
}

export default {
  sanitizeText,
};
