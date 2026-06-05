const express = require("express");
const { requireAuth } = require("./middleware/auth");
const { verifyRealtimeToken } = require("./realtime/authToken");
const cors = require("cors");
const helmet = require("helmet");
const pool = require("./db");
const healthRouter = require("./routes/health");
const dbHealthRouter = require("./routes/dbHealth");
const usersRouter = require("./routes/users");
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const likesRouter = require("./routes/likes");
const notificationsRouter = require("./routes/notifications");
const chatsRouter = require("./routes/chats");
const moderationRouter = require("./routes/moderation");
const { csrfProtection } = require("./middleware/csrfProtection");
const { globalApiLimiter } = require("./middleware/rateLimit");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

/**
 * Parse the allowed frontend origins from environment configuration.
 *
 * Implementation details:
 * - reads a comma-separated list from `CORS_ORIGIN`
 * - trims whitespace from each entry
 * - removes empty entries so accidental extra commas do not break the list
 *
 * 中文说明：这个函数用于读取并整理允许跨域的前端来源列表。
 */
function parseAllowedOrigins() {
  const raw = process.env.CORS_ORIGIN || "http://localhost:5173";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins();

app.disable("x-powered-by");

app.use(
  helmet({
    // Baseline CSP to harden browser clients that may hit API routes directly.
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    // Keep dev/proxy setup simple; COEP is not needed for this API server.
    crossOriginEmbedderPolicy: false,
    // Only force HTTPS in production.
    hsts: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
  }),
);

const corsOptions = {
  /**
   * Decide whether a request origin should be allowed by CORS.
   *
   * Implementation details:
   * - allow requests that have no `Origin` header, which keeps curl/Postman usable
   * - allow only origins that are explicitly listed in `allowedOrigins`
   * - reject everything else with a clear error so the browser blocks it
   *
   * 中文说明：【重要】这是 CORS 白名单校验函数，决定哪些前端地址可以访问 API。
   */
  origin(origin, callback) {
    // Allow server-to-server and non-browser tools (curl/Postman) without Origin.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS origin not allowed"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

/**
 * Parse JSON and URL-encoded request bodies before route handlers run.
 *
 * Implementation details:
 * - `express.json({ limit: "6mb" })` turns JSON text into `req.body`
 * - `express.urlencoded({ extended: true, limit: "6mb" })` supports form-style
 *   encoded payloads
 * - the size limit prevents very large payloads from consuming too much memory
 *
 * 中文说明：【重要】这是请求体解析中间件，没有它很多路由拿不到 `req.body`。
 */
app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ extended: true, limit: "6mb" }));

/**
 * Apply the CSRF origin check to all incoming requests.
 *
 * Implementation details:
 * - lets safe HTTP methods pass immediately
 * - validates the request origin for state-changing routes
 * - blocks requests that appear to come from an untrusted browser origin
 *
 * 中文说明：【重要】这是 CSRF 防护中间件，用来拦截不可信来源的写操作请求。
 */
app.use(csrfProtection);

/**
 * Apply the global API rate limiter under the `/api` prefix.
 *
 * Implementation details:
 * - keeps all API traffic within a per-IP request budget
 * - helps reduce abuse, brute force attempts, and accidental traffic spikes
 *
 * 中文说明：【重要】这是全局 API 限流入口，用来保护接口不被刷爆。
 */
app.use("/api", globalApiLimiter);

/**
 * Update the user's last_seen_at timestamp when a valid token is present.
 *
 * Implementation details:
 * - reads the Bearer token from the Authorization header
 * - verifies the token with the same realtime token verifier used elsewhere
 * - extracts the user ID and updates `users.last_seen_at`
 * - ignores database errors so the request flow is not blocked by presence tracking
 *
 * 中文说明：【重要】这是在线状态/最近活跃时间的后台更新中间件。
 */
app.use((req, res, next) => {
  const authHeader = req.header("authorization");
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";
  const claims = verifyRealtimeToken(token);
  const userId = Number(claims?.userId);

  if (Number.isInteger(userId) && userId > 0) {
    pool
      .query(
        `
        UPDATE users
        SET last_seen_at = NOW()
        WHERE id = $1
        `,
        [userId],
      )
      .catch(() => {
        // Keep requests flowing even if database schema isn't fully migrated yet.
      });
  }

  next();
});

/**
 * Mount the public and protected routers under the `/api` prefix.
 *
 * Implementation details:
 * - the health and db-health routers stay public so infrastructure can probe them
 * - auth routes stay public because login/register/reset endpoints must be reachable
 * - user-like profile/chat/notification/moderation routes require `requireAuth`
 * - the `/api` prefix keeps API paths grouped and separate from static assets
 *
 * 中文说明：【重要】这是 API 路由总挂载点，决定每个子路由是否需要登录态。
 */
app.use("/api", healthRouter); 
app.use("/api", dbHealthRouter);
app.use("/api", authRouter); 
app.use("/api", requireAuth, usersRouter);
app.use("/api", requireAuth, likesRouter);
app.use("/api", requireAuth, notificationsRouter);
app.use("/api", requireAuth, chatsRouter);
app.use("/api", requireAuth, moderationRouter);
app.use("/api", requireAuth, profileRouter);

/**
 * Return a 404 response for any route that was not matched above.
 *
 * Implementation details:
 * - runs only after every mounted route and middleware has already been tried
 * - prevents unknown paths from falling through with an ambiguous response
 *
 * 中文说明：【重要】这是未知路由兜底，没匹配到任何接口时返回 404。
 */
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

/**
 * Centralize error handling for the whole Express app.
 *
 * Implementation details:
 * - converts oversized payload errors into HTTP 413
 * - converts PostgreSQL unique-constraint conflicts (`23505`) into HTTP 409
 * - falls back to HTTP 500 for everything else
 * - keeps the actual error-handling logic in one place instead of duplicating it
 *
 * 中文说明：【重要】这是全局错误处理中间件，负责把数据库和请求错误统一转换成 HTTP 响应。
 */
app.use((err, req, res, next) => {
  console.error(err);

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      error:
        "Request payload is too large. Please reduce image size or number of images.",
    });
  }

  if (err.code === "23505") {
    return res.status(409).json({ error: "Duplicate value" });
  }

  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
