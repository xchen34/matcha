const pool = require("../db");

async function insertSystemMessage(userA, userB, content) {
  const user1 = Math.min(userA, userB);
  const user2 = Math.max(userA, userB);
  // Find or create the conversation
  const convRes = await pool.query(
    `INSERT INTO chat_conversations (user_a_id, user_b_id)
     VALUES ($1, $2)
     ON CONFLICT (user_a_id, user_b_id) DO NOTHING
     RETURNING id`,
    [user1, user2],
  );
  let conversationId;
  if (convRes.rows.length > 0) {
    conversationId = convRes.rows[0].id;
  } else {
    const fetchRes = await pool.query(
      `SELECT id FROM chat_conversations WHERE user_a_id = $1 AND user_b_id = $2 LIMIT 1`,
      [user1, user2],
    );
    conversationId = fetchRes.rows[0]?.id;
  }
  if (!conversationId) return;
  // Pour un message système, on met userA comme sender, userB comme destinataire
  await pool.query(
    `INSERT INTO chat_messages (conversation_id, sender_user_id, recipient_user_id, content, is_read)
     VALUES ($1, $2, $3, $4, TRUE)`,
    [conversationId, userA, userB, content],
  );
}

module.exports = { insertSystemMessage };
