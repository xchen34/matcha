const crypto = require("crypto"); // 引入 Node.js 加密模块，用于 HMAC 签名与安全比较。

const REALTIME_TOKEN_TTL_SECONDS = Number( // 读取实时 token 有效期（秒）。
  process.env.REALTIME_TOKEN_TTL_SECONDS || 60 * 15, // 默认 15 分钟。
);

/**
 * Auth Token 快速笔记（面向初学者）
 *
 * 1) 这个文件里的 token 不是“加密数据”，而是“可读 payload + 不可伪造签名”。
 *    - payload: 放 userId、签发时间 iat、过期时间 exp（可被解码查看）
 *    - signature: 用 secret 算出来的签名（客户端无法伪造）
 *
 * 2) token 结构（两段）:
 *    base64url(payloadJson) + "." + base64url(hmacSha256(payloadEncoded, secret))
 *
 * 3) Base64URL 作用:
 *    - 只负责“编码格式转换”，不负责安全性
 *    - 把 + / = 换成 URL 更安全的字符，方便放在 header/query/cookie
 *
 * 4) secret 放什么:
 *    - 存“服务端签名密钥”（例如随机长字符串）
 *    - 不存 token，不存 base64 后的 token
 *    - 服务端用同一个 secret 来签发和验签
 *
 * 5) 验证时发生了什么:
 *    - 拆 token 为 payloadEncoded 和 providedSignature
 *    - 用 payloadEncoded + secret 重算 expectedSignature
 *    - timingSafeEqual 比较签名
 *    - 解码 payload，检查 sub/exp 是否有效、是否过期
 */

/**
 * 函数功能：获取 realtime token 的签名密钥。
 * 优先使用环境变量 REALTIME_SECRET；未配置时使用开发默认值。
 */
function getRealtimeSecret() {
  return process.env.REALTIME_SECRET || "matcha-dev-realtime-secret-change-me"; // 返回签名密钥字符串。
}

/*  ========== BASE64 URL Helpers  ========== */
/**
 * 函数功能：将 UTF-8 字符串编码为 Base64URL。
 * 过程：原始字符串 -> 标准 Base64 -> URL 安全替换（并去掉 '='）
 * 注意：这是“编码”，不是“加密”。
 */
function base64UrlEncode(value) {
  return Buffer.from(value) // 把输入字符串转为二进制 Buffer。
    .toString("base64") // 先编码为标准 Base64。
    .replace(/=/g, "") // 去掉 Base64 的填充符号 '='。
    .replace(/\+/g, "-") // 将 '+' 替换为 URL 安全字符 '-'.
    .replace(/\//g, "_"); // 将 '/' 替换为 URL 安全字符 '_'.
}

/**
 * 函数功能：将 Base64URL 字符串解码回原始 UTF-8 字符串。
 * 过程：Base64URL -> 还原成标准 Base64（补 '='、替换字符）-> UTF-8 字符串
 */
function base64UrlDecode(value) {
  const padding = "=".repeat((4 - (value.length % 4 || 4)) % 4); // 按 Base64 要求补齐长度到 4 的倍数。
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + padding; // 还原为标准 Base64 字符集并拼接补位。

  return Buffer.from(normalized, "base64").toString("utf8"); // 解码后返回 UTF-8 字符串。
}

/*  ========== SIGN  ========== */
/**
 * 函数功能：对 payload 字符串做 HMAC-SHA256 签名，并输出 Base64URL。
 * 这里的 payloadString 已经是 base64url(payloadJson) 这一段。
 * 重点：签名依赖 secret。没有 secret，就无法伪造有效签名。
 */
function signPayload(payloadString) {
  return crypto
    .createHmac("sha256", getRealtimeSecret()) // 使用密钥创建 HMAC-SHA256 签名器。
    .update(payloadString) // 输入待签名内容。
    .digest("base64") // 输出标准 Base64 签名。
    .replace(/=/g, "") // 去掉填充符 '='。
    .replace(/\+/g, "-") // 转为 URL 安全字符 '-'.
    .replace(/\//g, "_"); // 转为 URL 安全字符 '_'.
}

/*  ========== TOKEN CREATION & VERIFICATION  ========== */
/**
 * 函数功能：为指定用户生成 realtime token。
 * token 结构：base64url(payloadJson).base64url(signature)
 *
 * 例子（示意）：
 * payloadJson = {"sub":42,"iat":1710000000,"exp":1710000900}
 * payloadEncoded = eyJzdWIiOjQyLCJpYXQiOjE3MTAwMDAwMDAsImV4cCI6MTcxMDAwMDkwMH0
 * token = payloadEncoded + "." + signature
 */
function createRealtimeToken(userId) {
  const now = Math.floor(Date.now() / 1000); // 当前 Unix 时间戳（秒）。
  const payload = {
    sub: Number(userId), // 主题（用户 ID）。
    iat: now, // 签发时间。
    exp: now + REALTIME_TOKEN_TTL_SECONDS, // 过期时间。
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload)); // 将 payload 序列化后进行 Base64URL 编码。
  const signature = signPayload(payloadEncoded); // 对编码后的 payload 进行签名。

  return `${payloadEncoded}.${signature}`; // 返回“payload.签名”的 token 字符串。
}

/**
 * 函数功能：校验 realtime token 的格式、签名与有效期。
 * 校验成功返回 { userId, exp }，失败返回 null。
 *
 * 验证顺序：
 * 1. 结构合法（必须两段）
 * 2. 签名合法（服务端重算后与传入签名一致）
 * 3. payload 可解码且字段合法（sub/exp）
 * 4. exp 未过期
 */
function verifyRealtimeToken(token) {
  if (!token || typeof token !== "string") { // token 为空或非字符串直接判定无效。
    return null;
  }

  const tokenParts = token.split("."); // 按 '.' 拆分 payload 与 signature。
  if (tokenParts.length !== 2) { // 结构不是两段则无效。
    return null;
  }

  const [payloadEncoded, providedSignature] = tokenParts; // 取出编码后的 payload 与客户端提供的签名。
  const expectedSignature = signPayload(payloadEncoded); // 使用服务端密钥重算期望签名。
  const providedBuffer = Buffer.from(providedSignature); // 将提供签名转成 Buffer。
  const expectedBuffer = Buffer.from(expectedSignature); // 将期望签名转成 Buffer。

  if (
    providedBuffer.length !== expectedBuffer.length || // 长度不一致时直接失败。
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer) // 使用抗时序攻击比较判断签名是否一致。
  ) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadEncoded)); // 解码并解析 payload JSON。
  } catch {
    return null; // 解码或 JSON 解析失败时判定无效。
  }

  const now = Math.floor(Date.now() / 1000); // 当前 Unix 时间戳（秒）。
  const userId = Number(payload?.sub); // 读取用户 ID。
  const exp = Number(payload?.exp); // 读取过期时间。

  if (!Number.isInteger(userId) || userId <= 0) { // userId 非正整数则无效。
    return null;
  }

  if (!Number.isInteger(exp) || exp <= now) { // 过期时间非法或已过期则无效。
    return null;
  }

  return {
    userId, // 返回通过校验的用户 ID。
    exp, // 返回过期时间，方便上层按需使用。
  };
}

module.exports = {
  createRealtimeToken, // 导出 token 生成函数。
  verifyRealtimeToken, // 导出 token 校验函数。
  REALTIME_TOKEN_TTL_SECONDS,
}; // 导出 authToken 模块公共接口。
