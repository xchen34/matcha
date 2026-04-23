-- Seed ~500 users + profiles with random-ish real-looking names
-- Usage: psql -h /tmp -p 5432 -U "$DB_USER" -d "$DB_NAME" -f scripts/sql/seed_fake_users.sql

WITH params AS (
  SELECT 500::int AS count -- change here if you want a different volume
),
deleted_seed_users AS (
  DELETE FROM users
  WHERE
    -- legacy seeds from previous script versions
    email LIKE '%.seed\_%@example.com' ESCAPE '\'
    -- current/future seed convention
    OR email LIKE 'seed.%@example.com'
    OR username LIKE 'seed\_%' ESCAPE '\'
  RETURNING id
),
cleanup_done AS (
  SELECT COUNT(*) AS removed_count FROM deleted_seed_users
),
generated AS (
  SELECT
    g
  FROM params, cleanup_done, generate_series(1, (SELECT count FROM params)) g
),
name_bank AS (
  SELECT ARRAY[
    'Alice','Bob','Carol','David','Eve','Frank','Grace','Hank','Ivy','Jack',
    'Liam','Mia','Noah','Olivia','Paul','Quinn','Rita','Sam','Tina','Victor',
    'Wendy','Yara','Zack','Nina','Omar','Pia','Rene','Sara','Tom','Uma'
  ] AS firsts,
  ARRAY[
    'Smith','Johnson','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez',
    'Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee',
    'Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker'
  ] AS lasts
),
seed_tags AS (
  INSERT INTO tags (name)
  VALUES
    ('#art'),
    ('#music'),
    ('#sport'),
    ('#travel'),
    ('#food'),
    ('#gaming'),
    ('#cinema'),
    ('#reading'),
    ('#photography'),
    ('#fashion'),
    ('#coding'),
    ('#nature'),
    ('#dance'),
    ('#fitness'),
    ('#coffee'),
    ('#animals'),
    ('#cars'),
    ('#science'),
    ('#anime'),
    ('#design')
  ON CONFLICT (name) DO NOTHING
  RETURNING id
),
new_users AS (
  INSERT INTO users (email, username, first_name, last_name, password_hash, email_verified, created_at)
  SELECT
    lower('seed.' || regexp_replace(f, '[^a-zA-Z0-9]', '', 'g') || '.' || gen.g || '@example.com') AS email,
    left(
      lower('seed_' || regexp_replace(f, '[^a-zA-Z0-9]', '', 'g') || '_' || gen.g),
      20
    ) AS username,
    f AS first_name,
    l AS last_name,
    -- bcrypt hash for password "password" (demo only)
    '$2b$10$7EqJtq98hPqEX7fNZaFWoOhi9qV8aYQxv8d2XrRk5v0zzakDx4z8e',
    TRUE,
    NOW()
  FROM generated gen
  CROSS JOIN name_bank nb
  CROSS JOIN LATERAL (
    SELECT
      nb.firsts[1 + (gen.g % array_length(nb.firsts,1))] AS f,
      nb.lasts[1 + ((gen.g / array_length(nb.firsts,1)) % array_length(nb.lasts,1))] AS l
  ) AS names
  ON CONFLICT (email) DO NOTHING
  RETURNING id, username
),
inserted_profiles AS (
  INSERT INTO profiles (
    user_id,
    gender,
    sexual_preference,
    biography,
    birth_date,
    city,
    latitude,
    longitude,
    fame_rating
  )
  SELECT
    u.id,
    (ARRAY['male','female','non_binary','other'])[1 + floor(random() * 4)],
    (ARRAY['male','female','both','other'])[1 + floor(random() * 4)],
    'Auto bio for ' || u.username,
    -- age distribution:
    -- ~90% in 18-60, ~10% in 61-100
    (
      CURRENT_DATE - (
        (
          CASE
            WHEN random() < 0.9
              THEN 18 + floor(random() * 43)::int
            ELSE 61 + floor(random() * 40)::int
          END
        ) * INTERVAL '1 year'
      )
    )::date,
    (ARRAY[
      'Paris','Lyon','Marseille','Toulouse','Nice','Nantes','Strasbourg','Montpellier','Bordeaux','Lille',
      'Berlin','Madrid','London','Rome','Amsterdam','Brussels','Lisbon',
      'New York','San Francisco','Los Angeles','Chicago','Seattle','Boston','Austin','Miami',
      'Tokyo','Osaka','Seoul','Shanghai','Beijing','Hong Kong','Singapore','Bangkok','Kuala Lumpur','Jakarta','Mumbai'
    ])[1 + floor(random() * 36)],
    ROUND((random() * 180 - 90)::numeric, 6),
    ROUND((random() * 360 - 180)::numeric, 6),
    0
  FROM new_users u
  LEFT JOIN profiles p ON p.user_id = u.id
  WHERE p.user_id IS NULL
  RETURNING user_id
),
inserted_tags AS (
  INSERT INTO user_profile_tags (user_id, tag_id)
  SELECT
    u.id,
    t.id
  FROM new_users u
  JOIN LATERAL (
    SELECT id
    FROM tags
    ORDER BY random()
    LIMIT (1 + floor(random() * 5))::int
  ) t ON TRUE
  ON CONFLICT DO NOTHING
  RETURNING user_id
),
seed_views AS (
  INSERT INTO profile_views (viewer_user_id, viewed_user_id, created_at)
  SELECT
    viewer.id AS viewer_user_id,
    viewed.id AS viewed_user_id,
    NOW() - (random() * INTERVAL '30 days')
  FROM new_users viewer
  JOIN new_users viewed ON viewer.id <> viewed.id
  WHERE random() < 0.03
  ON CONFLICT (viewer_user_id, viewed_user_id) DO NOTHING
  RETURNING viewer_user_id, viewed_user_id
),
seed_likes AS (
  INSERT INTO likes (liker_user_id, liked_user_id, created_at)
  SELECT
    liker.id AS liker_user_id,
    liked.id AS liked_user_id,
    NOW() - (random() * INTERVAL '6 days')
  FROM new_users liker
  JOIN new_users liked ON liker.id <> liked.id
  WHERE random() < 0.012
  ON CONFLICT (liker_user_id, liked_user_id) DO NOTHING
  RETURNING liker_user_id, liked_user_id
),
seed_matches AS (
  INSERT INTO likes (liker_user_id, liked_user_id, created_at)
  SELECT
    l.liked_user_id AS liker_user_id,
    l.liker_user_id AS liked_user_id,
    NOW() - (random() * INTERVAL '3 days')
  FROM seed_likes l
  WHERE random() < 0.35
  ON CONFLICT (liker_user_id, liked_user_id) DO NOTHING
  RETURNING liker_user_id, liked_user_id
)
SELECT
  (SELECT COUNT(*) FROM new_users) AS created_users,
  (SELECT COUNT(*) FROM inserted_profiles) AS created_profiles,
  (SELECT COUNT(*) FROM inserted_tags) AS inserted_tags,
  (SELECT COUNT(*) FROM seed_views) AS inserted_views,
  (SELECT COUNT(*) FROM seed_likes) AS inserted_likes,
  (SELECT COUNT(*) FROM seed_matches) AS inserted_match_likes;
