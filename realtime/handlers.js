const { REALTIME_EVENTS } = require("./events");
const { onSocketConnect, onSocketDisconnect } = require("../services/presenceService");

/* ========== Parses an auth token from the socket handshake, checking both the auth payload and Authorization header. ========== */
function parseTokenFromHandshake(socket) {
  const fromAuth = socket.handshake?.auth?.token;
  if (typeof fromAuth === "string" && fromAuth.trim().length > 0) {
    return fromAuth.trim();
  }

  const authHeader = socket.handshake?.headers?.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return null;
}
/**
 * 
 * 先看 socket.handshake.auth.token
只有第1个没有有效值时，才看 Authorization: Bearer ... header
两个都没有就返回 null
差别是“放 token 的位置不同”：

handshake.auth.token
这是 Socket.IO 客户端专门的认证字段。你前端就是这样传的：s.auth = { token }（见你的 frontend/src/realtime/socket.js）。这是 Socket.IO 场景里最常见、最直接的方式。

Authorization: Bearer xxx
这是 HTTP 世界通用的认证头格式。Socket.IO 握手本质经过 HTTP，所以也可以从 header 带过来。通常用于兼容已有网关/代理/通用鉴权方案。

所以你这段代码本质是“双通道兼容”：优先吃 Socket.IO 的 auth.token，兜底再吃标准 Bearer header。} io 
 * Bearer 是 Authorization 请求头里的“令牌类型标记”。
常见格式是：
Authorization: Bearer <token>
含义是：
“谁持有这个 token，谁就被当作已认证身份”
所以叫 bearer（持有者）。服务端会验证这个 token 是否有效、是否过期、是否被篡改。 
不是“第一次登录自动带”，而是：

先登录
登录成功后后端发你 token（或你再请求一个 realtime token）
前端把 token 存起来
之后每次发受保护请求/建立 socket 连接时主动带上
*/

// 里面的代码只针对当前这个连接的用户
/* ========== Register common socket event handlers for presence and conversation room management ========== */
function registerRealtimeSocketHandlers(io, socket) {  //io参数是Socket.IO服务器实例，socket参数是当前连接的socket对象，这个函数用于注册一些通用的事件处理器，管理用户的在线状态和聊天室的加入/离开等逻辑
  const userId = socket.data.userId;

  // Join a per-user room so we can emit user-targeted events. 每个用户加入一个以 userId 命名的房间，这样服务器就可以向特定用户发送消息（io.to(`user:${userId}`).emit(...)），而不需要维护单独的用户连接映射表，Socket.IO 会帮我们管理这个房间和成员关系。注意这里的房间名是 `user:${userId}`，加了前缀以避免和其他类型的房间（如 conversation:123）冲突。
  socket.join(`user:${userId}`); //创建一个叫 user:123 的房间，把当前用户拉进去。

  // Mark/connect presence on initial registration. 当用户通过验证并成功连接后，调用 onSocketConnect 函数标记用户在线状态，通常会在数据库或内存中记录这个 userId 和 socket.id 的映射关系，以便后续知道这个用户有哪些活跃连接。这里的 catch(() => {}) 是为了防止 onSocketConnect 内部发生错误时影响到整个连接流程，确保即使标记在线失败了，用户仍然可以正常使用其他功能。
  onSocketConnect(io, userId, socket.id).catch(() => {});

  // Join conversation room (validates conversation id)
  socket.on(REALTIME_EVENTS.CHAT_CONVERSATION_JOIN, (payload) => {
    const conversationId = Number(payload?.conversation_id);
    if (!Number.isInteger(conversationId) || conversationId <= 0) return;
    socket.join(`conversation:${conversationId}`);
  });

  // Leave conversation room
  socket.on(REALTIME_EVENTS.CHAT_CONVERSATION_LEAVE, (payload) => {
    const conversationId = Number(payload?.conversation_id);
    if (!Number.isInteger(conversationId) || conversationId <= 0) return;
    socket.leave(`conversation:${conversationId}`);
  });

  // Presence ping (refresh connection state)
  socket.on(REALTIME_EVENTS.PRESENCE_PING, () => {
    onSocketConnect(io, userId, socket.id).catch(() => {});
  });

  // Explicit presence disconnect from the client
  socket.on(REALTIME_EVENTS.PRESENCE_DISCONNECT, () => {
    console.log(`[presence:disconnect] userId=${userId}, socketId=${socket.id}`);
    onSocketDisconnect(io, userId, socket.id).catch((err) => {
      console.error(`[presence:disconnect error] userId=${userId}:`, err);
    });
  });

  // Socket closed (network/cleanup) -> treat like presence disconnect
  socket.on("disconnect", () => {
    console.log(`[socket.disconnect] userId=${userId}, socketId=${socket.id}`);
    onSocketDisconnect(io, userId, socket.id).catch(() => {});
  });
}

module.exports = {
  parseTokenFromHandshake,
  registerRealtimeSocketHandlers,
};