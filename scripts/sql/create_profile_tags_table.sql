-- Create user profile tags table to associate users with their interests
CREATE TABLE IF NOT EXISTS user_profile_tags ( -- 创建数据表
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- 字段定义或取值行
    tag_id BIGINT NOT NULL REFERENCES tags (id) ON DELETE CASCADE, -- 字段定义或取值行
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (), -- 字段定义或取值行
    PRIMARY KEY (user_id, tag_id) -- 主键定义
); -- 当前定义结束

-- Indexes to optimize queries for user profile tags
CREATE INDEX IF NOT EXISTS user_profile_tags_user_id_idx ON user_profile_tags (user_id); -- 创建索引以提升查询性能

-- Index to optimize queries that filter by tag_id (e.g., finding users with a specific tag)
CREATE INDEX IF NOT EXISTS user_profile_tags_tag_id_idx ON user_profile_tags (tag_id); -- 创建索引以提升查询性能