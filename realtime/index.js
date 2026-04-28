const { Server } = require("socket.io");
const { REALTIME_EVENTS } = require("./events");
const {
  parseTokenFromHandshake,
  registerRealtimeSocketHandlers,
} = require("./handlers");
const { verifyRealtimeToken } = require("./authToken");

let ioInstance = null;

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
    registerRealtimeSocketHandlers(ioInstance, socket);
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
