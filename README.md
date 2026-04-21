# Matcha

Full-stack dating web application with profiles, likes/matching, search/recommendations, real-time chat, and notifications.

## Tech Stack

- Backend: Node.js, Express, PostgreSQL, Socket.IO
- Frontend: React (Vite), TailwindCSS, socket.io-client

## Features (current)

- Authentication: register/login (bcrypt password hashing)
- Profiles: edit profile, photos, tags, location validation/geocoding
- Discovery: match suggestions with filtering/sorting (age, fame, tags, city, username)
- Social: likes, mutual matches, profile views, blocks, fake-account reports
- Real-time: chat, notifications, online presence, read/unread state

## Project Structure

- `server.js` / `app.js`: Express server + API routes
- `routes/`: REST endpoints (auth, profiles, likes/matches, chats, notifications, moderation)
- `realtime/`: Socket.IO server (auth token, presence, events)
- `scripts/`: DB initialization + SQL schema/seed files
- `frontend/`: React (Vite) client (proxies `/api` and `/socket.io` to the backend)

## Requirements

- Node.js 18+ (backend uses the built-in `fetch`)
- PostgreSQL 13+ (or compatible)

## Setup

### 1) Configure environment

Create `.env` from the example:

```bash
cp .env.example .env
```

Fill the database settings in `.env`:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
```

Optional (Socket.IO auth token signing):

```bash
REALTIME_SECRET=change-me
REALTIME_TOKEN_TTL_SECONDS=43200
```

### 2) Install dependencies

```bash
npm install
cd frontend && npm install
```

### 3) Initialize database

This creates tables and seeds fake users/tags:

```bash
npm run db:init
```

Schema files live in `scripts/sql/`.

### 4) Run the app

Backend (default `http://localhost:3000`):

```bash
npm run dev
```

Frontend (default `http://localhost:5173`):

```bash
cd frontend && npm run dev
```

## Health Checks

- `GET /api/health`
- `GET /api/db-health`

## Notes on Auth (dev state)

Most API routes currently identify the user via the `x-user-id` header (set by the frontend after login).
This is not production-grade authentication yet; hardening/authorization work is ongoing.

## Nginx Setup (Production-style)

This repo now includes an Nginx site config at `nginx/matcha.conf`.

It does 3 things:

- Serves React static files from `frontend/dist`
- Proxies `/api/*` to the Node backend on `127.0.0.1:3000`
- Proxies `/socket.io/*` to Node with WebSocket upgrade headers

### 1) Build frontend assets

```bash
cd frontend
npm run build
```

### 2) Put build output in your Nginx web root

Example target used by the config:

```bash
sudo mkdir -p /var/www/matcha/frontend
sudo cp -R dist /var/www/matcha/frontend/
```

### 3) Install site config

Ubuntu/Debian example:

```bash
sudo cp nginx/matcha.conf /etc/nginx/sites-available/matcha.conf
sudo ln -sf /etc/nginx/sites-available/matcha.conf /etc/nginx/sites-enabled/matcha.conf
sudo nginx -t
sudo systemctl reload nginx
```

### 4) Run backend

```bash
npm start
```

If you use a process manager in production, run backend with PM2/systemd and keep it on port `3000`.

### Cross-machine quick setup

On a new computer, you do not need to manually edit global Nginx config each time.
Use the repo script:

```bash
chmod +x scripts/setup_nginx.sh
./scripts/setup_nginx.sh --mode dev
```

or for production static hosting:

```bash
./scripts/setup_nginx.sh --mode prod
```

Notes:

- `dev` mode uses `nginx/matcha.dev.conf` and proxies `/` to Vite (`5173`).
- `prod` mode uses `nginx/matcha.conf` and serves `frontend/dist`.
- On macOS Homebrew, the script links into `/opt/homebrew/etc/nginx/servers/matcha.conf`.
- On Linux with `/etc/nginx/sites-*`, run the script with `sudo`.
- If nginx is missing on macOS and Homebrew exists, the script can install nginx automatically.
