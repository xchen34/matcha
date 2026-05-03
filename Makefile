.PHONY: all up down clean fclean reset-db re

all: up

up:
	docker compose up -d --build
down:
	docker compose down

clean:
	docker compose down -v --remove-orphans

fclean:
	docker compose down --rmi local --remove-orphans

reset-db:
	docker compose down -v --remove-orphans

re: fclean all