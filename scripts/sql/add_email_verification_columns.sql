-- Add email verification token columns to users table
ALTER TABLE users -- 修改现有表结构
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255), -- 新增字段
ADD COLUMN IF NOT EXISTS email_verification_token_expiry TIMESTAMPTZ; -- 新增字段

-- Create index on email_verification_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_token ON users(email_verification_token); -- 创建索引以提升查询性能
