-- Create profile views table to store information about user profile views
CREATE TABLE IF NOT EXISTS profile_views ( -- 创建数据表
  viewer_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- 字段定义或取值行
  viewed_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- 字段定义或取值行
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 字段定义或取值行
  PRIMARY KEY (viewer_user_id, viewed_user_id) -- 主键定义
); -- 当前定义结束
