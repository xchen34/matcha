const pool = require("../db"); // 引入数据库连接池，用于执行用户在线状态相关的 SQL 更新。

const socketsByUser = new Map(); // 用于记录“用户ID -> 该用户所有活跃 socketId 集合(Set)”的映射关系。

/*  ========== Presence Tracking  ========== */
/**
 * 函数功能：判断指定用户当前是否在线。
 * 实现思路：只要该用户在 socketsByUser 中存在且连接数大于 0，就认为在线。
 */
function isUserOnline(userId) {
  const key = Number(userId); // 将传入的 userId 统一转成数字，避免字符串/数字键不一致。
  const current = socketsByUser.get(key); // 读取该用户当前的 socket 集合，若不存在则为 undefined。

  return Boolean(current && current.size > 0); // 有集合且集合里至少有一个连接时返回 true，否则返回 false。
}

/*  ========== Broadcast Presence Update to All Clients  ========== */
/**
 * 函数功能：向所有客户端广播某个用户的在线状态变化。
 * 广播事件名：presence:update。
 */
function emitPresence(io, userId, isOnline, lastSeenAt) {
  io.emit("presence:update", { // 通过 Socket.IO 广播统一的在线状态更新事件。
    user_id: Number(userId), // 对外统一输出数字类型 user_id。
    is_online: Boolean(isOnline), // 对外统一输出布尔类型在线状态。
    last_seen_at: lastSeenAt, // 携带最近在线时间（ISO 字符串或数据库返回时间）。
  }); // 完成本次状态消息广播。
}

/*  ========== Socket Management  ========== */
/**
 * 函数功能：为某个用户注册一个新的 socket 连接。
 * 返回值：该用户当前活跃连接总数。
 */
function registerSocketForUser(userId, socketId) {
  const key = Number(userId); // 统一 userId 类型为数字键。
  const current = socketsByUser.get(key) || new Set(); // 获取用户现有连接集合；若不存在则初始化一个新集合。
  current.add(socketId); // 将当前 socketId 加入该用户的活跃连接集合。
  socketsByUser.set(key, current); // 将更新后的集合写回 Map（新建或覆盖）。

  return current.size; // 返回该用户当前活跃连接数。
}

/**
 * 函数功能：为某个用户注销一个 socket 连接。
 * 返回值：该用户注销后剩余的活跃连接总数。
 */
function unregisterSocketForUser(userId, socketId) {
  const key = Number(userId); // 统一 userId 类型为数字键。
  const current = socketsByUser.get(key); // 获取该用户当前的活跃连接集合。
  if (!current) return 0; // 若用户本就没有连接记录，直接返回 0。

  current.delete(socketId); // 从集合中移除当前断开的 socketId。
  if (current.size === 0) { // 若移除后连接数为 0，说明该用户已完全离线。
    socketsByUser.delete(key); // 清理 Map 中该用户的键，避免保留空集合。
    return 0; // 返回 0 表示无剩余连接。
  }

  socketsByUser.set(key, current); // 若仍有连接，回写集合以保持最新状态。

  return current.size; // 返回剩余连接数。
}

/*  ========== Update Last Seen Timestamp  ========== */
/**
 * 函数功能：更新用户的 last_seen_at 为数据库当前时间。
 * 用途：在连接/断开等关键时机刷新“最近在线时间”。
 */
async function touchLastSeen(userId) {
  await pool.query( // 执行参数化 SQL，避免字符串拼接带来的风险。
    `
    UPDATE users
    SET last_seen_at = NOW()
    WHERE id = $1
    `,
    [userId], // 将 userId 作为 SQL 参数传入 $1。
  ); // 等待数据库更新完成。
}

/*  ========== Handle Socket Connect/Disconnect  ========== */
/**
 * 函数功能：处理用户 socket 连接建立事件。
 * 核心行为：注册连接、尝试更新 last_seen_at、首次上线时广播在线状态。
 */
async function onSocketConnect(io, userId, socketId) {
  const totalSockets = registerSocketForUser(userId, socketId); // 记录新连接并拿到该用户当前总连接数。

  try {
    await touchLastSeen(userId); // 尝试刷新最近在线时间。
  } catch {
    // 即使数据库写入失败，也不影响实时通道继续工作。
  }

  if (totalSockets === 1) { // 仅当这是该用户的第一个活跃连接时才广播“上线”，避免重复广播。
    emitPresence(io, userId, true, new Date().toISOString()); // 广播该用户上线，并附带当前时间。
  }
}

/**
 * 函数功能：处理用户 socket 断开事件。
 * 核心行为：注销连接；仅在“最后一个连接断开”时更新 last_seen_at 并广播离线状态。
 */
async function onSocketDisconnect(io, userId, socketId) {
  const totalSockets = unregisterSocketForUser(userId, socketId); // 注销当前断开的连接并获取剩余连接数。
  console.log(`[onSocketDisconnect] userId=${userId}, socketId=${socketId}, totalSockets=${totalSockets}`); // 输出断开事件调试日志。
  if (totalSockets > 0) return; // 若还有其他连接在线，则不广播离线，直接结束。

  let lastSeenAt = new Date().toISOString(); // 先给一个兜底时间，防止数据库更新失败时为空。
  try {
    const result = await pool.query( // 更新数据库并返回最新的 last_seen_at。
      `
      UPDATE users
      SET last_seen_at = NOW()
      WHERE id = $1
      RETURNING last_seen_at
      `,
      [userId], // 传入目标用户 ID。
    );
    if (result.rowCount > 0 && result.rows[0].last_seen_at) { // 确保数据库确实返回了有效时间。
      lastSeenAt = result.rows[0].last_seen_at; // 用数据库返回的权威时间覆盖兜底值。
    }
  } catch (err) {
    console.error(`[onSocketDisconnect error] userId=${userId}:`, err); // 打印错误日志，便于排查数据库写入异常。
  }

  console.log(`[emitPresence OFFLINE] userId=${userId}, isOnline=false, lastSeenAt=${lastSeenAt}`); // 输出离线广播前的调试日志。
  emitPresence(io, userId, false, lastSeenAt); // 广播该用户离线状态及最后在线时间。
}

module.exports = {
  isUserOnline, // 导出在线判断函数供其他模块调用。
  onSocketConnect, // 导出连接事件处理函数。
  onSocketDisconnect, // 导出断开事件处理函数。
}; // 导出 presenceService 对外 API。
