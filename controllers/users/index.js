const { getAllUsers } = require("./getAllUsers");
const { getUserById } = require("./getUserById");
const { createUser } = require("./createUser");
const { updateUser } = require("./updateUser");
const { deleteUser } = require("./deleteUser");

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
