# Token et sécurité du projet Matcha

Ce document résume, en français, les échanges sur :
- le `realtime token`
- la différence avec un JWT standard
- le moment où le token est obtenu pour la première connexion
- les principales mesures de cybersécurité présentes dans le projet

## 1. Vue d'ensemble des tokens

Dans ce projet, il faut distinguer :

- le token utilisé pour l'authentification HTTP
- le token utilisé pour la connexion realtime / Socket.IO

En pratique, le projet utilise une **même famille de token maison**, avec une logique commune de signature et de vérification. Ce n'est **pas un JWT standard** au sens strict.

### Ce que ce token contient

Le token realtime contient essentiellement :

- `sub` : l'identifiant de l'utilisateur
- `iat` : la date de génération
- `exp` : la date d'expiration

Il est composé de deux parties :

- `payload`
- `signature`

La signature est calculée avec `HMAC-SHA256`.

Fichier de référence :

- [realtime/authToken.js](/Users/leochen/matcha2/realtime/authToken.js)

## 2. Est-ce un JWT ?

Réponse courte : **non, pas un JWT standard**.

Un JWT standard ressemble à :

```text
header.payload.signature
```

Le token du projet ressemble plutôt à :

```text
payload.signature
```

Donc :

- même idée générale de signature
- même logique de base64url
- même usage d'un `exp`
- mais **pas le format JWT officiel**

Fichier de référence :

- [realtime/authToken.js](/Users/leochen/matcha2/realtime/authToken.js)

## 3. À quel moment le premier token est obtenu ?

Le premier token est obtenu **au moment du login réussi**.

### Flux réel

1. L'utilisateur saisit son identifiant et son mot de passe
2. Le front envoie `POST /api/auth/login`
3. Le backend vérifie les identifiants
4. Si le login réussit, le backend renvoie `realtime_token`
5. Le front sauvegarde l'utilisateur complet, token inclus
6. Les requêtes suivantes peuvent alors utiliser ce token

Fichiers de référence :

- [controllers/auth/login.js](/Users/leochen/matcha2/controllers/auth/login.js)
- [frontend/src/auth/hooks/useLogin.js](/Users/leochen/matcha2/frontend/src/auth/hooks/useLogin.js)

## 4. Où le token est stocké ?

Le token est stocké à deux endroits :

### 4.1 `currentUser` en mémoire

Le token est gardé dans l'état React de l'utilisateur courant.

Fichier de référence :

- [frontend/src/hooks/useCurrentUser.js](/Users/leochen/matcha2/frontend/src/hooks/useCurrentUser.js)

### 4.2 `localStorage`

L'utilisateur entier est sauvegardé dans `localStorage` sous la clé :

```text
matcha.currentUser
```

Le token est donc persistant entre deux rechargements de page.

Fichier de référence :

- [frontend/src/utils/userStorage.js](/Users/leochen/matcha2/frontend/src/utils/userStorage.js)

## 5. Comment le token est injecté dans les requêtes ?

La fonction `buildApiHeaders()` récupère le token dans cet ordre :

1. `currentUser.realtime_token`
2. puis, si absent, le token sauvegardé dans `localStorage`

Elle ajoute ensuite :

```http
Authorization: Bearer <token>
```

Fichier de référence :

- [frontend/src/utils/utils.js](/Users/leochen/matcha2/frontend/src/utils/utils.js)

## 6. Comment le projet évite le problème "pas de token au premier login" ?

Le point important est le suivant :

- au tout premier login, l'utilisateur **n'a pas encore de token**
- c'est normal
- le token est renvoyé **par la réponse du login**

### La protection réelle

Le projet évite les erreurs grâce à plusieurs garde-fous :

- le login lui-même ne dépend pas du token
- le backend crée le token après validation du mot de passe
- le front sauvegarde immédiatement l'utilisateur retourné
- les requêtes protégées utilisent `buildApiHeaders()`
- le socket realtime ne se connecte que si `id` et `realtime_token` existent
- si le token manque ou expire, le hook realtime le redemande automatiquement

Fichiers de référence :

- [controllers/auth/login.js](/Users/leochen/matcha2/controllers/auth/login.js)
- [frontend/src/auth/hooks/useLogin.js](/Users/leochen/matcha2/frontend/src/auth/hooks/useLogin.js)
- [frontend/src/utils/utils.js](/Users/leochen/matcha2/frontend/src/utils/utils.js)
- [frontend/src/hooks/useRealtimeConnection.js](/Users/leochen/matcha2/frontend/src/hooks/useRealtimeConnection.js)

## 7. Le token realtime et le token API sont-ils identiques ?

Dans ce projet, ils utilisent la **même logique de token** et la **même vérification**.

Donc :

- même structure
- même signature
- même mécanisme d'expiration
- même fonction de vérification

Mais ils ne sont pas un JWT standard.

### Usage pratique

- HTTP : token envoyé dans `Authorization`
- Socket.IO : token envoyé dans le handshake

Fichiers de référence :

- [middleware/auth.js](/Users/leochen/matcha2/middleware/auth.js)
- [realtime/index.js](/Users/leochen/matcha2/realtime/index.js)
- [realtime/handlers.js](/Users/leochen/matcha2/realtime/handlers.js)

## 8. Mécanisme d'expiration du token

Le token a une expiration basée sur `exp`.

### Fonctionnement

Lors de la création :

- `now = Date.now() / 1000`
- `exp = now + REALTIME_TOKEN_TTL_SECONDS`

Lors de la vérification :

- le projet lit `exp`
- si `exp <= now`, le token est rejeté

La durée par défaut est d'environ **15 minutes**.

Fichier de référence :

- [realtime/authToken.js](/Users/leochen/matcha2/realtime/authToken.js)

## 9. Sécurité du projet : mesures déjà en place

Cette section résume les principales protections présentes dans le code.

### 9.1 Durcissement HTTP et navigateur

Dans `app.js`, le projet utilise :

- `helmet`
- une Content Security Policy
- `HSTS` en production
- `app.disable("x-powered-by")`
- CORS limité à une liste d'origines autorisées
- parsing JSON / URL-encoded limité à `6mb`

Fichier de référence :

- [app.js](/Users/leochen/matcha2/app.js)

### 9.2 Protection CSRF

Le middleware `csrfProtection` :

- laisse passer les méthodes sûres : `GET`, `HEAD`, `OPTIONS`
- vérifie `Origin` puis `Referer`
- refuse les requêtes mutantes venant d'une origine non approuvée

Fichier de référence :

- [middleware/csrfProtection.js](/Users/leochen/matcha2/middleware/csrfProtection.js)

### 9.3 Limitation de débit

Le projet a plusieurs rate limiters :

- `globalApiLimiter`
- `authLimiter`
- `authSensitiveLimiter`

Le rate limit sensible utilise `skipSuccessfulRequests: true`, ce qui évite de pénaliser les actions légitimes réussies.

Fichier de référence :

- [middleware/rateLimit.js](/Users/leochen/matcha2/middleware/rateLimit.js)

### 9.4 Authentification et autorisation

Le middleware `requireAuth` :

- lit `Authorization: Bearer <token>`
- vérifie la signature
- vérifie l'expiration
- confirme que l'utilisateur existe encore
- injecte `req.userId`

Fichier de référence :

- [middleware/auth.js](/Users/leochen/matcha2/middleware/auth.js)

### 9.5 Vérification realtime

Le serveur Socket.IO vérifie le token avant d'accepter une connexion realtime.

Il :

- extrait le token du handshake
- valide sa signature
- refuse la connexion si le token est invalide
- associe ensuite `socket.data.userId`

Fichiers de référence :

- [realtime/index.js](/Users/leochen/matcha2/realtime/index.js)
- [realtime/handlers.js](/Users/leochen/matcha2/realtime/handlers.js)

### 9.6 Mots de passe et récupération de compte

Le projet utilise :

- `bcrypt` pour hasher les mots de passe
- des tokens de vérification par e-mail
- des tokens de réinitialisation de mot de passe
- une expiration de ces tokens
- la suppression des tokens après usage

Fichiers de référence :

- [controllers/auth/register.js](/Users/leochen/matcha2/controllers/auth/register.js)
- [controllers/auth/password.js](/Users/leochen/matcha2/controllers/auth/password.js)
- [controllers/auth/verification.js](/Users/leochen/matcha2/controllers/auth/verification.js)
- [services/authService.js](/Users/leochen/matcha2/services/authService.js)

### 9.7 Validation des entrées

Le projet vérifie beaucoup d'entrées côté backend :

- email valide
- mot de passe valide
- âge minimum
- format du nom d'utilisateur
- taille des messages
- ID positifs
- champs requis

Fichiers de référence :

- [controllers/auth/register.js](/Users/leochen/matcha2/controllers/auth/register.js)
- [controllers/auth/password.js](/Users/leochen/matcha2/controllers/auth/password.js)
- [controllers/chats/sendMessage.js](/Users/leochen/matcha2/controllers/chats/sendMessage.js)
- [controllers/moderation/reportUser.js](/Users/leochen/matcha2/controllers/moderation/reportUser.js)
- [controllers/likes/likeUser.js](/Users/leochen/matcha2/controllers/likes/likeUser.js)

### 9.8 Prévention SQL injection

Les requêtes SQL utilisent des paramètres positionnels (`$1`, `$2`, etc.) au lieu de concaténer des chaînes.

Cela réduit fortement le risque d'injection SQL.

Fichiers de référence :

- [services/authService.js](/Users/leochen/matcha2/services/authService.js)
- [services/likeService.js](/Users/leochen/matcha2/services/likeService.js)
- [services/chatService.js](/Users/leochen/matcha2/services/chatService.js)
- [services/profileService.js](/Users/leochen/matcha2/services/profileService.js)
- [services/notificationService.js](/Users/leochen/matcha2/services/notificationService.js)

### 9.9 Protection XSS côté front

Le front échappe le HTML avant d'afficher certaines données utilisateur.

Exemple :

- `escapeHtml()`
- `sanitizeText()`

Ces fonctions protègent notamment l'affichage de noms, textes de notifications ou champs saisis par d'autres utilisateurs.

Fichiers de référence :

- [frontend/src/utils/xssEscape.js](/Users/leochen/matcha2/frontend/src/utils/xssEscape.js)
- [frontend/src/notifications/NotificationsBell.jsx](/Users/leochen/matcha2/frontend/src/notifications/NotificationsBell.jsx)

### 9.10 Contrôle des doublons et des conflits

Le backend utilise des contraintes et des retours HTTP adaptés :

- `23505` devient `409`
- `ON CONFLICT DO NOTHING`
- `ON CONFLICT DO UPDATE`

Cela protège contre les doublons et certains problèmes de concurrence.

Fichiers de référence :

- [app.js](/Users/leochen/matcha2/app.js)
- [services/likeService.js](/Users/leochen/matcha2/services/likeService.js)
- [services/authService.js](/Users/leochen/matcha2/services/authService.js)

### 9.11 Défense contre le spam et l'abus relationnel

Le projet limite aussi les abus fonctionnels :

- pas de like sur soi-même
- pas de message sans match
- pas de notification si les utilisateurs sont bloqués
- pas de recommandation de comptes signalés

Fichiers de référence :

- [controllers/likes/likeUser.js](/Users/leochen/matcha2/controllers/likes/likeUser.js)
- [services/likeService.js](/Users/leochen/matcha2/services/likeService.js)
- [services/chatService.js](/Users/leochen/matcha2/services/chatService.js)
- [services/notificationService.js](/Users/leochen/matcha2/services/notificationService.js)
- [controllers/moderation/reportUser.js](/Users/leochen/matcha2/controllers/moderation/reportUser.js)

### 9.12 Validation et nettoyage de la session locale

Le front :

- lit la session stockée
- la valide contre le backend
- supprime la session si elle est invalide
- déconnecte le realtime si nécessaire

Fichier de référence :

- [frontend/src/hooks/useCurrentUser.js](/Users/leochen/matcha2/frontend/src/hooks/useCurrentUser.js)

## 10. Résumé rapide

### Sur le token

- le token n'est pas un JWT standard
- il est généré au login ou régénéré pour le realtime
- il expire automatiquement
- il est stocké dans `currentUser` et `localStorage`
- il est injecté dans les requêtes via `Authorization: Bearer ...`

### Sur la sécurité

Le projet couvre déjà :

- CORS
- CSRF
- rate limiting
- authentification
- vérification realtime
- hashing des mots de passe
- validation des entrées
- protection SQL
- protection XSS
- gestion des doublons
- anti-abus métier

## 11. Point important à retenir

Le vrai point sensible du projet est le suivant :

- le token est stocké côté front
- donc une faille XSS pourrait exposer ce token

Pour cette raison, la protection XSS est particulièrement importante dans ce projet.




有，而且你项目里已经做了好几层防护。可以按“入口防护 -> 认证授权 -> 请求治理 -> 数据安全 -> 输出安全 -> 业务滥用防护”来理解。
1. 浏览器/请求入口层硬化
你在 app.js 里做了基础安全加固：helmet、CSP、HSTS、x-powered-by 关闭、CORS 白名单、请求体大小限制、统一错误处理。
相关文件和调用：app.js (line 32) 关闭 x-powered-by
app.js (line 34) helmet(...)
app.js (line 63) cors(corsOptions)
app.js (line 82) express.json() / express.urlencoded()
app.js (line 92) csrfProtection
app.js (line 93) globalApiLimiter

这些主要防的是：点击劫持、部分浏览器注入风险
非允许站点跨域调用
大包请求滥用
过多暴露服务器实现细节

2. 认证和授权
你项目里所有受保护 API 都通过 requireAuth 来拦，逻辑是：读 Authorization: Bearer <token>，验签，确认用户还存在，最后把 req.userId 挂上去。
相关文件和调用：middleware/auth.js (line 19)
routes/auth.js (line 27)
app.js (line 140)

登录成功后后端直接返回 token：controllers/auth/login.js (line 48)

realtime 连接也走同一套 token 验证：realtime/index.js (line 29)
realtime/handlers.js (line 18)

这层防的是：未登录访问受保护接口
伪造身份
已删除账号继续用旧身份

3. CSRF 防护
你的 csrfProtection 不是用 token，而是看 Origin / Referer 是否来自允许站点，且只对会改数据的请求生效。
相关文件和调用：middleware/csrfProtection.js (line 37)
app.js (line 92)

它的行为是：GET/HEAD/OPTIONS 直接放行
POST/PUT/DELETE 会检查来源
没有 Origin/Referer 的 curl/Postman 允许通过

这层防的是：跨站伪造提交
其他网站“代替用户”发写请求

4. 限流和爆破防护
你用了三档限流：全站 API 限流
普通 auth 限流
敏感 auth 限流

相关文件和调用：middleware/rateLimit.js (line 71)
app.js (line 93)
routes/auth.js (line 27)

具体挂载：register 用 authLimiter
login、forgot-password、reset-password、delete-account 用 authSensitiveLimiter
敏感 limiter 还设置了 skipSuccessfulRequests: true

这层防的是：暴力破解密码
重复刷登录/重置密码
API 被自动脚本刷爆

5. 密码和账号恢复
密码不是明文存的，注册和重置密码都用 bcrypt 哈希。
相关文件和调用：controllers/auth/register.js (line 90)
controllers/auth/login.js (line 28)
controllers/auth/password.js (line 39)
controllers/auth/password.js (line 117)
services/authService.js (line 168)

你还做了：邮箱验证 token
密码重置 token
token 过期时间写进数据库
验证/重置成功后清空 token

这层防的是：明文密码泄露
重复使用旧的验证链接
未授权改密码

6. 输入校验和业务滥用限制
你不是只靠前端校验，后端也在严格检查参数、长度、格式、年龄、ID 合法性。
相关文件和调用：controllers/auth/register.js (line 31)
controllers/auth/password.js (line 85)
controllers/likes/likeUser.js (line 22)
controllers/chats/sendMessage.js (line 17)
controllers/moderation/reportUser.js (line 6)

典型限制包括：不能自己喜欢自己
没有头像不能点赞
消息不能为空、不能超长
举报理由必须足够长
年龄必须满 18
用户名、邮箱格式要合法

这层防的是：恶意或脏数据进入数据库
业务规则被绕过
一些自动化骚扰行为

7. SQL 注入防护和数据库安全
你项目几乎所有 DB 调用都用参数化查询：$1, $2...，不是字符串拼接。
相关文件和调用：services/authService.js (line 55)
services/likeService.js (line 45)
services/chatService.js (line 36)
services/profileService.js (line 77)

另外你还用了：ON CONFLICT DO NOTHING / DO UPDATE
事务 BEGIN/COMMIT/ROLLBACK
soft delete（deleted_at）

这层防的是：SQL 注入
并发重复写入
脏删、半成功状态

8. XSS 和输出安全
前端有显式的 HTML 转义工具，渲染通知时也用了 sanitizeText。
相关文件和调用：frontend/src/utils/xssEscape.js (line 1)
frontend/src/notifications/NotificationsBell.jsx (line 174)

这里的思路是：用户名、通知文案这类“来自别人输入的内容”先转义再显示
React JSX 本身也会转义大部分文本插值

这层防的是：<script> 之类的注入
恶意用户名/内容在页面里执行

9. 会话恢复和 token 续命
你不是“拿到 token 就一直信任”，而是会检查本地缓存的用户状态是否还有效；过期或失效就清掉。
相关文件和调用：frontend/src/hooks/useCurrentUser.js (line 31)
frontend/src/hooks/useRealtimeConnection.js (line 38)

它会：用 /api/profile/me 验证缓存 session
遇到 401/403/404 就清本地用户、断 realtime、跳登录
token 快过期时自动去 /api/auth/realtime-token 刷新

这层防的是：过期 token 继续使用
多标签页状态不同步
realtime 因 token 失效一直报错

10. 反骚扰 / 用户互相屏蔽
你项目里不只是“认证”，还有“关系层风控”：blocked 用户之间不发通知
被举报用户在推荐里被排除
chat/like 关系会检查 block / match 状态

相关文件和调用：services/notificationService.js (line 10)
services/likeService.js (line 181)
services/chatService.js (line 393)
controllers/moderation/reportUser.js (line 22)

这层防的是：被拉黑后继续骚扰
举报后还被推荐到对方
未匹配直接发消息

我会特别提醒你的一点
你的 realtime_token 和 API token 现在放在 localStorage 里，方便，但 XSS 一旦发生，token 风险会比 HttpOnly cookie 更高。
所以你现在的防护里，XSS 这一层特别重要。