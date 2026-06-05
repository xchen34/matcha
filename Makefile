.PHONY: all up down clean fclean reset-db db-init re logs ps restart

all: up

up:
	docker compose up -d --build
	@echo "🚀 Project started!"
	@echo "🌐 Website: http://localhost:5173"
	@echo "🗄️ Adminer(db):   http://localhost:8080"

down:
	docker compose down

restart:
	docker compose down && docker compose up -d --build

clean:
	docker compose down --remove-orphans

fclean:
	docker compose down -v --rmi local --remove-orphans

reset-db:
	docker compose down -v --remove-orphans

db-init:
	docker compose run --rm backend npm run db:init

re: fclean all

ps:
	docker compose ps

logs:
	docker compose logs -f
