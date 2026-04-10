CREATE TABLE IF NOT EXISTS chat_conversations (
  id SERIAL PRIMARY KEY,
  user_a_id INT NOT NULL,
  user_b_id INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_conversations_user_diff CHECK (user_a_id <> user_b_id),
  CONSTRAINT chat_conversations_user_order CHECK (user_a_id < user_b_id),
  FOREIGN KEY (user_a_id) REFERENCES users(id),
  FOREIGN KEY (user_b_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS chat_conversations_user_pair_uindex
  ON chat_conversations (user_a_id, user_b_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_user_id INT NOT NULL REFERENCES users(id),
  recipient_user_id INT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx ON chat_messages (conversation_id);
CREATE INDEX IF NOT EXISTS chat_messages_recipient_idx ON chat_messages (recipient_user_id);
