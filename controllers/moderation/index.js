const { getBlockedUsers } = require("./getBlockedUsers");
const { getStatus } = require("./getStatus");
const { reportUser } = require("./reportUser");
const { blockUser } = require("./blockUser");
const { unblockUser } = require("./unblockUser");

module.exports = {
  getBlockedUsers,
  getStatus,
  reportUser,
  blockUser,
  unblockUser,
};
