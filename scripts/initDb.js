require("dotenv").config();
const fs = require("fs"); // 引入 Node.js 的文件系统模块，用于读取 SQL 文件内容。
const path = require("path");
const pool = require("../db");
const { ensureChatVisibilityTables } = require("./ensureChatVisibilityTables");
const { main: seedPhotosForExistingUsers } = require("./seed_photos_for_existing_users");
const cliArgs = new Set(process.argv.slice(2));
const schemaOnly =
  cliArgs.has("--schema-only") || process.env.DB_SCHEMA_ONLY === "true";

function loadSql(file) {
  return fs.readFileSync(
    path.join(__dirname, "sql", file),
    "utf8"
  );
}

async function initDb() {
  try {
    /*  ---------------- SQL Scripts  ---------------- */
    const createUsersSql = loadSql("create_users_table.sql");
    const createProfilesSql = loadSql("create_profiles_table.sql");
    const createLikesSql = loadSql("create_likes_table.sql");
    const createViewsSql = loadSql("create_views_table.sql");
    const createTagsSql = loadSql("create_tags_table.sql");
    const seedDefaultTagsSql = loadSql("seed_default_tags.sql");
    const createProfileTagsSql = loadSql("create_profile_tags_table.sql");
    const createUserPhotosSql = loadSql("create_user_photos_table.sql");
    const createNotificationsSql = loadSql("create_notifications_table.sql");
    const createFakeReportsSql = loadSql("create_fake_account_reports_table.sql");
    const createUserBlocksSql = loadSql("create_user_blocks_table.sql");
    const createChatSql = loadSql("create_chat_tables.sql");
    
    const seedFakeUsersSql = loadSql("seed_fake_users.sql");

    /*  ---------------- Migrate legacy users to new schema  ---------------- */
    const migrateLegacyUsersSql = `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_expiry TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_expiry TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

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

      UPDATE users
      SET last_seen_at = COALESCE(last_seen_at, created_at, NOW())
      WHERE last_seen_at IS NULL;

      ALTER TABLE users ALTER COLUMN username SET NOT NULL;
      ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
      ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;
      ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
      ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
      ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT FALSE;
      ALTER TABLE users ALTER COLUMN last_seen_at SET DEFAULT NOW();
      ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW();

      CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (username);
      CREATE INDEX IF NOT EXISTS idx_email_verification_token ON users(email_verification_token);
      CREATE INDEX IF NOT EXISTS idx_users_pending_email ON users(pending_email);
      CREATE INDEX IF NOT EXISTS idx_password_reset_token ON users(password_reset_token);
      
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(120) NOT NULL DEFAULT '';
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gps_consent BOOLEAN NOT NULL DEFAULT FALSE;

    `;

    /*  ---------------- Execute SQL Scripts  ---------------- */
    
    // 1. Create tables and seed initial data
    await pool.query(createUsersSql);
    await pool.query(createProfilesSql);

    // 2. Create additional tables and seed data
    await pool.query(createLikesSql);
    await pool.query(createViewsSql);

    // 3. Create tags and profile_tags tables, and seed default tags
    await pool.query(createTagsSql);
    await pool.query(seedDefaultTagsSql);
    await pool.query(createProfileTagsSql);

    // 4. Create notifications, fake reports, user blocks
    await pool.query(createNotificationsSql);
    await pool.query(createFakeReportsSql);
    await pool.query(createUserBlocksSql);

    // 5. Create chat tables, migrate legacy users
    await pool.query(createChatSql);

    // 6. Create chat visibility tables after the core chat tables exist
    await ensureChatVisibilityTables();

    // 7. Migrate legacy users to new schema
    await pool.query(migrateLegacyUsersSql);

    // 8. Create the user photos table.
    await pool.query(createUserPhotosSql);

    if (!schemaOnly) {
      // 9. Seed fake users only when full initialization is requested.
      await pool.query(seedFakeUsersSql);

      // 10. Seed photos only after fake users and the user photos table exist.
      await seedPhotosForExistingUsers({ closePool: false });
    }

  } catch (error) {
    console.error("Failed to initialize database:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

initDb();
