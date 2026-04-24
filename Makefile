.PHONY: all up down clean fclean re

all: up

up:
	docker compose up -d --build

down:
	docker compose down

clean:
	docker compose down -v --remove-orphans

fclean:
	docker compose down -v --rmi local --remove-orphans

re: fclean all