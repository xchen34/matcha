const userService = require("../../services/userService");

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }
    
    const user = await userService.updateUser(id, name, email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
}

module.exports = { updateUser };
