const { Server } = require("socket.io"); // 引入 Socket.IO 服务端构造器，用于创建实时通信服务器。
const { REALTIME_EVENTS } = require("./events"); // 引入统一事件常量，供外部模块复用。
const {
  parseTokenFromHandshake,
  registerRealtimeSocketHandlers,
} = require("./handlers"); // 引入握手 token 提取与连接事件注册逻辑。
const { verifyRealtimeToken } = require("./authToken"); // 引入实时 token 校验函数。

let ioInstance = null; // 保存全局唯一的 Socket.IO 实例，避免重复初始化。

/**
 * 函数功能：初始化实时服务并返回 Socket.IO 实例。
 * 核心职责：
 * 1) 创建 io 实例并绑定到 HTTP server；
 * 2) 注册连接鉴权中间件；
 * 3) 在连接建立后挂载业务事件处理器。
 */
function initRealtime(server) {
  if (ioInstance) return ioInstance; // 若已初始化过，直接返回已有实例（单例复用）。

  ioInstance = new Server(server, { // 创建 Socket.IO 服务端并绑定到底层 HTTP 服务器。
    cors: {
      origin: "http://localhost:5173", // 允许前端开发地址跨域连接。
      methods: ["GET", "POST"], // 允许握手/轮询相关 HTTP 方法。
      credentials: true, // 允许携带凭证（如 cookie）。
    },
  });

  ioInstance.use((socket, next) => { // 为每个新连接注册鉴权中间件。
    const token = parseTokenFromHandshake(socket); // 从握手 auth/header 中提取 token。
    const claims = verifyRealtimeToken(token); // 校验 token 签名、过期时间与载荷。
    if (!claims?.userId) { // 若无有效用户身份，拒绝该连接。
      return next(new Error("Unauthorized socket"));
    }

    socket.data.userId = claims.userId; // 将认证后的 userId 挂到 socket.data 供后续处理使用。
    return next(); // 鉴权通过，继续建立连接。
  });

  ioInstance.on("connection", (socket) => { // 监听连接成功事件。
    registerRealtimeSocketHandlers(ioInstance, socket); // 为当前连接注册 presence/chat 等业务事件。
  });

  return ioInstance; // 返回初始化后的 io 实例。
}

/**
 * 函数功能：获取当前 Socket.IO 实例。
 * 返回值：若已初始化返回实例，否则返回 null。
 */
function getIO() {
  return ioInstance; // 供业务模块（通知、聊天、资料更新等）发实时事件使用。
}

module.exports = {
  initRealtime, // 导出初始化函数。
  getIO, // 导出实例获取函数。
  REALTIME_EVENTS, // 导出事件常量，方便统一引用。
}; // 导出 realtime 模块公共接口。

/**
 * 学习笔记（保留）：Realtime 鉴权与事件机制速记
 *
 * 一、parseTokenFromHandshake 返回什么
 * - 位置：realtime/handlers.js
 * - 返回 string：提取到 token（优先 socket.handshake.auth.token，其次 Authorization: Bearer xxx）
 * - 返回 null：两处都未拿到可用 token
 *
 * 二、verifyRealtimeToken 返回什么
 * - 位置：realtime/authToken.js
 * - 返回 { userId, exp }：签名正确、未过期、sub 合法
 * - 返回 null：token 缺失/格式错误/签名不对/JSON 解析失败/过期/sub 非法
 *
 * 三、socket.on / socket.emit / io.emit / io.to(...).emit 区别
 * - socket.on("事件名", handler)：监听事件（接收并处理）
 * - socket.emit("事件名", 数据)：通过“当前连接”发事件
 * - io.emit("事件名", 数据)：服务端向所有已连接客户端广播
 * - io.to("room").emit("事件名", 数据)：服务端向指定房间广播
 *
 * 四、socket.emit(...) 常见语境
 * - 前端里：当前客户端发给服务端
 * - 后端里：服务端仅发给这个特定 socket 连接
 */
