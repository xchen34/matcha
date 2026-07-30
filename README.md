# Matcha

Matcha is a full-stack dating web app built as a student portfolio project. It implements profile creation, matching, search, profile visits, likes, real-time chat, notifications, moderation actions, and demo data seeding.

Live demo: https://matcha-cuf.pages.dev/login

## Project Notice

This website is not a real dating service and is not intended for real commercial operation. It is a student portfolio project built to demonstrate full-stack web development, authentication, database modeling, realtime features, and UI workflows.

All seeded users, profile information, relationships, likes, visits, messages, and profile photos are demo data. The seeded profile photos are placeholder/demo images used only to make the application testable and presentable.

## Demo Login

The seed script creates demo accounts with the same password:

```text
Email: seed.bob.1@example.com
Username: seed_bob_1
Password: password
```

Other generated users follow the same seed pattern and can also be used for testing.

## Features

- User registration, login, logout, email verification, and password reset flow
- Editable user profiles with gender, sexual preference, biography, birth date, location, tags, and photos
- Match discovery with filters for age, fame rating, distance, and tags
- Likes, unlikes, mutual matches, profile views, and popularity pages
- Realtime chat with conversation lists, unread states, message deletion, and online presence
- Notifications for likes, matches, views, messages, and moderation events
- Blocking and reporting workflows
- PostgreSQL seed data with around 500 demo profiles

## Tech Stack

- Backend: Node.js, Express, PostgreSQL, Socket.IO
- Frontend: React, Vite, Tailwind CSS, socket.io-client
- Tooling: Docker Compose, Makefile, npm scripts

## Local Development

Start the full stack:

```bash
make up
```

Website:

```text
http://localhost:5173
```

Database admin:

```text
http://localhost:8080
```

Initialize the database with schema, demo users, and demo profile photos:

```bash
make db-init
```

Stop containers:

```bash
make down
```

Remove containers, volumes, and local images:

```bash
make fclean
```

## Seed Data

The seed flow is split into two parts:

- `scripts/sql/seed_fake_users.sql` creates around 500 demo users, profiles, tags, likes, views, and matches.
- `scripts/seed_photos_for_existing_users.js` adds demo photos for users whose email starts with `seed.` and ends with `@example.com`.

Primary seed profile photos are loaded from `randomuser.me` placeholder portraits. Additional demo photos are loaded from fixed Unsplash image URLs for landscapes, objects, architecture, and lifestyle scenes.

The `user_photos` table stores the selected image URL in `data_url` and marks the first photo as `is_primary = true` when a user receives photos.

## Useful Commands

- `make up`: Start the whole stack
- `make down`: Stop the containers
- `make clean`: Stop the containers and remove orphan containers
- `make fclean`: Stop containers, remove the database volume, and remove local images
- `make db-init`: Seed demo users and add profile photos
- `make reset-db`: Stop the containers and remove the database volume
- `make re`: Rebuild and start again
- `make ps`: Show container status
- `make logs`: Show logs

Backend checks:

```bash
npm run backend:check
```

Frontend build:

```bash
npm run frontend:build
```
