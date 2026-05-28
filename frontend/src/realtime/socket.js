import { io } from "socket.io-client";

let socket = null;
let pingIntervalId = null;
const activeConversationIds = new Set();
let reconnectErrorCount = 0;
let reconnectErrorWindowStart = 0;

/* ========== SOCKET INITIALIZATION - Configuration and global event handlers ========== */
function ensureSocket() {
  if (socket) return socket;

  const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;
  const socketUrl = configuredSocketUrl ? configuredSocketUrl.trim() : undefined;

  socket = io(socketUrl, {
    path: "/socket.io",
    transports: ["websocket"],
    upgrade: false,
    autoConnect: false,
    reconnection: true,
  });

  // Reconnection - rejoin all active conversations
  socket.on("connect", () => {
    for (const conversationId of activeConversationIds) {
      socket.emit("chat:conversation:join", {
        conversation_id: conversationId,
      });
    }
  });

  // Page unload - graceful disconnect
  let isUnloading = false;
  window.addEventListener("beforeunload", () => {
    isUnloading = true;
    //console.log("[socket] beforeunload: sending presence:disconnect and disconnecting");
    try {
      socket.emit("presence:disconnect");
      socket.disconnect();
    } catch (err) {
      console.error("[socket] beforeunload error:", err);
    }
  });

  // Connected - reset error counters
  socket.on("connect", () => {
    reconnectErrorCount = 0;
    reconnectErrorWindowStart = 0;
  });

  // Disconnected - alert user if access lost
  socket.on("disconnect", (reason) => {
    if (isUnloading) return;
    if (reason === "io server disconnect") {
      console.warn("realtime.disconnect", { reason });
      alert(
        "You no longer have access to this conversation or the connection was closed.\n\n"      );
    }
  });

  // Connection error - alert after multiple failures
  socket.on("connect_error", (err) => {
    if (isUnloading) return;
    console.error("Real-time connection error:", err);
    const message = String(err?.message || "");

    // Unauthorized is handled by token refresh / relogin flow in hooks.
    if (message.includes("Unauthorized")) {
      return;
    }

    // Ignore transient errors during initial page load (15s grace period)
    const now = Date.now();
    if (!reconnectErrorWindowStart || now - reconnectErrorWindowStart > 15000) {
      reconnectErrorWindowStart = now;
      reconnectErrorCount = 0;
    }
    reconnectErrorCount += 1;

    if (reconnectErrorCount < 3) return;

    alert(
      "Real-time connection failed: " +
        (err?.message || "Unknown error")
    );
  });

  return socket;
}

/* ========== Real-time connection management ========== */
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
  //console.log("[socket] disconnectRealtime called");
  if (pingIntervalId) {
    window.clearInterval(pingIntervalId);
    pingIntervalId = null;
  }

  const s = socket;
  if (s && s.connected) {
    //console.log("[socket] emitting presence:disconnect");
    try {
      s.emit("presence:disconnect");
    } catch (err) {
      console.error("[socket] emit presence:disconnect error:", err);
    }
    try {
      //console.log("[socket] calling disconnect");
      s.disconnect();
    } catch (err) {
      console.error("[socket] disconnect error:", err);
    }
  } else {
    //console.log("[socket] socket not connected, skipping emit/disconnect");
  }
}

/* ========== Event subscription ========== */
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

/* ========== Conversation room management ========== */
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
