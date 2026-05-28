const bcrypt = require("bcrypt");
const authService = require("../../services/authService");
const { normalizeString } = require("./helpers");

/* Deletes the user's account after verifying their password */
async function deleteAccount(req, res, next) {
  try {
    const currentUserId = req.userId;
    const rawEmail = normalizeString(req.body.email).toLowerCase();
    const rawPassword =
      typeof req.body?.password === "string" ? req.body.password : "";

    // Auth checks
    if (!currentUserId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    if (!rawPassword) {
      return res.status(400).json({
        error: "Password is required",
      });
    }

    const user = await authService.findUserForDeletion(currentUserId, rawEmail);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Verify password
    if (/\s/.test(rawPassword)) {
      return res.status(400).json({
        error:
          "Password must not contain spaces, tabs, or other whitespace characters",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      rawPassword,
      user.password_hash,
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid password",
      });
    }

    // Delete the user account
    await authService.deleteUser(user.id);

    return res.json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { deleteAccount };
