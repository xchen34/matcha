const userService = require("../../services/userService");

async function getAllUsers(req, res, next) {
  try {
    const users = await userService.getAllUsers();
    
    res.json(users);
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllUsers };
