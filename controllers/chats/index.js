const { getConversations } = require("./getConversations");
const { createConversation } = require("./createConversation");
const { deleteConversation } = require("./deleteConversation");
const { getMessages } = require("./getMessages");
const { sendMessage } = require("./sendMessage");
const { markRead } = require("./markRead");
const { deleteMessage } = require("./deleteMessage");

module.exports = {
  getConversations,
  createConversation,
  deleteConversation,
  getMessages,
  sendMessage,
  markRead,
  deleteMessage,
};
