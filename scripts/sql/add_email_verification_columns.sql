-- Add email verification token columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verification_token_expiry TIMESTAMPTZ;

-- Create index on email_verification_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_token ON users(email_verification_token);
