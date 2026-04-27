const pool = require("../db");

let initPromise = null;
let chatVisibilityTablesReady = false;

async function ensureChatVisibilityTables() {
  if (chatVisibilityTablesReady) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_deleted_conversations (
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conversation_id INT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, conversation_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_deleted_messages (
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message_id INT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
        conversation_id INT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, message_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS chat_deleted_conversations_user_idx
      ON chat_deleted_conversations(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS chat_deleted_messages_user_conversation_idx
      ON chat_deleted_messages(user_id, conversation_id)
    `);

    chatVisibilityTablesReady = true;
  })();

  return initPromise;
}

module.exports = { ensureChatVisibilityTables };