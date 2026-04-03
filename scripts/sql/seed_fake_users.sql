-- Seed ~500 users + profiles with random-ish real-looking names
-- Usage: psql -h /tmp -p 5432 -U "$DB_USER" -d "$DB_NAME" -f scripts/sql/seed_fake_users.sql

WITH params AS (
  SELECT 500::int AS count -- change here if you want a different volume
),
generated AS (
  SELECT
    -- unique tag to avoid email/username conflicts even if run multiple times
    'seed_' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '_' || g AS tag,
    g
  FROM params, generate_series(1, (SELECT count FROM params)) g
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
    lower(f || '.' || l || '.' || gen.tag || '@example.com') AS email,
    lower(f || '_' || l || '_' || gen.tag)                  AS username,
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
    -- age between 18 and 40
    (CURRENT_DATE - ((18 + floor(random() * 22))::int * INTERVAL '1 year'))::date,
    (ARRAY[
      'Paris','Lyon','Marseille','Toulouse','Nice','Nantes','Strasbourg','Montpellier','Bordeaux','Lille',
      'Berlin','Madrid','London','Rome','Amsterdam','Brussels','Lisbon',
      'New York','San Francisco','Los Angeles','Chicago','Seattle','Boston','Austin','Miami',
      'Tokyo','Osaka','Seoul','Shanghai','Beijing','Hong Kong','Singapore','Bangkok','Kuala Lumpur','Jakarta','Mumbai'
    ])[1 + floor(random() * 36)],
    ROUND((random() * 180 - 90)::numeric, 6),
    ROUND((random() * 360 - 180)::numeric, 6),
    ROUND((random() * 100)::numeric, 2)
  FROM new_users u
  LEFT JOIN profiles p ON p.user_id = u.id
  WHERE p.user_id IS NULL
  RETURNING user_id
)
-- assign 1-5 random tags per new user
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
ON CONFLICT DO NOTHING;
