import { io } from "socket.io-client";

let socket = null;
let pingIntervalId = null;
const activeConversationIds = new Set();

function ensureSocket() {
  if (socket) return socket;

  // Connect explicitly to backend server (port 3000)
  socket = io("http://localhost:3000", {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: false,
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

  socket.on("disconnect", (reason) => {
    if (isUnloading) return;
    if (reason === "io server disconnect") {
      alert(
        "You no longer have access to this conversation or the connection was closed.\n\n" +
          "Vous n'avez plus accès à cette conversation ou la connexion a été coupée.",
      );
    }
    // Tentative de reconnexion automatique si la connexion a été perdue
    if (!isUnloading && reason !== "io client disconnect") {
      setTimeout(() => {
        if (socket && !socket.connected) {
          socket.connect();
        }
      }, 2000);
    }
  });

  // Gestion des erreurs de connexion
  socket.on("connect_error", (err) => {
    if (isUnloading) return;
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
