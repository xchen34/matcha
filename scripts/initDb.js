require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../db");

async function initDb() {
  try {
    const sqlPath = path.join(__dirname, "sql", "create_users_table.sql");
    const createUsersSql = fs.readFileSync(sqlPath, "utf8");
    const migrateLegacyUsersSql = `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

      UPDATE users
      SET username = 'user_' || id
      WHERE username IS NULL OR username = '';

      UPDATE users
      SET first_name = 'Unknown'
      WHERE first_name IS NULL OR first_name = '';

      UPDATE users
      SET last_name = 'User'
      WHERE last_name IS NULL OR last_name = '';

      UPDATE users
      SET password_hash = '$2b$10$7EqJtq98hPqEX7fNZaFWoOhi9qV8aYQxv8d2XrRk5v0zzakDx4z8e'
      WHERE password_hash IS NULL OR password_hash = '';

      UPDATE users
      SET email_verified = FALSE
      WHERE email_verified IS NULL;

      ALTER TABLE users ALTER COLUMN username SET NOT NULL;
      ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
      ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;
      ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
      ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
      ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT FALSE;
      ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW();

      CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (username);

    `;

    await pool.query(createUsersSql);
    await pool.query(migrateLegacyUsersSql);

    console.log("Database initialized: users table is ready.");
  } catch (error) {
    console.error("Failed to initialize database:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

initDb();
