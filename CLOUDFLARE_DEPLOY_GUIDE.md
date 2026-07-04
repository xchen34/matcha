# Cloudflare Deploy Guide

This repository is not yet a "single-click deploy everything to Cloudflare" app.

The current architecture is:

- Frontend: React + Vite SPA in `frontend/`
- Backend: Node.js + Express in the repo root
- Database: PostgreSQL
- Realtime: Socket.IO over WebSocket
- Email: SMTP via Nodemailer

The fastest safe deployment path is:

1. Deploy the frontend to Cloudflare Pages.
2. Deploy the backend to a normal Node platform first.
3. Point Pages HTTP requests at the backend through a Pages Function proxy.
4. Point Socket.IO directly at the backend domain with `VITE_SOCKET_URL`.

This guide documents that path.

For a student portfolio/demo deployment, also consider enabling:

- `DEMO_AUTO_VERIFY_USERS=true`

This lets recruiters register and log in without getting blocked on email verification.

## Why not move everything to Workers immediately?

The backend currently depends on several Node/server patterns that do not map 1:1 to a Pages static app or a simple Worker:

- `http.createServer(...)` in [server.js](/Users/leochen/Documents/matcha_deploy/server.js)
- `socket.io` server bootstrap in [realtime/index.js](/Users/leochen/Documents/matcha_deploy/realtime/index.js)
- direct `pg` pool usage in [db.js](/Users/leochen/Documents/matcha_deploy/db.js)
- startup-time database work in [server.js](/Users/leochen/Documents/matcha_deploy/server.js)
- native/binary-oriented dependencies like `bcrypt`

If you want full Cloudflare-native backend later, treat that as a separate migration project.

## What was added in this repo

These files were added to support Cloudflare Pages for the frontend:

- `frontend/functions/api/[[path]].js`
- `frontend/public/_routes.json`
- `frontend/public/_redirects`

What they do:

- `frontend/functions/api/[[path]].js`
  Proxies same-origin `/api/*` requests from Pages to your external backend using the `API_BASE_URL` environment variable.
- `frontend/public/_routes.json`
  Ensures Pages Functions run only for `/api/*`, so normal static asset requests stay static.
- `frontend/public/_redirects`
  Keeps React Router working on refresh by rewriting unknown frontend routes to `/index.html`.

## Recommended target architecture

- `https://app.example.com`
  Cloudflare Pages frontend
- `https://api.example.com`
  Existing Node backend on Railway, Render, Fly.io, EC2, or another Node-friendly host
- PostgreSQL
  Neon, Supabase, RDS, Railway Postgres, or another managed Postgres

Request flow:

- Browser requests `/api/...` from `app.example.com`
- Pages Function proxies the request to `API_BASE_URL`, for example `https://api.example.com`
- Browser opens Socket.IO directly against `VITE_SOCKET_URL=https://api.example.com`

## Cloudflare Pages setup

Project settings:

- Root directory: `frontend`
- Build command: `npm run build`
- Build output directory: `dist`

Environment variables in Pages:

- `API_BASE_URL=https://api.example.com`
- `VITE_SOCKET_URL=https://api.example.com`

You do not need `VITE_API_BASE_URL` with the current setup, because the frontend already calls relative `/api/...` paths and the Pages Function handles the proxying.

## Backend environment updates

For the backend deployment, update your environment variables to real production values:

- `NODE_ENV=production`
- `PORT=3000` or the platform-provided port
- `DB_HOST=...`
- `DB_PORT=5432`
- `DB_USER=...`
- `DB_PASSWORD=...`
- `DB_NAME=...`
- `DATABASE_URL=...` if your provider gives you a full connection string
- `DB_SSL=true` for providers that require SSL/TLS
- `DB_SSL_REJECT_UNAUTHORIZED=false` for providers that document this setup
- `FRONTEND_BASE_URL=https://app.example.com`
- `CORS_ORIGIN=https://app.example.com`
- `CSRF_ALLOWED_ORIGINS=https://app.example.com`
- `REALTIME_SECRET=use-a-long-random-secret`
- `SMTP_HOST=...`
- `SMTP_PORT=...`
- `SMTP_USER=...`
- `SMTP_PASSWORD=...`
- `SMTP_FROM_EMAIL=...`
- `DEMO_AUTO_VERIFY_USERS=true` for portfolio/demo deployments

If you want preview deployments later, add preview domains to:

- `CORS_ORIGIN`
- `CSRF_ALLOWED_ORIGINS`

These accept comma-separated values already.

## Best setup for a recruiter-facing demo

If your goal is "open the link, see activity, optionally register, and try the app", the simplest setup is:

- Cloudflare Pages frontend on `*.pages.dev`
- backend on a normal Node host with its generated domain
- managed Postgres
- seeded fake users
- `DEMO_AUTO_VERIFY_USERS=true`

That gives you:

- no custom domain purchase
- no email delivery dependency for core registration
- populated profiles, likes, matches, and photos on first load
- a smoother recruiter demo flow

## Important limitation: Socket.IO is still external

The new Pages Function only proxies HTTP API traffic.

It does not terminate or recreate your Socket.IO server inside Pages. Your frontend should connect directly to the backend realtime origin via:

- `VITE_SOCKET_URL=https://api.example.com`

That works with the current frontend code because [frontend/src/realtime/socket.js](/Users/leochen/Documents/matcha_deploy/frontend/src/realtime/socket.js) already supports `VITE_SOCKET_URL`.

## Suggested rollout order

1. Deploy Postgres.
2. Deploy the Node backend and verify:
   - `GET /api/health`
   - login/register
   - email flow
   - Socket.IO connection
3. Create the Cloudflare Pages project for `frontend/`.
4. Set `API_BASE_URL` and `VITE_SOCKET_URL`.
5. Deploy the frontend.
6. Test:
   - hard refresh on a nested React route
   - authenticated API calls
   - realtime chat
   - notifications
   - email verification links

## Full Cloudflare-native migration later

If your end goal is "backend also runs on Cloudflare", these are the main refactors still ahead:

1. Replace Express server bootstrap with a Worker-compatible request handler.
2. Replace `socket.io` server logic with a Workers WebSocket architecture.
3. Replace direct `pg` connections with a Cloudflare-compatible data access strategy.
4. Replace any Node-only assumptions in auth, crypto, uploads, and mail flows.
5. Move startup/migration tasks out of `server.listen()` boot flow.

That is feasible, but it is a real backend migration rather than a deployment toggle.
