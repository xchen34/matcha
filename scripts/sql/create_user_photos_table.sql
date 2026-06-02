-- Create user photos table to store user profile pictures
CREATE TABLE IF NOT EXISTS user_photos ( -- 创建数据表
  id BIGSERIAL PRIMARY KEY, -- 字段定义或取值行
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- 字段定义或取值行
  data_url TEXT NOT NULL, -- 字段定义或取值行
  is_primary BOOLEAN NOT NULL DEFAULT FALSE, -- 字段定义或取值行
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- 字段定义或取值行
); -- 当前定义结束

-- Unique constraint to ensure only one primary photo per user
CREATE UNIQUE INDEX IF NOT EXISTS user_photos_primary_key -- 字段定义或取值行
ON user_photos (user_id) -- 字段定义或取值行
WHERE is_primary = TRUE; -- 字段定义或取值行
