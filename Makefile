<<<<<<< HEAD
.PHONY: all up down clean fclean re
=======
.PHONY: all up down clean fclean reset-db re
>>>>>>> e4aa0ed109d4b98a8f8e3b3b792116f4fc70de0d

all: up

up:
	docker compose up -d --build

down:
	docker compose down

clean:
<<<<<<< HEAD
	docker compose down -v --remove-orphans

fclean:
	docker compose down -v --rmi local --remove-orphans

re: fclean all 
=======
	docker compose down --remove-orphans

fclean:
	docker compose down --rmi local --remove-orphans

reset-db:
	docker compose down -v --remove-orphans

re: fclean all
>>>>>>> e4aa0ed109d4b98a8f8e3b3b792116f4fc70de0d
