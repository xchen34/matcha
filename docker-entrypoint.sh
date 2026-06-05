#!/bin/sh

set -e

echo "🚀 Waiting DB..."

until nc -z db 5432; do
  sleep 1
done

echo "✅ DB ready"

echo "🔥 Starting server..."
exec "$@"
