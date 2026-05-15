-- Create tags table to store user interests and preferences
CREATE TABLE IF NOT EXISTS tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
);

-- Index to optimize queries that filter by tag name (e.g., searching for tags)
CREATE INDEX IF NOT EXISTS tags_name_idx ON tags (name);