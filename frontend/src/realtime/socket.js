import { io } from "socket.io-client";

let socket = null;
let pingIntervalId = null;

function ensureSocket() {
  if (socket) return socket;

  socket = io({
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: false,
  });

  return socket;
}

export function connectRealtime(userId, token) {
  if (!userId) return null;
  if (!token) return null;

  const s = ensureSocket();
  s.auth = { token };

  if (!s.connected) {
    s.connect();
  }

  if (!pingIntervalId) {
    pingIntervalId = window.setInterval(() => {
      if (s.connected) {
        s.emit("presence:ping");
      }
    }, 10000);
  }

  return s;
}

export function disconnectRealtime() {
  if (pingIntervalId) {
    window.clearInterval(pingIntervalId);
    pingIntervalId = null;
  }

  if (socket) {
    socket.disconnect();
  }
}

export function onRealtimeEvent(event, handler) {
  const s = ensureSocket();
  s.on(event, handler);

  return () => {
    s.off(event, handler);
  };
}

export function getRealtimeSocket() {
  return ensureSocket();
}
