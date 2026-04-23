-- Add pending email column to support verified email change flow.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255);

-- Helpful index for pending-email lookups/conflict checks.
CREATE INDEX IF NOT EXISTS idx_users_pending_email ON users(pending_email);
