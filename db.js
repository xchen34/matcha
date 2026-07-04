const { Pool } = require("pg");

function shouldUseSsl() {
  const raw = String(process.env.DB_SSL || "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "require";
}

function buildSslConfig() {
  if (!shouldUseSsl()) {
    return undefined;
  }

  return {
    rejectUnauthorized:
      String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "false")
        .trim()
        .toLowerCase() === "true",
  };
}

const connectionString = String(process.env.DATABASE_URL || "").trim();

const poolConfig = connectionString
  ? {
      connectionString,
    }
  : {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
    };

if (!connectionString && process.env.DB_USER) {
  poolConfig.user = process.env.DB_USER;
}

if (!connectionString && process.env.DB_PASSWORD) {
  poolConfig.password = process.env.DB_PASSWORD;
}

if (!connectionString && process.env.DB_NAME) {
  poolConfig.database = process.env.DB_NAME;
}

const ssl = buildSslConfig();
if (ssl) {
  poolConfig.ssl = ssl;
}

const pool = new Pool(poolConfig);

module.exports = pool;

// 这个模块创建了一个 PostgreSQL 连接池（Pool），并根据环境变量配置连接参数。连接池允许应用程序重用数据库连接，提高性能和资源利用率。其他模块可以通过 require("./db") 来获取这个连接池实例，并使用 pool.query() 方法执行 SQL 查询。
