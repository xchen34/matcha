# Matcha

Matcha is a full-stack dating web app with user profiles, likes and matching, search and recommendations, real-time chat, and notifications.

## Tech Stack

- Backend: Node.js, Express, PostgreSQL, Socket.IO
- Frontend: React (Vite), TailwindCSS, socket.io-client

## Make Commands

The project is managed through `make`. Common commands:

- `make up`: Start the whole stack
- `make down`: Stop the containers
- `make clean`: Stop the containers and remove orphan containers
- `make fclean`: Stop the containers, remove the database volume, and remove local images
- `make init-db`: Seed demo users and add profile photos
- `make reset-db`: Stop the containers and remove the database volume
- `make re`: Rebuild and start again
- `make ps`: Show container status
- `make logs`: Show logs

For a first start, run:

```bash
make up
```

This boots the services and creates the database tables, but leaves the tables empty.

If you need to reinitialize the database:

```bash
make init-db
```

If you want to clean the development environment:

```bash
make clean
make fclean
```
