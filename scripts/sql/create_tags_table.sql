-- Create tags table to store user interests and preferences
CREATE TABLE IF NOT EXISTS tags ( -- 创建数据表
    id BIGSERIAL PRIMARY KEY, -- 字段定义或取值行
    name VARCHAR(64) NOT NULL UNIQUE, -- 字段定义或取值行
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW () -- 字段定义或取值行
); -- 当前定义结束

-- Index to optimize queries that filter by tag name (e.g., searching for tags)
CREATE INDEX IF NOT EXISTS tags_name_idx ON tags (name); -- 创建索引以提升查询性能