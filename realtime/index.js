const { Server } = require("socket.io");
const { onSocketConnect, onSocketDisconnect } = require("./presence");
const { REALTIME_EVENTS } = require("./events");
const { verifyRealtimeToken } = require("./authToken");

let ioInstance = null;

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

function initRealtime(server) {
  if (ioInstance) return ioInstance;

  ioInstance = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  ioInstance.use((socket, next) => {
    const token = parseTokenFromHandshake(socket);
    const claims = verifyRealtimeToken(token);
    if (!claims?.userId) {
      return next(new Error("Unauthorized socket"));
    }

    socket.data.userId = claims.userId;
    return next();
  });

  ioInstance.on("connection", (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    onSocketConnect(ioInstance, userId, socket.id).catch(() => {});

    socket.on(REALTIME_EVENTS.PRESENCE_PING, () => {
      onSocketConnect(ioInstance, userId, socket.id).catch(() => {});
    });

    socket.on("disconnect", () => {
      onSocketDisconnect(ioInstance, userId, socket.id).catch(() => {});
    });
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

module.exports = {
  initRealtime,
  getIO,
  REALTIME_EVENTS,
};
