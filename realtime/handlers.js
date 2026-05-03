const { REALTIME_EVENTS } = require("./events");
const { onSocketConnect, onSocketDisconnect } = require("./presence");

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

function registerRealtimeSocketHandlers(io, socket) {
  const userId = socket.data.userId;
  socket.join(`user:${userId}`);

  onSocketConnect(io, userId, socket.id).catch(() => {});

  socket.on(REALTIME_EVENTS.CHAT_CONVERSATION_JOIN, (payload) => {
    const conversationId = Number(payload?.conversation_id);
    if (!Number.isInteger(conversationId) || conversationId <= 0) return;
    socket.join(`conversation:${conversationId}`);
  });

  socket.on(REALTIME_EVENTS.CHAT_CONVERSATION_LEAVE, (payload) => {
    const conversationId = Number(payload?.conversation_id);
    if (!Number.isInteger(conversationId) || conversationId <= 0) return;
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on(REALTIME_EVENTS.PRESENCE_PING, () => {
    onSocketConnect(io, userId, socket.id).catch(() => {});
  });

  socket.on("disconnect", () => {
    onSocketDisconnect(io, userId, socket.id).catch(() => {});
  });
}

module.exports = {
  parseTokenFromHandshake,
  registerRealtimeSocketHandlers,
};