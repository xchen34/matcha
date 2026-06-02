-- Add password reset token columns to users table
ALTER TABLE users -- 修改现有表结构
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255), -- 新增字段
ADD COLUMN IF NOT EXISTS password_reset_token_expiry TIMESTAMPTZ; -- 新增字段

-- Index for password reset token lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON users(password_reset_token); -- 创建索引以提升查询性能
