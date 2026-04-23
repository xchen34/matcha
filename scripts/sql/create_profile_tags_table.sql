CREATE TABLE IF NOT EXISTS user_profile_tags (
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    PRIMARY KEY (user_id, tag_id)
);

CREATE INDEX IF NOT EXISTS user_profile_tags_user_id_idx ON user_profile_tags (user_id);

CREATE INDEX IF NOT EXISTS user_profile_tags_tag_id_idx ON user_profile_tags (tag_id);