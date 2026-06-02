-- Create notifications table to store user notifications
CREATE TABLE IF NOT EXISTS notifications ( -- 创建数据表
  id BIGSERIAL PRIMARY KEY, -- 字段定义或取值行
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- 字段定义或取值行
  actor_user_id INTEGER REFERENCES users (id) ON DELETE SET NULL, -- 字段定义或取值行
  type VARCHAR(50) NOT NULL, -- 字段定义或取值行
  message TEXT NOT NULL, -- 字段定义或取值行
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- 字段定义或取值行
  is_read BOOLEAN NOT NULL DEFAULT FALSE, -- 字段定义或取值行
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- 字段定义或取值行
); -- 当前定义结束

-- Indexes to optimize queries for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created -- 创建索引以提升查询性能
  ON notifications (user_id, is_read, created_at DESC); -- 字段定义或取值行

-- Additional index to optimize queries that filter by user and order by creation time
CREATE INDEX IF NOT EXISTS idx_notifications_user_created -- 创建索引以提升查询性能
  ON notifications (user_id, created_at DESC); -- 字段定义或取值行
