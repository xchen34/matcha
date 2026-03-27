CREATE TABLE IF NOT EXISTS likes (
    liker_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    liked_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (liker_user_id, liked_user_id)
);