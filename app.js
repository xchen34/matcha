const express = require("express");
const cors = require("cors");
const healthRouter = require("./routes/health");
const dbHealthRouter = require("./routes/dbHealth");
const usersRouter = require("./routes/users");
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const likesRouter = require("./routes/likes");
const notificationsRouter = require("./routes/notifications");

const app = express();

const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-id"],
};

app.use(cors(corsOptions));

// Parse JSON request bodies - 这行代码启用 Express 内置的 JSON 解析中间件，允许服务器自动解析 Content-Type: application/json 的请求体，并将解析后的对象赋值给 req.body，方便后续路由处理使用。没有这行代码，req.body 将是 undefined，无法获取客户端发送的 JSON 数据。
/**
 * express.json() 是一个中间件：把请求体中 application/json 的内容解析成 JavaScript 对象，放到 req.body。
输入格式：HTTP 请求体里的 JSON 文本（例如 {"email":"a@b.com","password":"123"}）。
输出结果：在路由里可直接用 req.body.email 之类访问——这就是 JS 对象。
仅针对 JSON：Content-Type 需是 application/json（含 charset 也行）；表单 multipart/form-data 或 application/x-www-form-urlencoded 要用别的中间件。
 */
app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ extended: true, limit: "6mb" }));

/**
 * curl 手动测：开发者临时验证功能是否通、数据是否落库。需要人操作、看结果，无法持续监控，失败了也没人自动处理。
健康探针（health/db-health）：为部署/运维/负载均衡准备的“机器可读”检查，频繁自动调用（秒级/分钟级），用来：
让容器编排/负载均衡器判断实例是否存活、是否就绪，自动摘除/重启。
监控系统采集指标，触发告警。
提供快速自检（不改业务数据，只跑很轻的查询，如 SELECT 1/NOW()）。
为什么要写代码？

自动化：让平台而不是人来反复确认服务状态。
稳定性：探针逻辑应该轻量且无副作用，不能依赖业务写入。
标准化：业界习惯提供 liveness/readiness 路由或端点，方便 Kubernetes、负载均衡、APM 直接使用。
总结：curl 是手工验收；健康检查是自动、频繁、无副作用的存活/就绪信号。这是成熟应用的常规做法，尤其在容器/K8s/有负载均衡的环境里几乎是标配。
 */

//挂载子路由 不算中间件 /api：统一前缀，便于前端或反向代理只转发以 /api 开头的请求，页面静态资源等保持分离。实际路径分别是 /api/health, /api/db-health, /api/users, /api/auth/...。
app.use("/api", healthRouter);
app.use("/api", dbHealthRouter);
app.use("/api", usersRouter);
app.use("/api", authRouter);
app.use("/api", likesRouter);
app.use("/api", notificationsRouter);
app.use("/api", profileRouter);

// Fallback for unknown routesFallback for unknown routes：是兜底路由，只有当前面所有路由/方法都没匹配到时才执行，返回 404。
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

/*
错误处理 23505 → 409：PostgreSQL 错误码 23505 表示唯一约束冲突（unique constraint violation），例如 email/username 已存在。
代码里捕获它并返回 HTTP 409 Conflict，让前端知道是业务冲突而不是服务器崩溃。
会触发 23505（唯一约束冲突）的场景：

向有唯一约束/唯一索引的列插入或更新为重复值。你这张表里至少有 email UNIQUE、username UNIQUE。
例：注册时用已存在的 email 或 username。
还有主键也是唯一约束：如果你手动指定 id 且与已有行重复也会触发。
并发注册同一 email/username：即使你先查“没有”，两个请求同时插入也可能撞上，数据库用 23505 阻止第二个。
避免/处理方式：

让数据库保持唯一约束，不要删除它。
应用层在插入前可先查，但仍要在捕获 23505 后返回 409，让前端提示“已存在”。
若要看有哪些唯一约束/索引，可在 psql 里：
\d users
就能看到 UNIQUE 的列（email、username 以及主键）。
*/
// Basic centralized error handler
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
