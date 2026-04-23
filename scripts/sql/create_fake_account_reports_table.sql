CREATE TABLE IF NOT EXISTS fake_account_reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    reported_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    CONSTRAINT fake_account_reports_not_self CHECK (reporter_user_id <> reported_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS fake_account_reports_unique_pair ON fake_account_reports (reporter_user_id, reported_user_id);

CREATE INDEX IF NOT EXISTS fake_account_reports_reported_idx ON fake_account_reports (reported_user_id);