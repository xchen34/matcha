#!/bin/sh

set -e

echo "🚀 Waiting DB..."

until nc -z db 5432; do
  sleep 1
done

echo "✅ DB ready"

echo "🧱 Init DB..."
npm run db:init

echo "🌱 Seed photos..."
npm run db:seed-photos

echo "🔥 Starting server..."
exec npm run dev