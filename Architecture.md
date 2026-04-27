Matcha Architecture and File Responsibility README
1) High-Level Architecture
Matcha is a full-stack web application with three runtime layers:

Frontend SPA
React + Vite + Tailwind
Runs in browser
Talks to backend through REST APIs and Socket.IO
Backend API + Realtime Server
Node.js + Express for HTTP APIs
Socket.IO for realtime events (presence, chat, notifications)
Main authentication pattern is x-user-id header plus realtime signed token for websockets
Data Layer
PostgreSQL for users, profiles, likes, views, chat, notifications, moderation, tags, photos
Core interaction flow:

Browser calls /api endpoints for CRUD
Backend validates input, writes/reads PostgreSQL
Backend emits realtime events via Socket.IO
Frontend listens and updates UI instantly
2) Runtime Boot Sequence
Backend startup order:

server.js loads env and creates HTTP server
app.js mounts middleware and all API routes
index.js attaches Socket.IO to same server
ensureChatVisibilityTables.js ensures chat visibility tables exist
Server starts listening on configured port
Frontend startup order:

main.jsx mounts React app into root
BrowserRouter starts route handling
App.jsx manages auth state, route layout, and shared navigation
Notifications and chat realtime channels connect after login
3) Security and Validation Model
Implemented controls include:

Helmet headers in app.js
CORS allowlist from env
CSRF origin/referer check in csrfProtection.js
Global and auth-specific rate limiting in rateLimit.js
Backend-side strict data validation for username, birth date, photo size/type, report reason length
SQL parameterization using pg placeholders
Frontend XSS helper utilities for text rendering
Security static scan script: securityPrecheck.js
4) Realtime Event Model
Server event constants:

presence:update
presence:ping
notification:created
profile:updated
chat:message:created
chat:message:deleted
chat:conversation:read
chat:block-status:changed
chat:conversation:deleted
chat:conversation:join
chat:conversation:leave
match:status:changed
Socket auth:

Token created in authToken.js
Verified in index.js during handshake
User sockets join user:{id} room
Conversation rooms joined/left for focused chat events
5) API Surface by Module
Auth routes:

Register, login
Verify email, resend verification
Request email change
Forgot/reset password
Realtime token endpoint
Delete account
Profile routes:

Get my profile
Get profile by user id
Update profile
Tag catalog endpoint
Reverse geocoding
Location validation
City suggestions and neighborhoods
Likes and discovery routes:

Who liked me
Who viewed me
Who matched me
Record profile view
Like/unlike user
Match check endpoint
Discovery endpoint with filters and sort
Chats routes:

List conversations
List conversation messages with pagination
Send message
Mark conversation read
Delete message (visibility delete)
Delete conversation (visibility delete)
Ensure conversation exists
Notifications routes:

List notifications
Mark one as read
Mark all as read
Moderation routes:

Report fake account
Block/unblock user
Get moderation status for target user
List blocked users
Health routes:

/health
/db-health
6) Database Initialization and Migration Strategy
initDb.js executes SQL in sequence:

Core tables
Social tables
Chat tables
Tags and seed data
Compatibility migration SQL for legacy user schema
Fake users seed
Photos support tables
Important SQL files define domain boundaries:

users and auth
profiles and profile tags
likes and views
notifications
moderation (fake reports, blocks)
chat conversations/messages
media photos
7) Deployment and Environment Strategy
Development Docker mode:

docker-compose.yml mounts source volumes
Backend uses nodemon through docker-entrypoint.sh
Frontend uses Vite dev server
DB runs as postgres container
Backend image:

Dockerfile.backend
Entrypoint initializes DB and seed photos before starting dev server
Frontend image:

frontend/Dockerfile
Exposes Vite dev service
Makefile wrappers:

up/down/clean/fclean/re
8) File-by-File Responsibility Map
Note: This list covers project source, config, scripts, docs, and assets.
Excluded: .git internals, node_modules, build output directories.

8.1 Root Files
app.js: Express app assembly, middleware chain, CORS, CSRF, rate limits, route mounting, centralized error handling
server.js: HTTP server bootstrap, realtime init, startup sequence
db.js: PostgreSQL connection pool config
package.json: backend dependencies and scripts
package-lock.json: backend lockfile
.env: local environment values
.env.example: template environment file
.dockerignore: backend docker ignore rules
.gitignore: repository ignore rules
docker-compose.yml: multi-service dev stack (db, backend, frontend)
Dockerfile.backend: backend image definition
docker-entrypoint.sh: backend container startup logic (wait db, init db, seed photos, run dev)
Makefile: docker command shortcuts
README.md: main project readme
EMAIL_VERIFICATION_GUIDE.md: email verification workflow documentation
common_passwords.txt: password strength blacklist source
Matcha-1.pdf: project specification/reference document
matcha.pdf: project specification/reference document
8.2 Backend Middleware
middleware/csrfProtection.js: origin/referer validation for unsafe HTTP methods
middleware/rateLimit.js: global/auth/sensitive endpoint request throttling
8.3 Backend Realtime Layer
realtime/index.js: Socket.IO server lifecycle, auth middleware, room management
realtime/events.js: shared realtime event constant names
realtime/authToken.js: HMAC token creation and validation for websocket auth
realtime/presence.js: online/offline socket tracking and presence broadcasts
8.4 Backend Routes
routes/health.js: lightweight liveness endpoint
routes/dbHealth.js: DB connectivity check endpoint
routes/users.js: basic CRUD user endpoints (legacy/simple utility)
routes/auth.js: registration, login, email verification, email change, password reset, account deletion
routes/profile.js: profile read/update, tags, location/geocode, city suggestion APIs
routes/likes.js: views, likes, matches, discovery endpoint, like/unlike/match state handling
routes/chats.js: conversations/messages APIs, message limits, read states, visibility deletions, block/match guards
routes/notifications.js: read and read-state management for notifications
routes/notificationsService.js: notification creation helper and realtime push
routes/moderation.js: fake report submission, block lifecycle, moderation status APIs
8.5 Backend Utilities
utils/emailService.js: SMTP transport creation, verification/reset email senders, dev Ethereal fallback logic
utils/photoValidator.js: backend photo MIME/content/size checks and normalization
utils/chatSystemMessage.js: helper to insert automatic system chat messages
8.6 Backend Scripts
scripts/initDb.js: schema creation + migration + seed orchestration
scripts/ensureChatVisibilityTables.js: creates missing chat visibility tables safely at runtime
scripts/seed_photos_for_existing_users.js: random/photo URL seeding for users
scripts/checkBackendSyntax.js: syntax validation for backend JS files
scripts/securityPrecheck.js: static checks for dangerous patterns (XSS/eval/unsafe SQL)
scripts/debugRoutes.js: dumps app route stack for diagnostics
scripts/dotenv_setup.js: environment loading helper
scripts/sql/create_users_table.sql: users schema
scripts/sql/create_profiles_table.sql: profiles schema
scripts/sql/create_likes_table.sql: likes schema
scripts/sql/create_views_table.sql: profile views schema
scripts/sql/create_tags_table.sql: tags catalog schema
scripts/sql/create_profile_tags_table.sql: profile-to-tag join schema
scripts/sql/create_user_photos_table.sql: user photos schema
scripts/sql/create_notifications_table.sql: notifications schema
scripts/sql/create_fake_account_reports_table.sql: fake report schema
scripts/sql/create_user_blocks_table.sql: user block schema
scripts/sql/create_chat_tables.sql: chat conversation and messages schema
scripts/sql/add_email_verification_columns.sql: migration for verification fields
scripts/sql/add_pending_email_columns.sql: migration for pending email flow
scripts/sql/add_password_reset_columns.sql: migration for reset token fields
scripts/sql/seed_default_tags.sql: default tag seed
scripts/sql/seed_fake_users.sql: demo/fake users seed
8.7 Frontend Root and Config
frontend/package.json: frontend dependencies and scripts
frontend/package-lock.json: frontend lockfile
frontend/index.html: root HTML shell
frontend/vite.config.js: Vite config and API/socket proxy rules
frontend/tailwind.config.cjs: Tailwind theme extensions
frontend/postcss.config.cjs: PostCSS pipeline config
frontend/eslint.config.js: lint rules (including XSS-oriented restrictions)
frontend/Dockerfile: frontend dev image
frontend/.dockerignore: frontend docker ignore rules
frontend/.gitignore: frontend local ignore rules
frontend/README.md: template frontend readme from Vite
frontend/typescript: terminal transcript artifact file, not part of runtime app logic
8.8 Frontend Public Assets
frontend/public/favicon.svg: browser favicon
frontend/public/icons.svg: icon sprite/static icon asset
8.9 Frontend App Entry and Global Styles
frontend/src/main.jsx: React root renderer
frontend/src/App.jsx: core app shell, auth/register/login/profile edit routes and page composition
frontend/src/index.css: global styles, base layers, animation utilities
frontend/src/utils.js: shared API header builder
frontend/src/utils/photoValidator.js: frontend photo file and data URL validation
frontend/src/utils/xssEscape.js: text sanitization helpers for UI rendering
8.10 Frontend Components and Feature Modules
frontend/src/components/UserCard.jsx: reusable user card with like/match interactions
frontend/src/chat/api.js: chat-related HTTP client functions
frontend/src/chat/ChatAvatar.jsx: avatar with presence indicator
frontend/src/chat/ChatIndicator.jsx: navbar message badge and quick conversation launcher
frontend/src/chat/quoteUtils.js: quoted message parsing and preview formatting
frontend/src/notifications/NotificationsProvider.jsx: notifications state store + realtime sync
frontend/src/notifications/useNotifications.js: notifications context hook
frontend/src/notifications/NotificationsBell.jsx: notifications bell UI and dropdown behavior
frontend/src/realtime/socket.js: socket connection lifecycle and event subscription utilities
frontend/src/realtime/events.js: client-side realtime event constants
8.11 Frontend Pages
frontend/src/pages/FindMatchPage.jsx: discovery feed with filtering, sorting, pagination, and realtime updates
frontend/src/pages/UserProfilePage.jsx: public profile view, moderation actions, like/block/report UX
frontend/src/pages/MessagesPage.jsx: responsive chat layout container
frontend/src/pages/ChatListPage.jsx: conversation list with unread and realtime updates
frontend/src/pages/ChatConversationPage.jsx: conversation thread, send/read/delete/reply behavior
frontend/src/pages/PopularityListPage.jsx: views/likes/matches list by mode
frontend/src/pages/MyPopularityPage.jsx: dashboard-style popularity overview
frontend/src/pages/ActivityPage.jsx: tabbed views/likes activity page
frontend/src/pages/BlockedUsersPage.jsx: blocked-user management and unblock action
frontend/src/pages/VerifyEmailPage.jsx: token-based verification result page
frontend/src/pages/ResendVerificationPage.jsx: resend verification email form
frontend/src/pages/VerificationSentPage.jsx: post-signup verification guidance page
frontend/src/pages/ForgotPasswordPage.jsx: reset request form
frontend/src/pages/ResetPasswordPage.jsx: reset password by token form
8.12 Frontend Source Assets
frontend/src/assets/hero.png: hero image used in UI
frontend/src/assets/react.svg: static react asset
frontend/src/assets/vite.svg: static vite asset
8.13 CI
.github/workflows/predefense.yml: automated pre-defense checks pipeline
9) Practical Architecture Notes
Current auth approach
API uses x-user-id heavily for user context in many routes.
This is practical for development and school evaluation, but should be replaced with robust session/JWT authorization before production.
Realtime consistency pattern
Backend emits after DB writes.
Frontend performs optimistic or near-realtime sync with fallback polling for resilience.
Chat visibility model
Deleting a conversation/message is user-scoped visibility delete, not necessarily global hard delete.
Migration tolerance
Many routes gracefully handle missing tables with fallback behavior so partial migration states do not crash all features.
10) Suggested Next Documentation Split
As the project grows, split this file into:

API_README.md for endpoint contracts
DB_SCHEMA_README.md for SQL tables and relations
REALTIME_README.md for event contracts and room model
DEPLOYMENT_README.md for dev/prod Docker flows