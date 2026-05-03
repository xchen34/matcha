import { io } from "socket.io-client";

let socket = null;
let pingIntervalId = null;
const activeConversationIds = new Set();
let reconnectErrorCount = 0;
let reconnectErrorWindowStart = 0;

function ensureSocket() {
  if (socket) return socket;

  const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;
  const socketUrl = configuredSocketUrl ? configuredSocketUrl.trim() : undefined;

  // Use same-origin by default so Vite/Nginx proxies can route /socket.io.
  socket = io(socketUrl, {
    path: "/socket.io",
    transports: ["websocket"],
    upgrade: false,
    autoConnect: false,
    reconnection: true,
  });

  socket.on("connect", () => {
    for (const conversationId of activeConversationIds) {
      socket.emit("chat:conversation:join", {
        conversation_id: conversationId,
      });
    }
  });

  let isUnloading = false;
  window.addEventListener("beforeunload", () => {
    isUnloading = true;
  });

  socket.on("connect", () => {
    reconnectErrorCount = 0;
    reconnectErrorWindowStart = 0;
  });

  socket.on("disconnect", (reason) => {
    if (isUnloading) return;
    if (reason === "io server disconnect") {
      console.warn("realtime.disconnect", { reason });
      alert(
        "You no longer have access to this conversation or the connection was closed.\n\n" +
          "Vous n'avez plus accès à cette conversation ou la connexion a été coupée.",
      );
    }
  });

  // Manage connection errors and show an alert if there are multiple within a short time frame
  socket.on("connect_error", (err) => {
    if (isUnloading) return;
    console.error("Real-time connection error:", err);

    // Ignore noisy transient failures during initial page refresh/reconnect.
    const now = Date.now();
    if (!reconnectErrorWindowStart || now - reconnectErrorWindowStart > 15000) {
      reconnectErrorWindowStart = now;
      reconnectErrorCount = 0;
    }
    reconnectErrorCount += 1;

    if (reconnectErrorCount < 3) return;

    alert(
      "Real-time connection failed: " +
        (err?.message || "Unknown error") +
        "\n\nConnexion temps réel impossible: " +
        (err?.message || "Erreur inconnue"),
    );
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

export function joinConversationRoom(conversationId) {
  const id = Number(conversationId);
  if (!Number.isInteger(id) || id <= 0) return;
  activeConversationIds.add(id);
  const s = ensureSocket();
  s.emit("chat:conversation:join", { conversation_id: id });
}

export function leaveConversationRoom(conversationId) {
  const id = Number(conversationId);
  if (!Number.isInteger(id) || id <= 0) return;
  activeConversationIds.delete(id);
  const s = ensureSocket();
  s.emit("chat:conversation:leave", { conversation_id: id });
}
