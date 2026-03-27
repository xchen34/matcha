CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  gender VARCHAR(20) NOT NULL CHECK (
    gender IN ('male', 'female', 'non_binary', 'other')
  ),
  sexual_preference VARCHAR(20) NOT NULL CHECK (
    sexual_preference IN ('male', 'female', 'both', 'other')
  ),
  biography TEXT NOT NULL DEFAULT '',
  birth_date DATE NOT NULL CHECK (birth_date <= CURRENT_DATE),
  city VARCHAR(120) NOT NULL DEFAULT '',
  latitude NUMERIC(9, 6) CHECK (latitude BETWEEN -90 AND 90),
  longitude NUMERIC(9, 6) CHECK (longitude BETWEEN -180 AND 180),
  fame_rating NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (fame_rating BETWEEN 0 AND 100)
);