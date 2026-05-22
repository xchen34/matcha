const bcrypt = require("bcrypt");
const authService = require("../../services/authService");

async function deleteAccount(req, res, next) {
  try {
    const currentUserId = Number(req.header("x-user-id"));
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const rawPassword = typeof req.body?.password === "string" ? req.body.password : "";

    if ((!Number.isInteger(currentUserId) || currentUserId <= 0) && !rawEmail) {
      return res
        .status(400)
        .json({ error: "x-user-id header or email is required" });
    }
    if (!rawPassword) {
      return res.status(400).json({ error: "password is required" });
    }

    const user = await authService.findUserForDeletion(currentUserId, rawEmail);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (/\s/.test(rawPassword)) {
      return res
        .status(400)
        .json({
          error:
            "password must not contain spaces, tabs, or other whitespace characters",
        });
    }

    const isPasswordValid = await bcrypt.compare(
      rawPassword,
      user.password_hash,
    );
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    await authService.deleteUser(user.id);

    return res.json({ message: "Account deleted successfully" });
  } catch (error) {
    return next(error);
  }
}

module.exports = { deleteAccount };
