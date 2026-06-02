-- Add pending email column to support verified email change flow.
ALTER TABLE users -- 修改现有表结构
ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255); -- 新增字段

-- Helpful index for pending-email lookups/conflict checks.
CREATE INDEX IF NOT EXISTS idx_users_pending_email ON users(pending_email); -- 创建索引以提升查询性能
