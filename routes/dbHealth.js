const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/db-health", async (req, res, next) => {
  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({
      status: "ok",
      db: "connected",
      now: result.rows[0].now,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
