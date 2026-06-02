import { io } from "socket.io-client";

/**
 * 这个文件的定位（底层）：
 * - 它只负责“Socket 连接本身怎么运转”。
 * - 它不关心用户怎么登录，也不负责去接口刷新 token。
 * - 上层（useRealtimeConnection）会在合适时机把 userId + token 交给它。
 */

// 全局单例：整个前端应用只维护一个 socket 连接实例。
let socket = null;

// 心跳定时器 ID：用于定时发送在线心跳（presence:ping）。
let pingIntervalId = null;

// 当前已加入的会话房间集合：断线重连后自动 rejoin。
// 例如用户正在看会话 12 和 34，重连后会自动重新进入这两个房间。
const activeConversationIds = new Set(); 

// 连接错误统计：用于“短时间多次失败再提示”，减少误报和打扰。
let reconnectErrorCount = 0;
let reconnectErrorWindowStart = 0;

/* ========== SOCKET 初始化（配置 + 全局监听） ========== */
function ensureSocket() {
  // 如果已经创建过 socket，直接返回，避免重复注册事件。
  if (socket) return socket;

  // 可选配置项：允许通过 VITE_SOCKET_URL 指向独立 realtime 域名。
  // 未配置时，socket.io-client 默认连接当前页面同源地址。
  const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;
  const socketUrl = configuredSocketUrl ? configuredSocketUrl.trim() : undefined;

  // 创建 Socket.IO 客户端实例，配置项详见官方文档。
//   io(...) 创建一个 socket 实例对象
// socket.connect() 后，这个实例建立实际连接
// 之后这个实例一直管理该连接（重连、发事件、收事件、断开）
// 所以：实例是连接管理器；连接是这个实例当前的网络状态。
// 后端创建的是 Socket.IO 服务器实例（监听连接）
// 前端创建的是 Socket.IO 客户端实例（发起连接）

  socket = io(socketUrl, {
    path: "/socket.io", // 必须与服务端 Socket.IO path 一致。
    transports: ["websocket"], // 只允许 Socket.IO 用 WebSocket 这一种传输方式，不走 long-polling。WebSocket：先握手一次，之后保持长连接，双向实时通信。long-poling：不断发 HTTP 请求“轮询”更新，开销更大
    upgrade: false, // 因为 transports 已固定 websocket，无需升级过程。
    autoConnect: false, // 先设置 auth.token，再手动 connect，避免“空 token 握手”。
    reconnection: true, // 允许 Socket.IO 自动重连。
  });

  // 连接成功（首次连接或重连）后：重新加入活跃会话房间。
  // 这一步解决“网络抖动后收不到当前聊天消息”的问题。
  socket.on("connect", () => {
    for (const conversationId of activeConversationIds) {
      socket.emit("chat:conversation:join", {
        conversation_id: conversationId,
      });
    }
  });

  // 页面关闭/刷新时做“优雅断开”：
  // 1) 告诉后端我离线了（presence:disconnect）
  // 2) 主动断开 socket
  let isUnloading = false;
  window.addEventListener("beforeunload", () => {
    isUnloading = true;
    try {
      socket.emit("presence:disconnect");
      socket.disconnect();
    } catch (err) {
      console.error("[socket] beforeunload error:", err);
    }
  });

  // 一旦连接恢复成功，清空错误统计窗口。
  socket.on("connect", () => {
    reconnectErrorCount = 0;
    reconnectErrorWindowStart = 0;
  });

  // 服务端主动断开时：提示用户可能被移除权限或会话被关闭。
  // 注意：如果是页面正在关闭，不需要再提示。
  socket.on("disconnect", (reason) => {
    if (isUnloading) return;
    if (reason === "io server disconnect") {
      console.warn("realtime.disconnect", { reason });
      alert(
        "You no longer have access to this conversation or the connection was closed.\n\n"
      );
    }
  });

  // 连接错误处理策略：
  // - Unauthorized：交给上层 hook 做 token 刷新/重新登录。
  // - 其他错误：15 秒内累计 >= 3 次才弹窗，防止网络瞬时波动频繁打扰。
  socket.on("connect_error", (err) => {
    if (isUnloading) return;

    console.error("Real-time connection error:", err);
    const message = String(err?.message || "");

    if (message.includes("Unauthorized")) {
      return;
    }

    // 当前时间戳（毫秒）。
    const now = Date.now();

    // 错误计数窗口逻辑：
    // - 第一次报错时，开启一个 15 秒窗口；
    // - 如果距离上次窗口起点已经超过 15 秒，说明进入“新一轮”统计，
    //   就把窗口起点重置到现在，并把错误次数清零重新计。
    if (!reconnectErrorWindowStart || now - reconnectErrorWindowStart > 15000) {
      reconnectErrorWindowStart = now;
      reconnectErrorCount = 0;
    }

    // 本次错误计入当前窗口。
    reconnectErrorCount += 1;

    // 15 秒窗口内错误次数不到 3 次：先不打扰用户，直接返回。
    if (reconnectErrorCount < 3) return;

    // 15 秒内连续 >= 3 次失败，才弹窗提示用户连接有问题。
    alert("Real-time connection failed: " + (err?.message || "Unknown error"));
  });

  return socket;
}

/* ========== 实时连接管理 ========== */
export function connectRealtime(userId, token) {
  // 缺少 userId 或 token 都不连接。
  // userId 是业务身份；token 是握手鉴权凭证。
  if (!userId) return null;
  if (!token) return null;

  const s = ensureSocket();

  // 关键点：把 token 放到握手 auth 中。
  // 后端会读取这个 token 并验签，决定是否允许连接。
  s.auth = { token };
  
  if (!s.connected) {
    s.connect(); // 手动发起连接，触发握手流程。握手成功后，连接正式建立，后续自动管理（重连、断开等）。
  }

  // 每 10 秒发送在线心跳，帮助后端维护在线状态。
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
  // 断开前先停心跳，避免定时器泄漏。
  if (pingIntervalId) {
    window.clearInterval(pingIntervalId);
    pingIntervalId = null;
  }

  const s = socket;
  if (s && s.connected) {
    // 先通知离线，再断开连接。
    try {
      s.emit("presence:disconnect");
    } catch (err) {
      console.error("[socket] emit presence:disconnect error:", err);
    }
    try {
      s.disconnect();
    } catch (err) {
      console.error("[socket] disconnect error:", err);
    }
  }
}

/* ========== 事件订阅工具 ========== */
export function onRealtimeEvent(event, handler) {
  const s = ensureSocket();
  s.on(event, handler);

  // 返回取消订阅函数（常用于 React useEffect cleanup）。
  return () => {
    s.off(event, handler);
  };
} //为什么返回一个取消订阅函数？因为在 React 组件中，我们通常在 useEffect 中订阅事件，并在 cleanup 函数中取消订阅，以避免内存泄漏和重复订阅。比如：


/* ========== 其他工具函数 ========== */
// 提供一个函数，供上层按需获取底层 socket 实例，直接调用 socket.io-client 的原生方法（如 emit、on）来发事件或监听事件。  

// 提供底层 socket 给需要直接监听底层事件的上层逻辑。
export function getRealtimeSocket() {
  return ensureSocket();
}

/* ========== 会话房间管理 ========== */
export function joinConversationRoom(conversationId) {
  const id = Number(conversationId);

  // 入参保护：只接受正整数 ID。
  if (!Number.isInteger(id) || id <= 0) return;

  // 这是一个set,用于记录当前用户已经加入的会话房间ID。当用户加入一个会话房间时，会将该房间ID添加到activeConversationIds集合中；当用户离开一个会话房间时，会将该房间ID从activeConversationIds集合中删除。这样做的目的是为了在网络抖动导致断线重连后，能够自动重新加入之前已经加入的会话房间，确保用户不会错过任何消息。
  activeConversationIds.add(id); 

  const s = ensureSocket();
  s.emit("chat:conversation:join", { conversation_id: id });
}

export function leaveConversationRoom(conversationId) {
  const id = Number(conversationId);

  if (!Number.isInteger(id) || id <= 0) return;

  // 本地取消记账：避免下次重连又自动加入这个房间。
  activeConversationIds.delete(id);

  const s = ensureSocket(); 
  s.emit("chat:conversation:leave", { conversation_id: id });
}
