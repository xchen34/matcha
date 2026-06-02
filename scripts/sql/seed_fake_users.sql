-- Seed ~500 users + profiles with random-ish real-looking names
-- Usage: psql -h /tmp -p 5432 -U "$DB_USER" -d "$DB_NAME" -f scripts/sql/seed_fake_users.sql

WITH params AS ( -- 字段定义或取值行
  SELECT 500::int AS count -- change here if you want a different volume -- 查询语句
), -- 上一行记录结束并继续下一条
deleted_seed_users AS ( -- 删除数据
  DELETE FROM users -- 删除数据
  WHERE -- SQL 配置行
    -- legacy seeds from previous script versions
    email LIKE '%.seed\_%@example.com' ESCAPE '\' -- 字段定义或取值行
    -- current/future seed convention
    OR email LIKE 'seed.%@example.com' -- 字段定义或取值行
    OR username LIKE 'seed\_%' ESCAPE '\' -- 字段定义或取值行
  RETURNING id -- 字段定义或取值行
), -- 上一行记录结束并继续下一条
cleanup_done AS ( -- 字段定义或取值行
  SELECT COUNT(*) AS removed_count FROM deleted_seed_users -- 查询语句
), -- 上一行记录结束并继续下一条
generated AS ( -- 字段定义或取值行
  SELECT -- 查询语句
    g -- SQL 配置行
  FROM params, cleanup_done, generate_series(1, (SELECT count FROM params)) g -- 字段定义或取值行
), -- 上一行记录结束并继续下一条
name_bank AS ( -- 字段定义或取值行
  SELECT ARRAY[ -- 查询语句
    'Alice','Bob','Carol','David','Eve','Frank','Grace','Hank','Ivy','Jack', -- 延续当前定义
    'Liam','Mia','Noah','Olivia','Paul','Quinn','Rita','Sam','Tina','Victor', -- 延续当前定义
    'Wendy','Yara','Zack','Nina','Omar','Pia','Rene','Sara','Tom','Uma' -- SQL 配置行
  ] AS firsts, -- 延续当前定义
  ARRAY[ -- SQL 配置行
    'Smith','Johnson','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez', -- 延续当前定义
    'Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee', -- 延续当前定义
    'Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker' -- SQL 配置行
  ] AS lasts -- SQL 配置行
), -- 上一行记录结束并继续下一条
seed_tags AS ( -- 字段定义或取值行
  INSERT INTO tags (name) -- 向表中插入数据
  VALUES -- 提供插入数据的值
    ('#art'), -- 延续当前定义
    ('#music'), -- 延续当前定义
    ('#sport'), -- 延续当前定义
    ('#travel'), -- 延续当前定义
    ('#food'), -- 延续当前定义
    ('#gaming'), -- 延续当前定义
    ('#cinema'), -- 延续当前定义
    ('#reading'), -- 延续当前定义
    ('#photography'), -- 延续当前定义
    ('#fashion'), -- 延续当前定义
    ('#coding'), -- 延续当前定义
    ('#nature'), -- 延续当前定义
    ('#dance'), -- 延续当前定义
    ('#fitness'), -- 延续当前定义
    ('#coffee'), -- 延续当前定义
    ('#animals'), -- 延续当前定义
    ('#cars'), -- 延续当前定义
    ('#science'), -- 延续当前定义
    ('#anime'), -- 延续当前定义
    ('#design') -- SQL 配置行
  ON CONFLICT (name) DO NOTHING -- 字段定义或取值行
  RETURNING id -- 字段定义或取值行
), -- 上一行记录结束并继续下一条
new_users AS ( -- 字段定义或取值行
  INSERT INTO users (email, username, first_name, last_name, password_hash, email_verified, created_at) -- 向表中插入数据
  SELECT -- 查询语句
    lower('seed.' || regexp_replace(f, '[^a-zA-Z0-9]', '', 'g') || '.' || gen.g || '@example.com') AS email, -- 延续当前定义
    left( -- SQL 配置行
      lower('seed_' || regexp_replace(f, '[^a-zA-Z0-9]', '', 'g') || '_' || gen.g), -- 延续当前定义
      20 -- SQL 配置行
    ) AS username, -- 延续当前定义
    f AS first_name, -- 字段定义或取值行
    l AS last_name, -- 字段定义或取值行
    -- bcrypt hash for password "password" (demo only)
    '$2b$10$7EqJtq98hPqEX7fNZaFWoOhi9qV8aYQxv8d2XrRk5v0zzakDx4z8e', -- 延续当前定义
    TRUE, -- 延续当前定义
    NOW() -- SQL 配置行
  FROM generated gen -- 字段定义或取值行
  CROSS JOIN name_bank nb -- 字段定义或取值行
  CROSS JOIN LATERAL ( -- 字段定义或取值行
    SELECT -- 查询语句
      nb.firsts[1 + (gen.g % array_length(nb.firsts,1))] AS f, -- 延续当前定义
      nb.lasts[1 + ((gen.g / array_length(nb.firsts,1)) % array_length(nb.lasts,1))] AS l -- SQL 配置行
  ) AS names -- SQL 配置行
  ON CONFLICT (email) DO NOTHING -- 字段定义或取值行
  RETURNING id, username -- 字段定义或取值行
), -- 上一行记录结束并继续下一条
inserted_profiles AS ( -- 字段定义或取值行
  INSERT INTO profiles ( -- 向表中插入数据
    user_id, -- 延续当前定义
    gender, -- 延续当前定义
    sexual_preference, -- 延续当前定义
    biography, -- 延续当前定义
    birth_date, -- 延续当前定义
    city, -- 延续当前定义
    latitude, -- 延续当前定义
    longitude, -- 延续当前定义
    fame_rating -- SQL 配置行
  ) -- SQL 配置行
  SELECT -- 查询语句
    u.id, -- 延续当前定义
    (ARRAY['male','female','non_binary','other'])[1 + floor(random() * 4)], -- 延续当前定义
    (ARRAY['male','female','both','other'])[1 + floor(random() * 4)], -- 延续当前定义
    'Auto bio for ' || u.username, -- 延续当前定义
    -- age distribution:
    -- ~90% in 18-60, ~10% in 61-100
    ( -- 记录内容开始
      CURRENT_DATE - ( -- 字段定义或取值行
        ( -- 记录内容开始
          CASE -- SQL 配置行
            WHEN random() < 0.9 -- 字段定义或取值行
              THEN 18 + floor(random() * 43)::int -- 字段定义或取值行
            ELSE 61 + floor(random() * 40)::int -- 字段定义或取值行
          END -- SQL 配置行
        ) * INTERVAL '1 year' -- SQL 配置行
      ) -- SQL 配置行
    )::date, -- 延续当前定义
    (ARRAY[ -- SQL 配置行
      'Paris','Lyon','Marseille','Toulouse','Nice','Nantes','Strasbourg','Montpellier','Bordeaux','Lille', -- 延续当前定义
      'Berlin','Madrid','London','Rome','Amsterdam','Brussels','Lisbon', -- 延续当前定义
      'New York','San Francisco','Los Angeles','Chicago','Seattle','Boston','Austin','Miami', -- 延续当前定义
      'Tokyo','Osaka','Seoul','Shanghai','Beijing','Hong Kong','Singapore','Bangkok','Kuala Lumpur','Jakarta','Mumbai' -- SQL 配置行
    ])[1 + floor(random() * 36)], -- 延续当前定义
    ROUND((random() * 180 - 90)::numeric, 6), -- 延续当前定义
    ROUND((random() * 360 - 180)::numeric, 6), -- 延续当前定义
    ROUND((random() * 100)::numeric, 2) -- SQL 配置行
  FROM new_users u -- 字段定义或取值行
  LEFT JOIN profiles p ON p.user_id = u.id -- 字段定义或取值行
  WHERE p.user_id IS NULL -- 字段定义或取值行
  RETURNING user_id -- 字段定义或取值行
), -- 上一行记录结束并继续下一条
inserted_tags AS ( -- 字段定义或取值行
  WITH user_tag_targets AS ( -- 字段定义或取值行
    SELECT -- 查询语句
      u.id AS user_id, -- 延续当前定义
      floor(random() * 11)::int AS tag_count -- SQL 配置行
    FROM new_users u -- 字段定义或取值行
  ), -- 上一行记录结束并继续下一条
  ranked_tags AS ( -- 字段定义或取值行
    SELECT -- 查询语句
      utt.user_id, -- 延续当前定义
      t.id AS tag_id, -- 延续当前定义
      utt.tag_count, -- 延续当前定义
      row_number() OVER ( -- SQL 配置行
        PARTITION BY utt.user_id -- 字段定义或取值行
        ORDER BY md5(utt.user_id::text || ':' || t.id::text || ':' || random()::text) -- 字段定义或取值行
      ) AS rn -- SQL 配置行
    FROM user_tag_targets utt -- 字段定义或取值行
    CROSS JOIN tags t -- 字段定义或取值行
  ) -- SQL 配置行
  INSERT INTO user_profile_tags (user_id, tag_id) -- 向表中插入数据
  SELECT -- 查询语句
    rt.user_id, -- 延续当前定义
    rt.tag_id -- SQL 配置行
  FROM ranked_tags rt -- 字段定义或取值行
  WHERE rt.rn <= rt.tag_count -- 字段定义或取值行
  ON CONFLICT DO NOTHING -- 字段定义或取值行
  RETURNING user_id -- 字段定义或取值行
), -- 上一行记录结束并继续下一条
seed_views AS ( -- 字段定义或取值行
  INSERT INTO profile_views (viewer_user_id, viewed_user_id, created_at) -- 向表中插入数据
  SELECT -- 查询语句
    viewer.id AS viewer_user_id, -- 延续当前定义
    targets.viewed_user_id, -- 延续当前定义
    NOW() - (random() * INTERVAL '30 days') -- SQL 配置行
  FROM new_users viewer -- 字段定义或取值行
  JOIN LATERAL ( -- 字段定义或取值行
    SELECT viewed.id AS viewed_user_id -- 查询语句
    FROM new_users viewed -- 字段定义或取值行
    WHERE viewed.id <> viewer.id -- 字段定义或取值行
    ORDER BY random() -- 字段定义或取值行
    LIMIT 60 -- 字段定义或取值行
  ) targets ON TRUE -- SQL 配置行
  ON CONFLICT (viewer_user_id, viewed_user_id) DO NOTHING -- 字段定义或取值行
  RETURNING viewer_user_id, viewed_user_id -- 字段定义或取值行
), -- 上一行记录结束并继续下一条
seed_likes AS ( -- 字段定义或取值行
  INSERT INTO likes (liker_user_id, liked_user_id, created_at) -- 向表中插入数据
  SELECT -- 查询语句
    liker.id AS liker_user_id, -- 延续当前定义
    targets.liked_user_id, -- 延续当前定义
    NOW() - (random() * INTERVAL '6 days') -- SQL 配置行
  FROM new_users liker -- 字段定义或取值行
  JOIN LATERAL ( -- 字段定义或取值行
    SELECT liked.id AS liked_user_id -- 查询语句
    FROM new_users liked -- 字段定义或取值行
    WHERE liked.id <> liker.id -- 字段定义或取值行
    ORDER BY random() -- 字段定义或取值行
    LIMIT 22 -- 字段定义或取值行
  ) targets ON TRUE -- SQL 配置行
  ON CONFLICT (liker_user_id, liked_user_id) DO NOTHING -- 字段定义或取值行
  RETURNING liker_user_id, liked_user_id -- 字段定义或取值行
), -- 上一行记录结束并继续下一条
seed_matches AS ( -- 字段定义或取值行
  INSERT INTO likes (liker_user_id, liked_user_id, created_at) -- 向表中插入数据
  SELECT -- 查询语句
    l.liked_user_id AS liker_user_id, -- 延续当前定义
    l.liker_user_id AS liked_user_id, -- 延续当前定义
    NOW() - (random() * INTERVAL '3 days') -- SQL 配置行
  FROM seed_likes l -- 字段定义或取值行
  WHERE random() < 0.35 -- 字段定义或取值行
  ON CONFLICT (liker_user_id, liked_user_id) DO NOTHING -- 字段定义或取值行
  RETURNING liker_user_id, liked_user_id -- 字段定义或取值行
) -- SQL 配置行
SELECT -- 查询语句
  (SELECT COUNT(*) FROM new_users) AS created_users, -- 延续当前定义
  (SELECT COUNT(*) FROM inserted_profiles) AS created_profiles, -- 延续当前定义
  (SELECT COUNT(*) FROM inserted_tags) AS inserted_tags, -- 延续当前定义
  (SELECT COUNT(*) FROM seed_views) AS inserted_views, -- 延续当前定义
  (SELECT COUNT(*) FROM seed_likes) AS inserted_likes, -- 延续当前定义
  (SELECT COUNT(*) FROM seed_matches) AS inserted_match_likes; -- SQL 配置行
