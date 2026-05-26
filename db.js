const { Pool } = require("pg");

const poolConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
};

if (process.env.DB_USER) {
  poolConfig.user = process.env.DB_USER;
}

if (process.env.DB_PASSWORD) {
  poolConfig.password = process.env.DB_PASSWORD;
}

if (process.env.DB_NAME) {
  poolConfig.database = process.env.DB_NAME;
}

const pool = new Pool(poolConfig);

module.exports = pool;

// 这个模块创建了一个 PostgreSQL 连接池（Pool），并根据环境变量配置连接参数。连接池允许应用程序重用数据库连接，提高性能和资源利用率。其他模块可以通过 require("./db") 来获取这个连接池实例，并使用 pool.query() 方法执行 SQL 查询。