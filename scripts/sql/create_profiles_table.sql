-- Create profiles table to store user profile information
CREATE TABLE IF NOT EXISTS profiles ( -- 创建数据表
  user_id INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE, -- 字段定义或取值行
  gender VARCHAR(20) CHECK ( -- 字段定义或取值行
    gender IS NULL -- 字段定义或取值行
    OR gender IN ('male', 'female', 'non_binary', 'other') -- 字段定义或取值行
  ), -- 上一行记录结束并继续下一条
  sexual_preference VARCHAR(20) CHECK ( -- 字段定义或取值行
    sexual_preference IS NULL -- 字段定义或取值行
    OR sexual_preference IN ('male', 'female', 'both', 'other') -- 字段定义或取值行
  ), -- 上一行记录结束并继续下一条
  biography TEXT NOT NULL DEFAULT '', -- 字段定义或取值行
  birth_date DATE NOT NULL CHECK (birth_date <= CURRENT_DATE), -- 字段定义或取值行
  city VARCHAR(120) NOT NULL DEFAULT '', -- 字段定义或取值行
  neighborhood VARCHAR(120) NOT NULL DEFAULT '', -- 字段定义或取值行
  gps_consent BOOLEAN NOT NULL DEFAULT FALSE, -- 字段定义或取值行
  latitude NUMERIC(9, 6) CHECK (latitude BETWEEN -90 AND 90), -- 字段定义或取值行
  longitude NUMERIC(9, 6) CHECK (longitude BETWEEN -180 AND 180), -- 字段定义或取值行
  fame_rating NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (fame_rating BETWEEN 0 AND 100) -- 字段定义或取值行
); -- 当前定义结束