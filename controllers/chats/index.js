const { getConversations } = require("./getConversations");
const { createConversation } = require("./createConversation");
const { deleteConversation } = require("./deleteConversation");
const { getMessages } = require("./getMessages");
const { sendMessage } = require("./sendMessage");
const { markRead } = require("./markRead");
const { deleteMessage } = require("./deleteMessage");

// chats 控制器总入口：把具体的聊天 API handler 统一导出给路由层使用。
module.exports = {
  getConversations,
  createConversation,
  deleteConversation,
  getMessages,
  sendMessage,
  markRead,
  deleteMessage,
};
