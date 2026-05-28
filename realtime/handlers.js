const { REALTIME_EVENTS } = require("./events"); // 引入实时事件名常量，避免在代码中散落硬编码字符串。
const { onSocketConnect, onSocketDisconnect } = require("../services/presenceService"); // 引入在线状态服务，用于处理连接与断开时的 presence 逻辑。

/**
 * 握手与 Bearer 知识补充：
 * 1) Socket.IO 首次建连握手基于 HTTP，因此除了 socket.handshake.auth 外，也能从 HTTP Header 里取 token。
 * 2) Authorization: Bearer <token> 是通用的令牌认证格式。
 *    Bearer 表示“持有该 token 的请求方可被视为该身份”，服务端会进一步校验签名、过期时间和载荷合法性。
 * 3) 认证信息来源通常有两路：
 *    - socket.handshake.auth.token：Socket.IO 场景最常见写法。
 *    - Authorization Header：用于兼容网关/代理或通用鉴权链路。
 */
/**
 * 函数功能：从 Socket 握手信息中提取认证 token。
 * 提取顺序：优先 socket.handshake.auth.token，其次 Authorization: Bearer xxx。
 * 返回值：成功时返回 token 字符串，失败时返回 null。
 */
function parseTokenFromHandshake(socket) {
  const fromAuth = socket.handshake?.auth?.token; // 读取 Socket.IO 标准 auth 字段里的 token。
  if (typeof fromAuth === "string" && fromAuth.trim().length > 0) { // 校验 token 必须是非空字符串。
    return fromAuth.trim(); // 去掉首尾空白后返回 token。
  }

  const authHeader = socket.handshake?.headers?.authorization; // 兜底读取 HTTP Authorization 请求头。
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) { // 校验是否为 Bearer 令牌格式。
    return authHeader.slice("Bearer ".length).trim(); // 去掉 Bearer 前缀并返回纯 token。
  }

  return null; // 两种来源都没有可用 token 时返回 null。
}

/**
 * 函数功能：为当前连接注册实时事件处理器（在线状态 + 会话房间管理）。
 * 主要职责：
 * 1) 让当前连接加入用户房间；
 * 2) 初始化并维护 presence 状态；
 * 3) 处理聊天会话房间的加入/离开；
 * 4) 在显式断开或底层断连时同步离线状态。
 */
function registerRealtimeSocketHandlers(io, socket) {
  const userId = socket.data.userId; // 从鉴权中间件写入的 socket.data 里读取当前用户 ID。

  socket.join(`user:${userId}`); // 把当前连接加入用户专属房间，便于服务端按用户定向推送消息。

  onSocketConnect(io, userId, socket.id).catch(() => {}); // 首次连接时登记在线状态；即使失败也不阻塞后续实时能力。

  socket.on(REALTIME_EVENTS.CHAT_CONVERSATION_JOIN, (payload) => { // 监听“加入会话房间”事件。
    const conversationId = Number(payload?.conversation_id); // 从载荷中解析会话 ID 并转为数字。
    if (!Number.isInteger(conversationId) || conversationId <= 0) return; // 非法会话 ID 直接忽略，避免加入错误房间。
    socket.join(`conversation:${conversationId}`); // 将连接加入指定会话房间，用于接收该会话的实时消息。
  });

  socket.on(REALTIME_EVENTS.CHAT_CONVERSATION_LEAVE, (payload) => { // 监听“离开会话房间”事件。
    const conversationId = Number(payload?.conversation_id); // 从载荷中解析会话 ID 并转为数字。
    if (!Number.isInteger(conversationId) || conversationId <= 0) return; // 非法会话 ID 直接忽略。
    socket.leave(`conversation:${conversationId}`); // 将连接从指定会话房间移除。
  });

  socket.on(REALTIME_EVENTS.PRESENCE_PING, () => { // 监听心跳事件，用于刷新在线状态。
    onSocketConnect(io, userId, socket.id).catch(() => {}); // 复用连接逻辑刷新 presence，不让异常影响主流程。
  });

  socket.on(REALTIME_EVENTS.PRESENCE_DISCONNECT, () => { // 监听客户端主动上报的离线事件。
    console.log(`[presence:disconnect] userId=${userId}, socketId=${socket.id}`); // 记录主动离线日志便于排查。
    onSocketDisconnect(io, userId, socket.id).catch((err) => { // 执行离线登记与广播。
      console.error(`[presence:disconnect error] userId=${userId}:`, err); // 记录离线处理异常。
    });
  });

  socket.on("disconnect", () => { // 监听底层连接断开事件（网络中断、刷新页面等）。
    console.log(`[socket.disconnect] userId=${userId}, socketId=${socket.id}`); // 记录断连日志便于排查。
    onSocketDisconnect(io, userId, socket.id).catch(() => {}); // 将断连按离线处理，确保 presence 状态一致。
  });
}

module.exports = {
  parseTokenFromHandshake, // 导出 token 提取函数。
  registerRealtimeSocketHandlers, // 导出实时事件注册函数。
}; // 导出 handlers 模块公共接口。
