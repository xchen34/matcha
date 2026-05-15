-- Create user blocks table to manage user blocking relationships
CREATE TABLE IF NOT EXISTS user_blocks (
    id BIGSERIAL PRIMARY KEY,
    blocker_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    blocked_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    CONSTRAINT user_blocks_not_self CHECK (blocker_user_id <> blocked_user_id)
);

-- Unique constraint to prevent duplicate blocks (same blocker and blocked pair)
CREATE UNIQUE INDEX IF NOT EXISTS user_blocks_unique_pair ON user_blocks (blocker_user_id, blocked_user_id);

-- Indexes to optimize queries for user blocks
CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON user_blocks (blocker_user_id);

-- Index to optimize queries that filter by blocked_user_id (e.g., finding who has blocked a specific user)
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON user_blocks (blocked_user_id);