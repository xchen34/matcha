const userService = require("../../services/userService");

async function createUser(req, res, next) {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }
    const user = await userService.createUser(name, email);
    
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

module.exports = { createUser };
