-- Create table for reporting fake accounts
CREATE TABLE IF NOT EXISTS fake_account_reports ( -- 创建数据表
    id BIGSERIAL PRIMARY KEY, -- 字段定义或取值行
    reporter_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- 字段定义或取值行
    reported_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- 字段定义或取值行
    reason TEXT NOT NULL, -- 字段定义或取值行
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (), -- 字段定义或取值行
    CONSTRAINT fake_account_reports_not_self CHECK (reporter_user_id <> reported_user_id) -- 字段定义或取值行
); -- 当前定义结束

-- Ensure that a user cannot report the same user multiple times
CREATE UNIQUE INDEX IF NOT EXISTS fake_account_reports_unique_pair ON fake_account_reports (reporter_user_id, reported_user_id); -- 字段定义或取值行

-- Index to optimize queries for reported users
CREATE INDEX IF NOT EXISTS fake_account_reports_reported_idx ON fake_account_reports (reported_user_id); -- 创建索引以提升查询性能