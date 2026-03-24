const express = require("express");
const cors = require("cors");
const healthRouter = require("./routes/health");
const dbHealthRouter = require("./routes/dbHealth");
const usersRouter = require("./routes/users");
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");

const app = express();

const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Parse JSON request bodies
app.use(express.json());

app.use("/api", healthRouter);
app.use("/api", dbHealthRouter);
app.use("/api", usersRouter);
app.use("/api", authRouter);
app.use("/api", profileRouter);

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Basic centralized error handler
app.use((err, req, res, next) => {
  console.error(err);

  if (err.code === "23505") {
    return res.status(409).json({ error: "Duplicate value" });
  }

  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
