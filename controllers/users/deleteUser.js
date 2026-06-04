const userService = require("../../services/userService");

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await userService.deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { deleteUser };
