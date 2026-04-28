const { authLimiter, authSensitiveLimiter } = require("./shared");
const { register } = require("./register");
const { login } = require("./login");
const { getRealtimeToken } = require("./token");
const { verifyEmail, requestEmailChange, resendVerificationEmail } = require("./verification");
const { forgotPassword, resetPassword } = require("./password");
const { deleteAccount } = require("./account");

module.exports = {
  register,
  login,
  getRealtimeToken,
  verifyEmail,
  requestEmailChange,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  deleteAccount,
  authLimiter,
  authSensitiveLimiter,
};