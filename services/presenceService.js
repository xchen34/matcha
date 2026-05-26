const pool = require("../db");

const socketsByUser = new Map(); //socketsByUser 是一个 Map 对象，用于跟踪每个用户当前有哪些活跃的 Socket.IO 连接。键是 userId（数字），值是一个 Set，包含所有与该用户相关联的 socketId。当用户连接时，我们会将对应的 socketId 添加到这个 Set 中；当用户断开连接时，我们会从这个 Set 中移除对应的 socketId。如果一个用户没有任何活跃连接了，我们就可以认为这个用户处于离线状态。

/*  ========== Presence Tracking  ========== */
function isUserOnline(userId) {
  const key = Number(userId);
  const current = socketsByUser.get(key); //从 socketsByUser 映射中获取当前用户的 socket 集合，如果没有则返回 undefined。socketsByUser 是一个 Map，键是 userId（数字），值是一个 Set，包含所有与该用户相关联的 socketId。

  return Boolean(current && current.size > 0);
}

/*  ========== Broadcast Presence Update to All Clients  ========== */
function emitPresence(io, userId, isOnline, lastSeenAt) {
  io.emit("presence:update", {
    user_id: Number(userId),
    is_online: Boolean(isOnline),
    last_seen_at: lastSeenAt,
  });
}

/*  ========== Socket Management  ========== */
//增加一个用户连接（socketId）到 socketsByUser 映射中，如果这个用户之前没有任何连接了，那么说明他从离线变成在线了，返回当前这个用户的活跃连接数。
function registerSocketForUser(userId, socketId) {
  const key = Number(userId);
  const current = socketsByUser.get(key) || new Set(); //从 socketsByUser 映射中获取当前用户的 socket 集合，如果没有则创建一个新的 Set。socketsByUser 是一个 Map，键是 userId（数字），值是一个 Set，包含所有与该用户相关联的 socketId。
  current.add(socketId);
  socketsByUser.set(key, current);

  return current.size;
}

//移除一个用户连接（socketId）从 socketsByUser 映射中，如果这个用户之后没有任何连接了，那么说明他从在线变成离线了，返回当前这个用户的活跃连接数。
function unregisterSocketForUser(userId, socketId) {
  const key = Number(userId);
  const current = socketsByUser.get(key);
  if (!current) return 0;

  current.delete(socketId);
  if (current.size === 0) {
    socketsByUser.delete(key);
    return 0;
  }

  socketsByUser.set(key, current);
  
  return current.size;
}

/*  ========== Update Last Seen Timestamp  ========== */
async function touchLastSeen(userId) {
  await pool.query(
    `
    UPDATE users
    SET last_seen_at = NOW()
    WHERE id = $1
    `,
    [userId],
  );
}

/*  ========== Handle Socket Connect/Disconnect  ========== */
async function onSocketConnect(io, userId, socketId) {
  const totalSockets = registerSocketForUser(userId, socketId);

  try {
    await touchLastSeen(userId);
  } catch {
    // Keep realtime channel alive even if DB write fails.
  }

  if (totalSockets === 1) {
    emitPresence(io, userId, true, new Date().toISOString());
  }
}

async function onSocketDisconnect(io, userId, socketId) {
  const totalSockets = unregisterSocketForUser(userId, socketId);
  console.log(`[onSocketDisconnect] userId=${userId}, socketId=${socketId}, totalSockets=${totalSockets}`);
  if (totalSockets > 0) return;

  let lastSeenAt = new Date().toISOString();
  try {
    const result = await pool.query(
      `
      UPDATE users
      SET last_seen_at = NOW()
      WHERE id = $1
      RETURNING last_seen_at
      `,
      [userId],
    );
    if (result.rowCount > 0 && result.rows[0].last_seen_at) {
      lastSeenAt = result.rows[0].last_seen_at;
    }
  } catch (err) {
    console.error(`[onSocketDisconnect error] userId=${userId}:`, err);
  }

  console.log(`[emitPresence OFFLINE] userId=${userId}, isOnline=false, lastSeenAt=${lastSeenAt}`);
  emitPresence(io, userId, false, lastSeenAt);
}

module.exports = {
  isUserOnline,
  onSocketConnect,
  onSocketDisconnect,
};