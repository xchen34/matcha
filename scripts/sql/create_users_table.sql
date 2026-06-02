-- Create users table to store user information and authentication details
CREATE TABLE IF NOT EXISTS users ( -- 创建数据表
  id BIGSERIAL PRIMARY KEY, -- 字段定义或取值行
  email VARCHAR(255) NOT NULL UNIQUE, -- 字段定义或取值行
  username VARCHAR(50) NOT NULL UNIQUE, -- 字段定义或取值行
  first_name VARCHAR(100) NOT NULL, -- 字段定义或取值行
  last_name VARCHAR(100) NOT NULL, -- 字段定义或取值行
  password_hash TEXT NOT NULL, -- 字段定义或取值行
  email_verified BOOLEAN NOT NULL DEFAULT FALSE, -- 字段定义或取值行
  pending_email VARCHAR(255), -- 字段定义或取值行
  email_verification_token VARCHAR(255), -- 字段定义或取值行
  email_verification_token_expiry TIMESTAMPTZ, -- 字段定义或取值行
  password_reset_token VARCHAR(255), -- 字段定义或取值行
  password_reset_token_expiry TIMESTAMPTZ, -- 字段定义或取值行
  deleted_at TIMESTAMPTZ, -- 字段定义或取值行
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW () -- 字段定义或取值行
); -- 当前定义结束
