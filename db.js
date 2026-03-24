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
