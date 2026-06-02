-- Chat 模块核心表：会话表 + 消息表。
-- 设计目标：
-- 1) 一对用户只允许存在一个会话。
-- 2) 消息按会话归属，删除会话时消息自动清理。
-- 3) 常用查询（按会话拉消息、按收件人查未读）有索引支持。

CREATE TABLE IF NOT EXISTS chat_conversations (
  id SERIAL PRIMARY KEY, -- 会话主键 ID。
  user_a_id INT NOT NULL, -- 会话参与者 A 的用户 ID。
  user_b_id INT NOT NULL, -- 会话参与者 B 的用户 ID。
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 会话创建时间（带时区）。
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 最近一条消息时间，用于会话列表排序。

  CONSTRAINT chat_conversations_user_diff CHECK (user_a_id <> user_b_id), -- 防止自己和自己创建会话。
  CONSTRAINT chat_conversations_user_order CHECK (user_a_id < user_b_id), -- 强制固定顺序存用户对，避免 (1,2) 与 (2,1) 重复。

  FOREIGN KEY (user_a_id) REFERENCES users(id), -- 参与者 A 必须是有效用户。
  FOREIGN KEY (user_b_id) REFERENCES users(id) -- 参与者 B 必须是有效用户。
);

-- 因为有 user_order 约束，用户对会被标准化成 (小ID, 大ID)，
-- 再通过唯一索引保证“每一对用户最多一个会话”。
CREATE UNIQUE INDEX IF NOT EXISTS chat_conversations_user_pair_uindex
  ON chat_conversations (user_a_id, user_b_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY, -- 消息主键 ID。
  conversation_id INT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE, -- 所属会话；会话删除时消息级联删除。
  sender_user_id INT NOT NULL REFERENCES users(id), -- 发送者用户 ID。
  recipient_user_id INT NOT NULL REFERENCES users(id), -- 接收者用户 ID。
  content TEXT NOT NULL, -- 消息正文。
  is_read BOOLEAN NOT NULL DEFAULT FALSE, -- 是否已读（默认未读）。
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- 消息发送时间（带时区）。
);

-- 按会话拉取消息（聊天窗口最常见查询）
CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx
  ON chat_messages (conversation_id);

-- 按接收者查消息（常用于未读统计/通知）
CREATE INDEX IF NOT EXISTS chat_messages_recipient_idx
  ON chat_messages (recipient_user_id);
