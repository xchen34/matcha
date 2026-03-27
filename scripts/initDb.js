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
    const sqlPath = path.join(__dirname, "sql", "create_users_table.sql");
    const profilesSqlPath = path.join(__dirname, "sql", "create_profiles_table.sql");
    const createUsersSql = fs.readFileSync(sqlPath, "utf8"); // 读取 create_users_table.sql 文件内容，得到创建 users 表的 SQL 语句。utf8 参数确保正确解析文本文件。
    const createProfilesSql = fs.readFileSync(profilesSqlPath, "utf8");
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

    // 执行 SQL 语句，创建 users 表和 profiles 表，并进行迁移。每条 SQL 语句都会被发送到数据库执行，确保数据库结构符合应用的需求。迁移脚本会处理现有数据的兼容性问题，添加必要的字段并设置默认值，以便新旧数据都能正常工作。
    await pool.query(createUsersSql);
    await pool.query(migrateLegacyUsersSql);
    await pool.query(createProfilesSql);

    console.log("Database initialized: users and profiles tables are ready.");
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