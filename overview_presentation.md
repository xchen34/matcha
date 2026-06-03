# Matcha Peer Evaluation Overview Presentation

這份文件是給 peer evaluation 開場使用的 10 分鐘 overview presentation。
結構採用：

- 先講整體，再講局部
- 先講架構，再講細節
- 以「法文作為評分時講稿」為主，中文作為備註與對照
- 每一段都附上建議展示的檔案或函式，方便 evaluator 快速定位

---

## 1. 題目簡介 / Présentation du projet

### 中文

這個專案是一个 full-stack 的交友網站 Matcha。  
我的目標不是只做一個能登入的網站，而是完整實作一個 dating flow：註冊、驗證、完成個人檔案、看推薦名單、互相喜歡、配對、即時聊天，還有通知和封鎖管理。

這個 subject 的核心要求，可以理解成三件事：

1. 要有清楚的使用者流程
2. 要有安全性
3. 要能在資料庫裡支撐所有功能，包含至少 500 個 seed profiles

我用的是 Express 當 micro-framework，前端是 React + Vite，資料層是 PostgreSQL，實時部分用 Socket.IO。

### Français

Ce projet est une application de rencontre full-stack, Matcha.  
Mon objectif n’était pas seulement de faire un site avec authentification, mais de couvrir tout le parcours utilisateur: inscription, vérification par email, profil complet, suggestions, likes et matchs, chat en temps réel, notifications et gestion de blocage.

Le sujet demande surtout trois choses:

1. Un parcours utilisateur clair
2. Une vraie sécurité applicative
3. Une base de données capable de supporter toutes les fonctionnalités, avec au moins 500 profils seedés

J’utilise Express comme micro-framework, React + Vite côté frontend, PostgreSQL pour les données, et Socket.IO pour le temps réel.

### 建議展示

- `README.md`
- `Architecture.md`
- `Matcha-1.pdf`
- `scripts/initDb.js`
- `scripts/sql/seed_fake_users.sql`
- `package.json`
- `frontend/package.json`

---

## 2. 整體架構 / Architecture Overview

### 中文

如果先看整體，專案可以分成四層：

1. 前端 SPA
2. HTTP API
3. Realtime 層
4. 資料層

前端入口在 `frontend/src/main.jsx` 和 `frontend/src/App.jsx`。  
`main.jsx` 負責把 React 掛到頁面上，`App.jsx` 負責整個路由、登入狀態、導覽列和全站版面。

後端入口在 `server.js` 和 `app.js`。  
`server.js` 啟動 HTTP server，`app.js` 負責掛 middleware、路由、防護和錯誤處理。

功能上我把後端切成 `auth`、`profile`、`likes`、`chats`、`notifications`、`moderation`、`users` 幾個模組。  
這樣每個模組只負責自己的商業邏輯，路由也比較好讀。

Realtime 不是直接塞在 REST API 裡，而是獨立在 `realtime/`，專門處理 token、連線、presence、聊天和通知事件。

### Français

Si je présente l’architecture globale, le projet se découpe en quatre couches:

1. SPA frontend
2. API HTTP
3. couche temps réel
4. couche de données

Le point d’entrée frontend est `frontend/src/main.jsx` puis `frontend/src/App.jsx`.  
`main.jsx` monte React dans la page, et `App.jsx` gère les routes, l’état d’authentification, la navigation et la structure globale.

Côté backend, `server.js` démarre le serveur HTTP et `app.js` branche les middlewares, les routes, la sécurité et la gestion d’erreurs.

Fonctionnellement, j’ai séparé le backend en modules `auth`, `profile`, `likes`, `chats`, `notifications`, `moderation` et `users`.  
Chaque domaine garde sa logique métier, et les routes restent lisibles.

Le temps réel n’est pas mélangé avec l’API REST: il est isolé dans `realtime/` pour gérer le token, la connexion, la présence, le chat et les notifications.

### 建議展示

- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `server.js`
- `app.js`
- `routes/auth.js`
- `routes/profile.js`
- `routes/likes/index.js`
- `routes/chats/index.js`
- `routes/notifications.js`
- `routes/moderation.js`
- `realtime/index.js`

---

## 3. 工作流程 / Workflow / Execution Flow

### 中文

我先從使用者角度講流程：打開網站後，`App.jsx` 會根據登入狀態決定先顯示登入頁、個人檔案，還是配對頁。

註冊時，前端送資料到 `/api/auth/register`，後端先檢查 email、username、生日、密碼強度，再加密密碼，寫入資料庫，最後寄出驗證信。

登入成功後，後端不只回傳 user 資料，還會回傳一個 realtime token。  
前端把它存起來，之後 REST header 和 Socket.IO 都會用到。

使用者完成 profile 後，前端會帶他進入 `find-match`。  
在這一頁，我先抓自己的 fame rating，再抓 tag options，然後用 filter 送到後端拿推薦名單。

點開別人的 profile 時，前端會先記錄一次 view，然後再載入完整資料、關係狀態、照片、tags，最後顯示像 like / match / block / report 這些動作。

Chat 的流程是：先建立 conversation，再讀取訊息、標記已讀、送出訊息，最後透過 Socket.IO 即時更新。

通知也是同樣概念：資料先進資料庫，之後透過 realtime event 推到前端，前端再更新 unread count 和提示標記。

### Français

Je commence par le point de vue utilisateur: à l’ouverture du site, `App.jsx` décide selon l’état de session s’il faut afficher la page de login, le profil, ou la page de suggestions.

Lors de l’inscription, le frontend envoie les données à `/api/auth/register`.  
Le backend vérifie l’email, le username, la date de naissance et la robustesse du mot de passe, puis il hash le mot de passe, écrit en base et envoie l’email de vérification.

Après le login, le backend renvoie non seulement les données utilisateur, mais aussi un realtime token.  
Le frontend le stocke, et il sert ensuite pour les requêtes REST et la connexion Socket.IO.

Une fois le profil complété, l’utilisateur arrive sur `find-match`.  
Dans cette page, je récupère d’abord son fame rating, puis les tags disponibles, et enfin j’envoie les filtres au backend pour obtenir les suggestions.

Quand on ouvre le profil d’un autre utilisateur, le frontend enregistre d’abord une visite, puis charge les données complètes, l’état de relation, les photos et les tags, avant d’afficher les actions like / match / block / report.

Pour le chat, le flux est: créer ou retrouver la conversation, charger les messages, marquer comme lus, envoyer les messages, puis pousser les mises à jour en temps réel via Socket.IO.

Les notifications suivent la même logique: les données sont d’abord en base, puis poussées en realtime vers le frontend, qui met à jour le compteur non lu et les badges d’attention.

### 建議展示

- `frontend/src/App.jsx`
- `frontend/src/hooks/useCurrentUser.js`
- `controllers/auth/register.js`
- `controllers/auth/login.js`
- `frontend/src/hooks/useRealtimeConnection.js`
- `frontend/src/matching/FindMatchPage.jsx`
- `controllers/likes/getSuggestions.js`
- `frontend/src/profile/user/UserProfilePage.jsx`
- `controllers/likes/viewProfile`
- `controllers/chats/createConversation.js`
- `controllers/chats/getMessages.js`
- `controllers/chats/sendMessage.js`
- `frontend/src/components/MessagesBloc.jsx`
- `controllers/notifications/getNotifications.js`
- `frontend/src/notifications/NotificationsProvider.jsx`

---

## 4. 評分時最值得注意的重點 / Key Points

### 中文

我覺得這個專案最值得注意的地方，是它不是把功能散著寫，而是用清楚的分層把資料流和事件流分開。

第一個重點是 auth 與 session 管理。  
登入不是單純拿到一個 user object，而是同時處理 email verification 和 realtime token。

第二個重點是推薦與排序邏輯。  
我把 suggestions 的排序和 filters 集中在 `getSuggestions`，包含 age、fame、city、tags、username。

第三個重點是 profile 的完整性。  
我的 profile 頁不是只有顯示資料，而是包含照片、tags、生日、地理位置、email change、GPS 驗證等完整更新流程。

第四個重點是 realtime。  
聊天室和通知不是重新整理頁面，而是靠 Socket.IO 在後台同步事件，所以 evaluator 可以很容易看到 live 行為。

第五個重點是安全性。  
我有做 header、防護 middleware、輸入驗證、SQL parameterization，還有自動化的 security precheck。

### Français

Le point le plus important selon moi, c’est que les fonctionnalités ne sont pas dispersées: elles sont séparées proprement par couches, ce qui clarifie le flux de données et le flux d’événements.

Premier point: la gestion de l’auth et de la session.  
Le login ne renvoie pas seulement un user, il gère aussi la vérification email et le realtime token.

Deuxième point: la logique de suggestion et de tri.  
J’ai centralisé les filtres et le classement dans `getSuggestions`, avec age, fame, city, tags et username.

Troisième point: le caractère complet du profil.  
La page profil ne fait pas qu’afficher des données: elle gère aussi les photos, les tags, la date de naissance, la localisation, le changement d’email et la validation GPS.

Quatrième point: le realtime.  
Le chat et les notifications ne dépendent pas d’un refresh de page, mais de Socket.IO, donc l’évaluateur peut observer facilement le comportement live.

Cinquième point: la sécurité.  
J’ai mis en place les headers, les middlewares de protection, les validations d’entrée, les requêtes paramétrées SQL, et un contrôle de sécurité automatisé.

### 建議展示

- `controllers/auth/register.js`
- `controllers/auth/login.js`
- `frontend/src/hooks/useRealtimeConnection.js`
- `controllers/likes/getSuggestions.js`
- `services/profileService.js`
- `frontend/src/profile/me/ProfilePage.jsx`
- `frontend/src/profile/user/UserProfilePage.jsx`
- `realtime/index.js`
- `app.js`
- `middleware/csrfProtection.js`
- `middleware/rateLimit.js`
- `scripts/securityPrecheck.js`

---

## 5. Matcha 評分標準對照 / Comment répondre pendant l’évaluation

這一段可以直接當成 evaluator 提問時的「答案索引」。

### Installation + seeding

- 法文回答：`L’installation est reproductible, et la base est initialisée avec le script de seed qui crée environ 500 profils différents.`
- 要展示：
  - `README.md`
  - `scripts/initDb.js`
  - `scripts/sql/seed_fake_users.sql`

### User account management

- 法文回答：`L’inscription demande email, username, prénom, nom et mot de passe, puis le compte doit être vérifié par email avant usage.`
- 要展示：
  - `routes/auth.js`
  - `controllers/auth/register.js`
  - `controllers/auth/verification.js`

### Password reset / logout

- 法文回答：`Le login, le reset de mot de passe et la déconnexion sont gérés côté auth, avec validation du mot de passe et token de session réel.`
- 要展示：
  - `controllers/auth/login.js`
  - `controllers/auth/password.js`
  - `frontend/src/hooks/useCurrentUser.js`

### Extended profile

- 法文回答：`Le profil étendu contient sexe, orientation, bio, tags, photos et localisation, et il peut être mis à jour à tout moment.`
- 要展示：
  - `routes/profile.js`
  - `controllers/profile/index.js`
  - `services/profileService.js`
  - `frontend/src/profile/me/ProfilePage.jsx`

### Geolocation

- 法文回答：`La localisation est validée et normalisée côté backend, avec géocodage inverse et suggestions de villes/quartiers.`
- 要展示：
  - `controllers/profile/location.js`
  - `routes/profile.js`

### Consultations / visits

- 法文回答：`Les visites de profil sont enregistrées, et l’historique est visible dans les pages de popularité.`
- 要展示：
  - `frontend/src/profile/user/UserProfilePage.jsx`
  - `controllers/likes/viewProfile`
  - `controllers/likes/getViews`

### Fame rating

- 法文回答：`Le fame rating est calculé de manière cohérente à partir des visites, likes et activité récente.`
- 要展示：
  - `services/profileService.js`
  - `frontend/src/profile/user/UserProfilePage.jsx`

### Profile suggestions

- 法文回答：`Les suggestions sont triées selon la géographie, les tags communs et le fame rating, avec des filtres âge, ville, tags et username.`
- 要展示：
  - `controllers/likes/getSuggestions.js`
  - `routes/likes/queries.js`

### Search / sort / filters

- 法文回答：`La recherche avancée est filtrable et triable par âge, localisation, fame et tags.`
- 要展示：
  - `controllers/likes/getSuggestions.js`
  - `frontend/src/matching/FindMatchPage.jsx`

### Other users profile

- 法文回答：`Le profil d’un autre utilisateur affiche toutes les informations publiques, mais pas l’email ni le mot de passe.`
- 要展示：
  - `controllers/profile/index.js`
  - `services/profileService.js`
  - `frontend/src/profile/user/UserProfilePage.jsx`

### Likes / matches

- 法文回答：`Les likes et les matchs sont gérés séparément, et l’état relationnel est renvoyé au frontend.`
- 要展示：
  - `routes/likes/interactions.js`
  - `controllers/likes/index.js`
  - `services/profileService.js`

### Report / blocking

- 法文回答：`Le reporting et le blocage sont visibles côté profile, et un utilisateur bloqué n’apparaît plus dans les résultats.`
- 要展示：
  - `routes/moderation.js`
  - `controllers/moderation/reportUser.js`
  - `controllers/moderation/blockUser.js`
  - `frontend/src/profile/user/UserProfilePage.jsx`

### Chat

- 法文回答：`Le chat en temps réel fonctionne avec conversation, messages, lecture et suppression, et il reste accessible depuis n’importe quelle page protégée.`
- 要展示：
  - `routes/chats/index.js`
  - `controllers/chats/getMessages.js`
  - `controllers/chats/sendMessage.js`
  - `frontend/src/components/MessagesBloc.jsx`

### Notifications

- 法文回答：`Les notifications arrivent en temps réel et le frontend garde aussi un état non lu pour afficher les badges.`
- 要展示：
  - `routes/notifications.js`
  - `controllers/notifications/getNotifications.js`
  - `frontend/src/notifications/NotificationsProvider.jsx`

### Best practices / security

- 法文回答：`La sécurité est centralisée dans `app.js` avec Helmet, CORS, CSRF, rate limiting et gestion d’erreurs.`
- 要展示：
  - `app.js`
  - `middleware/csrfProtection.js`
  - `middleware/rateLimit.js`
  - `scripts/securityPrecheck.js`

### Compatibility / startup

- 法文回答：`Le projet démarre proprement avec la structure standard du repo et les checks de santé.`
- 要展示：
  - `server.js`
  - `routes/health.js`
  - `routes/dbHealth.js`
  - `README.md`

---

## 6. 可以直接照念的法文開場版 / Version orale courte

> Bonjour, je vais vous présenter le projet en quatre parties.  
> D’abord, l’objectif général: Matcha est une application de rencontre full-stack qui couvre l’inscription, la vérification email, le profil étendu, les suggestions, les likes et matchs, le chat en temps réel et les notifications.  
> Ensuite, je vais vous montrer l’architecture globale: frontend React, backend Express, couche Socket.IO et base PostgreSQL.  
> Puis je vais expliquer le flux d’exécution, depuis le login jusqu’à la découverte, le profil, le chat et les notifications.  
> Enfin, je vais vous montrer les points les plus importants pour la correction: la sécurité, la logique de suggestion, le calcul du fame rating, et le realtime.

---

## 7. 你可以怎麼帶 evaluator 走

### 建議順序

1. `README.md`
2. `Architecture.md`
3. `frontend/src/App.jsx`
4. `server.js` 和 `app.js`
5. `routes/auth.js` 和 `controllers/auth/register.js`
6. `routes/profile.js` 和 `services/profileService.js`
7. `controllers/likes/getSuggestions.js`
8. `routes/chats/index.js` 和 `controllers/chats/getMessages.js`
9. `routes/notifications.js`
10. `realtime/index.js`
11. `scripts/initDb.js` 和 `scripts/sql/seed_fake_users.sql`
12. `scripts/securityPrecheck.js`

### 口語提示

- 先講「這個專案在做什麼」
- 再講「它怎麼被切成幾層」
- 再講「資料怎麼流動」
- 最後才講「哪些地方最值得看」

這樣 evaluator 聽完後，腦中會先有地圖，再去看細節會快很多。

