# Email Verification Implementation Guide

## 概述
已实现完整的邮件验证流程，符合项目要求：
- 用户注册后自动发送验证邮件
- 验证邮件包含唯一的验证令牌
- 验证令牌24小时有效
- 用户必须验证邮件才能登录
- 支持重新发送验证邮件

## 流程说明

### 1. 用户注册
```
POST /api/auth/register
{
  "email": "user@example.com",
  "username": "username",
  "password": "password",
  "birth_date": "2000-01-15"
}
```

**响应:**
- 创建用户账户
- 生成24小时有效的验证令牌
- 发送验证邮件到用户邮箱
- 返回 201 状态码和用户信息

### 2. 邮件验证
用户收到邮件后，点击验证链接：
```
http://localhost:5173/verify-email?token=<verification_token>
```

**验证流程:**
```
POST /api/auth/verify-email
{
  "token": "<verification_token>"
}
```

**验证成功后:**
- 标记 `email_verified = TRUE`
- 清除验证令牌
- 用户可以登录

### 3. 登录
```
POST /api/auth/login
{
  "username": "username",
  "password": "password"
}
```

**登录检查:**
- 验证用户名和密码
- **检查 email_verified 状态**
- 如果未验证，返回 403 错误

### 4. 重新发送验证邮件
```
POST /api/auth/resend-verification-email
{
  "email": "user@example.com"
}
```

**说明:**
- 生成新的验证令牌
- 重新发送验证邮件
- 不会暴露邮箱是否存在（安全性考虑）

## 配置

### 环境变量 (.env)

#### 前端配置
```
FRONTEND_BASE_URL=http://localhost:5173
```

#### SMTP 邮件配置

**开发环境（使用 Ethereal Email 测试）:**
```
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your_ethereal_email@ethereal.email
SMTP_PASSWORD=your_ethereal_password
SMTP_FROM_EMAIL=noreply@matcha.local
```

获取 Ethereal 测试账号：https://ethereal.email/create

**生产环境（示例 Gmail）:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@matcha.com
```

其他SMTP提供商选项：
- SendGrid
- AWS SES
- Mailgun
- Brevo (formerly Sendinblue)

## 数据库变更

添加了新的列到 `users` 表：

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verification_token_expiry TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_email_verification_token ON users(email_verification_token);
```

## 前端页面

### VerifyEmailPage (`/verify-email?token=xxx`)
- 自动验证邮件
- 显示验证状态（进行中、成功、失败）
- 成功后自动跳转到登录页面
- 失败时提供重新发送选项

### ResendVerificationPage (`/resend-verification`)
- 允许用户输入邮箱地址
- 重新发送验证邮件
- 提示用户检查邮箱

### 登录页面修改
- 集成了邮件验证检查
- 显示"Email not verified"错误时，提供重新发送链接

## 错误处理

### HTTP 状态码

| 端点 | 状态码 | 说明 |
|------|--------|------|
| 注册 | 201 | 注册成功，邮件已发送 |
| 登录 | 403 | 邮件未验证 |
| 验证 | 200 | 验证成功 |
| 验证 | 400 | 令牌无效或过期 |
| 重发 | 200 | 邮件已发送（或不存在该邮箱） |

### 错误消息

```json
{
  "error": "Email not verified. Please check your email and click the verification link to complete registration."
}
```

## 安全性考虑

1. **令牌生成**: 使用 `crypto.randomBytes(32)` 生成32字节的随机令牌
2. **令牌有效期**: 24小时，超期自动失效
3. **令牌存储**: 保存为明文（不需要哈希，因为只用一次）
4. **邮箱暴露**: 重发端点不暴露邮箱是否存在
5. **SQL注入**: 使用参数化查询（$1, $2...）
6. **XSS防护**: 令牌仅通过查询参数传递

## 测试步骤

### 本地测试（使用 Ethereal）

1. **配置 Ethereal 账号**
   - 访问 https://ethereal.email/create
   - 获取测试邮箱和密码
   - 将凭据添加到 .env

2. **启动服务器**
   ```bash
   npm run dev
   ```

3. **注册账户**
   - 访问 http://localhost:5173/register
   - 填写注册表单
   - 后端会发送验证邮件到 Ethereal

4. **查看邮件**
   - 登录 Ethereal 账户
   - 查看接收到的验证邮件
   - 点击验证链接或复制令牌

5. **验证邮箱**
   - 点击邮件中的验证链接
   - 或访问 `/verify-email?token=<token>`
   - 看到成功消息

6. **登录**
   - 用注册的用户名和密码登录
   - 应该成功登录

### 生产测试（真实邮箱）

1. 配置真实的 SMTP 服务器（Gmail, SendGrid 等）
2. 更新 .env 文件
3. 重启服务器
4. 按照上述步骤测试

## 故障排除

### 邮件未发送

**问题:** 邮件发送失败但应用继续运行

**原因:** 
- SMTP 凭据不正确
- 防火墙阻止 SMTP 端口
- 网络连接问题

**解决:**
1. 检查 .env 中的 SMTP 配置
2. 查看服务器日志中的错误信息
3. 测试 SMTP 连接：
   ```bash
   node scripts/testEmail.js
   ```

### 验证令牌过期

**问题:** 用户点击验证链接时显示"Invalid or expired verification token"

**原因:** 令牌超过24小时

**解决:** 用户可以访问 `/resend-verification` 获取新令牌

### 用户无法登录

**问题:** 登录返回"Email not verified"错误

**原因:** 用户还未完成邮箱验证

**解决:** 提示用户检查邮箱并点击验证链接

## 未来改进

- [ ] 支持多语言邮件模板
- [ ] 添加邮件模板自定义
- [ ] 支持主题和发件人名称自定义
- [ ] 添加邮件发送重试机制
- [ ] 实现邮件发送日志
- [ ] 支持更多 SMTP 提供商集成
