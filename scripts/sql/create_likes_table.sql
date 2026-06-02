-- Create likes table to track user likes
CREATE TABLE IF NOT EXISTS likes ( -- 创建数据表
    liker_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- 字段定义或取值行
    liked_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- 字段定义或取值行
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 字段定义或取值行
    PRIMARY KEY (liker_user_id, liked_user_id) -- 主键定义
); -- 当前定义结束