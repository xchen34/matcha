const express = require("express");
const {
  register,
  login,
  logout,

  getRealtimeToken,

  verifyEmail,
  requestEmailChange,
  resendVerificationEmail,
  
  forgotPassword,
  resetPassword,
  
  deleteAccount,
  
  authLimiter,
  authSensitiveLimiter,
} = require("../controllers/auth");

const { requireAuth } = require("../middleware/auth");

const router = express.Router(); //router 是一个独立的 Express 应用实例，可以定义自己的路由和中间件。最后通过 module.exports 导出，供 app.js 挂载使用。

/*  ---------------- AUTHENTICATION  ---------------- */
router.post("/auth/register", authLimiter, register);
router.post("/auth/login", authSensitiveLimiter, login);
router.post("/auth/logout", requireAuth, logout);

/*  ---------------- REALTIME TOKEN  ---------------- */
router.get("/auth/realtime-token", requireAuth, getRealtimeToken);

/*  ---------------- EMAIL VERIFICATION  ---------------- */
router.post("/auth/verify-email", authLimiter, verifyEmail);
router.post("/auth/request-email-change", requireAuth, authSensitiveLimiter, requestEmailChange);
router.post("/auth/resend-verification-email", authSensitiveLimiter, resendVerificationEmail);

/*  ---------------- PASSWORD RESET  ---------------- */
router.post("/auth/forgot-password", authSensitiveLimiter, forgotPassword);
router.post("/auth/reset-password", authSensitiveLimiter, resetPassword);

/*  ---------------- ACCOUNT DELETION  ---------------- */
router.delete("/auth/delete-account", requireAuth, authSensitiveLimiter, deleteAccount);

module.exports = router;

