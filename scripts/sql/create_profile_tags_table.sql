-- Create user profile tags table to associate users with their interests
CREATE TABLE IF NOT EXISTS user_profile_tags (
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    PRIMARY KEY (user_id, tag_id)
);

-- Indexes to optimize queries for user profile tags
CREATE INDEX IF NOT EXISTS user_profile_tags_user_id_idx ON user_profile_tags (user_id);

-- Index to optimize queries that filter by tag_id (e.g., finding users with a specific tag)
CREATE INDEX IF NOT EXISTS user_profile_tags_tag_id_idx ON user_profile_tags (tag_id);