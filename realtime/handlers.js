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


/* ========== Register common socket event handlers for presence and conversation room management ========== */
function registerRealtimeSocketHandlers(io, socket) {
  const userId = socket.data.userId;

  // Join a per-user room so we can emit user-targeted events.
  socket.join(`user:${userId}`);

  // Mark/connect presence on initial registration.
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