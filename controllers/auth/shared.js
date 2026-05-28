const { createRealtimeToken } = require("../../realtime/authToken");
const {
  authLimiter,
  authSensitiveLimiter,
} = require("../../middleware/rateLimit");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../../utils/emailService");

/*  Return the frontend base URL for constructing links in emails */
function getFrontendBaseUrl() {
  return process.env.FRONTEND_BASE_URL || "http://localhost:5173";
}

/* Email delivery status */
function buildEmailDeliveryFromResult(emailResult) {
  return {
    sent: true,
    message_id: emailResult.messageId,
    preview_url: emailResult.previewUrl || null,
  };
}

/* Build a failed email delivery response */
function buildFailedEmailDelivery(reason) {
  return {
    sent: false,
    reason,
  };
}

module.exports = {
  createRealtimeToken,
  authLimiter,
  authSensitiveLimiter,
  sendVerificationEmail,
  sendPasswordResetEmail,
  getFrontendBaseUrl,
  buildEmailDeliveryFromResult,
  buildFailedEmailDelivery,
};