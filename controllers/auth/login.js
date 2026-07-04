const bcrypt = require("bcrypt");
const authService = require("../../services/authService");
const { createRealtimeToken } = require("./shared");
const { isProfileCompleted } = require("./helpers");
const { REALTIME_TOKEN_TTL_SECONDS } = require("../../realtime/authToken");

async function login(req, res, next) {
  try {
    const demoAutoVerifyUsers =
      String(process.env.DEMO_AUTO_VERIFY_USERS || "").trim().toLowerCase() ===
      "true";
    const { username, password } = req.body;
    const identifier = typeof username === "string" ? username.trim() : "";
    const rawPassword = typeof password === "string" ? password : "";

    // Check required fields
    if (!identifier || !rawPassword) {
      return res.status(400).json({ 
        error: "Username and password are required" 
      });
    }

    // Check user existence and password validity
    const user = await authService.findUserForLogin(identifier);
    if (!user) {
      return res.status(401).json({ 
        error: "Invalid username or password" 
      });
    }

    const isPasswordValid = await bcrypt.compare(rawPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: "Invalid username or password" 
      });
    }

    // Check if email is verified
    if (!user.email_verified && !demoAutoVerifyUsers) {
      return res.status(403).json({
        error:
          "Email not verified. Please check your email and click the verification link to complete registration.",
        requires_email_verification: true,
        email: user.email,
      });
    }

    // Update last seen timestamp for connectivity and activity tracking
    await authService.updateLastSeen(user.id);

    return res.json({
      message: "Login successful",
      realtime_token_expires_in: REALTIME_TOKEN_TTL_SECONDS,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email_verified: user.email_verified,
        profile_completed: isProfileCompleted(user),
        created_at: user.created_at,
        realtime_token: createRealtimeToken(user.id),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { login };
