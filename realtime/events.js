const REALTIME_EVENTS = {
  PRESENCE_UPDATE: "presence:update",
  PRESENCE_PING: "presence:ping",
  PRESENCE_DISCONNECT: "presence:disconnect",
  
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

/**
 * socket.emit("presence:update", data) 的含义
socket.emit 是 Socket.IO 提供的方法，用于向连接的客户端发送一个事件和相关数据。
"presence:update" 是事件的名称，表示这是一个关于用户在线状态更新的事件。这个字符串可以自定义，但前后端需要约定一致。
data 是要发送的数据，可以是任何 JavaScript 对象，通常包含了用户的在线状态、最后活跃时间等信息。
 * 通过这个连接（socket），发出一个叫"presence:update"的事件，附带的数据是 data
 * 为什么有大写常量？（两行代码对比）
js
// ✅ 直接写小写（完全正确，能运行）
socket.emit("presence:update", data)

// ✅ 用大写常量（结果一模一样）
socket.emit(REALTIME_EVENTS.PRESENCE_UPDATE, data)
两者执行后，网络上传输的东西完全相同：
都是字符串 "presence:update"

四、那何必多此一举？（唯一原因：防止写错）
如果你直接写小写，在 100 个地方写：

冒号 : 只是一个普通字符
"presence:update"

"presence.update"

"presence_update"

"presence-update"

都可以，前后端约定一致就行。
很多人用冒号是因为后端数据库（Redis）习惯用冒号分隔。
 */
