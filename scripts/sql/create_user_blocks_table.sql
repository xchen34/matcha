-- Create user blocks table to manage user blocking relationships
CREATE TABLE IF NOT EXISTS user_blocks ( -- 创建数据表
    id BIGSERIAL PRIMARY KEY, -- 字段定义或取值行
    blocker_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- 字段定义或取值行
    blocked_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- 字段定义或取值行
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (), -- 字段定义或取值行
    CONSTRAINT user_blocks_not_self CHECK (blocker_user_id <> blocked_user_id) -- 字段定义或取值行
); -- 当前定义结束

-- Unique constraint to prevent duplicate blocks (same blocker and blocked pair)
CREATE UNIQUE INDEX IF NOT EXISTS user_blocks_unique_pair ON user_blocks (blocker_user_id, blocked_user_id); -- 字段定义或取值行

-- Indexes to optimize queries for user blocks
CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON user_blocks (blocker_user_id); -- 创建索引以提升查询性能

-- Index to optimize queries that filter by blocked_user_id (e.g., finding who has blocked a specific user)
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON user_blocks (blocked_user_id); -- 创建索引以提升查询性能