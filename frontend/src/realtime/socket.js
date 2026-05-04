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
    console.log("[socket] beforeunload: sending presence:disconnect and disconnecting");
    try {
      socket.emit("presence:disconnect");
      socket.disconnect();
    } catch (err) {
      console.error("[socket] beforeunload error:", err);
    }
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
        "You no longer have access to this conversation or the connection was closed.\n\n"      );
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
        (err?.message || "Unknown error")
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
  console.log("[socket] disconnectRealtime called");
  if (pingIntervalId) {
    window.clearInterval(pingIntervalId);
    pingIntervalId = null;
  }
  const s = socket;
  if (s && s.connected) {
    console.log("[socket] emitting presence:disconnect");
    try {
      s.emit("presence:disconnect");
    } catch (err) {
      console.error("[socket] emit presence:disconnect error:", err);
    }
    try {
      console.log("[socket] calling disconnect");
      s.disconnect();
    } catch (err) {
      console.error("[socket] disconnect error:", err);
    }
  } else {
    console.log("[socket] socket not connected, skipping emit/disconnect");
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
