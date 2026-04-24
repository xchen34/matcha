require("dotenv").config();
const fs = require("fs"); // 引入 Node.js 的文件系统模块，用于读取 SQL 文件内容。
const path = require("path");
const pool = require("../db");

/**
 * initDb 是一个异步函数，用于初始化数据库结构。它首先构建 SQL 文件的路径，
 * 然后读取这些文件的内容，得到创建 users 表和 profiles 表的 SQL 语句。
 * 接着，它执行这些 SQL 语句来创建表结构，并且包含了一个迁移脚本 migrateLegacyUsersSql，
 * 用于将现有的 users 表结构迁移到新的结构，添加必要的字段并设置默认值。
 * 最后，函数会输出数据库初始化完成的消息，如果发生错误则输出错误信息，并确保在完成后关闭数据库连接。
 */
async function initDb() {
  try {
    const usersSqlPath = path.join(__dirname, "sql", "create_users_table.sql");
    const createUsersSql = fs.readFileSync(usersSqlPath, "utf8"); // 创建 users 表

    const profilesSqlPath = path.join(
      __dirname,
      "sql",
      "create_profiles_table.sql",
    );
    const createProfilesSql = fs.readFileSync(profilesSqlPath, "utf8");

    const likesSqlPath = path.join(__dirname, "sql", "create_likes_table.sql");
    const createLikesSql = fs.readFileSync(likesSqlPath, "utf8");
    const viewsSqlPath = path.join(__dirname, "sql", "create_views_table.sql");
    const createViewsSql = fs.readFileSync(viewsSqlPath, "utf8");
    const tagsSqlPath = path.join(__dirname, "sql", "create_tags_table.sql");
    const createTagsSql = fs.readFileSync(tagsSqlPath, "utf8");
    const seedDefaultTagsSqlPath = path.join(
      __dirname,
      "sql",
      "seed_default_tags.sql",
    );
    const seedDefaultTagsSql = fs.readFileSync(seedDefaultTagsSqlPath, "utf8");
    const profileTagsSqlPath = path.join(
      __dirname,
      "sql",
      "create_profile_tags_table.sql",
    );
    const createProfileTagsSql = fs.readFileSync(profileTagsSqlPath, "utf8");
    const userPhotosSqlPath = path.join(
      __dirname,
      "sql",
      "create_user_photos_table.sql",
    );
    const createUserPhotosSql = fs.readFileSync(userPhotosSqlPath, "utf8");
    const notificationsSqlPath = path.join(
      __dirname,
      "sql",
      "create_notifications_table.sql",
    );
    const createNotificationsSql = fs.readFileSync(
      notificationsSqlPath,
      "utf8",
    );
    const fakeReportsSqlPath = path.join(
      __dirname,
      "sql",
      "create_fake_account_reports_table.sql",
    );
    const createFakeReportsSql = fs.readFileSync(fakeReportsSqlPath, "utf8");
    const userBlocksSqlPath = path.join(
      __dirname,
      "sql",
      "create_user_blocks_table.sql",
    );
    const createUserBlocksSql = fs.readFileSync(userBlocksSqlPath, "utf8");
    const chatSqlPath = path.join(
      __dirname,
      "sql",
      "create_chat_tables.sql",
    );
    const createChatSql = fs.readFileSync(chatSqlPath, "utf8");
    const seedFakeUsersSqlPath = path.join(
      __dirname,
      "sql",
      "seed_fake_users.sql",
    );
    const seedFakeUsersSql = fs.readFileSync(seedFakeUsersSqlPath, "utf8");
    const seedUserPhotosSql = `
      INSERT INTO user_photos (user_id, data_url, is_primary)
      SELECT
        u.id,
        CASE
          WHEN p.gender = 'female'
            THEN 'https://randomuser.me/api/portraits/women/' || (u.id % 100) || '.jpg'
          WHEN p.gender = 'male'
            THEN 'https://randomuser.me/api/portraits/men/' || (u.id % 100) || '.jpg'
          ELSE
            'https://images.unsplash.com/photo-1517841905240-472988babdf9'
        END,
        TRUE
      FROM users u
      INNER JOIN profiles p ON p.user_id = u.id
      LEFT JOIN user_photos up ON up.user_id = u.id
      WHERE up.user_id IS NULL;
    `;
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
      ALTER TABLE users ALTER COLUMN last_seen_at SET NOT NULL;
      ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW();

      CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (username);
      CREATE INDEX IF NOT EXISTS idx_email_verification_token ON users(email_verification_token);
      CREATE INDEX IF NOT EXISTS idx_users_pending_email ON users(pending_email);
      CREATE INDEX IF NOT EXISTS idx_password_reset_token ON users(password_reset_token);

      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(120) NOT NULL DEFAULT '';
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gps_consent BOOLEAN NOT NULL DEFAULT FALSE;

    `;

    // 执行 SQL 语句，创建 users 表和 profiles 表，并进行迁移。每条 SQL 语句都会被发送到数据库执行，确保数据库结构符合应用的需求。迁移脚本会处理现有数据的兼容性问题，添加必要的字段并设置默认值，以便新旧数据都能正常工作。
    await pool.query(createUsersSql);
    await pool.query(createProfilesSql);
    await pool.query(createLikesSql);
    await pool.query(createViewsSql);
    await pool.query(createTagsSql);
    await pool.query(seedDefaultTagsSql);
    await pool.query(createProfileTagsSql);
    await pool.query(createUserPhotosSql);
    await pool.query(createNotificationsSql);
    await pool.query(createFakeReportsSql);
    await pool.query(createUserBlocksSql);
    await pool.query(createChatSql);
    await pool.query(migrateLegacyUsersSql);
    await pool.query(seedFakeUsersSql);
    await pool.query(seedUserPhotosSql);
    // const { spawnSync } = require("child_process");
    // const result = spawnSync("node", [path.join(__dirname, "seed_photos_for_existing_users.js")], { stdio: "inherit" });
    // if (result.status !== 0) {
    //   throw new Error("Seeding user photos failed");
    // }
  } catch (error) {
    console.error("Failed to initialize database:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

initDb();

/**
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...：如果还没有 email_verified 列，就加一个，类型布尔，默认值 FALSE。
一系列 UPDATE ... SET ... WHERE ... IS NULL OR ... = ''：
给缺失的 username 填充成 user_<id>。
给缺失的 first_name 设成 "Unknown"。
给缺失的 last_name 设成 "User"。
给缺失的 password_hash 填上一个固定的 bcrypt 哈希（只是占位，实际场景应改成强密码或要求重置）。
给缺失的 email_verified 填 FALSE。
目的：清理历史脏数据，避免后面的 NOT NULL 约束报错。
ALTER TABLE ... ALTER COLUMN ... SET NOT NULL：把 username / first_name / last_name / password_hash / email_verified 设为非空约束，保证新数据不再留空。
ALTER TABLE ... ALTER COLUMN email_verified SET DEFAULT FALSE：保持默认值为 FALSE；created_at SET DEFAULT NOW() 设置插入时自动填当前时间。
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (username);
给 email 和 username 建唯一索引，防止重复注册，加速按这些字段查询。 

* user_' || id 用的是 SQL 的字符串拼接运算符 ||：

左边字面量 'user_'，右边是整型 id。
|| 把两边转成文本再连起来，结果类似 user_7、user_42。
这里用来给缺失的用户名填一个基于主键的默认值，保证唯一性且不会为 NULL。
 
迁移”就是把数据库模式/数据从旧状态改到新状态的一次可重复脚本。每次改表结构（加列、建索引、修旧数据）都会有一条“迁移”。跑完迁移，库结构就和代码预期一致了。
这里 initDb.js 依次执行三段 SQL：
createUsersSql（文件 scripts/sql/create_users_table.sql）：建用户表的基础结构，可重复跑，IF NOT EXISTS 保证幂等。
migrateLegacyUsersSql（代码里的多行字符串）：给旧表补列、填默认值、加 NOT NULL/唯一索引——这就是迁移脚本，用来把历史数据修到新结构。
createProfilesSql（文件 scripts/sql/create_profiles_table.sql）：建 profile 表。
为什么有的放文件、有的写在代码里：
大的、稳定的建表语句放在独立 .sql 文件，便于阅读和版本控制。
针对当前项目特定的修补/演进步骤（例如清洗旧数据）可能更临时，直接写在 JS 里方便修改；也可以拆成独立迁移文件，这纯属项目风格选择。

*/
