CREATE TABLE IF NOT EXISTS profile_views (
  viewer_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  viewed_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (viewer_user_id, viewed_user_id)
);
