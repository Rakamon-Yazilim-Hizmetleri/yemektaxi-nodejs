#!/usr/bin/env bash

echo "Starting deployment..."

git pull

docker compose -f docker-compose.prod.yml up -d --build
docker compose logs --until=3s --since=3s --tail=10
docker system prune -f --filter="until=1h"

echo "Deployment successful."