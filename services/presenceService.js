const pool = require("../db");

const socketsByUser = new Map();

function isUserOnline(userId) {
  const key = Number(userId);
  const current = socketsByUser.get(key);
  return Boolean(current && current.size > 0);
}

function emitPresence(io, userId, isOnline, lastSeenAt) {
  io.emit("presence:update", {
    user_id: Number(userId),
    is_online: Boolean(isOnline),
    last_seen_at: lastSeenAt,
  });
}

function registerSocketForUser(userId, socketId) {
  const key = Number(userId);
  const current = socketsByUser.get(key) || new Set();
  current.add(socketId);
  socketsByUser.set(key, current);
  return current.size;
}

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