const REALTIME_EVENTS = {
  PRESENCE_UPDATE: "presence:update",
  PRESENCE_PING: "presence:ping",
  NOTIFICATION_CREATED: "notification:created",
  PROFILE_UPDATED: "profile:updated",
  CHAT_MESSAGE_CREATED: "chat:message:created",
  CHAT_MESSAGE_DELETED: "chat:message:deleted",
  CHAT_CONVERSATION_READ: "chat:conversation:read",
  CHAT_BLOCK_STATUS_CHANGED: "chat:block-status:changed",
  CHAT_CONVERSATION_DELETED: "chat:conversation:deleted",
  CHAT_CONVERSATION_JOIN: "chat:conversation:join",
  CHAT_CONVERSATION_LEAVE: "chat:conversation:leave",
  MATCH_STATUS_CHANGED: "match:status:changed",
};

module.exports = {
  REALTIME_EVENTS,
};
