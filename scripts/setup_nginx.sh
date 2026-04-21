#!/usr/bin/env bash
set -euo pipefail

MODE="prod"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--mode dev|prod]

Installs/symlinks Nginx config from this repo on the current machine.

Examples:
  $(basename "$0") --mode dev
  $(basename "$0") --mode prod
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
  echo "Invalid mode: $MODE (expected dev or prod)"
  exit 1
fi

if [[ ! -x "$(command -v nginx || true)" ]]; then
  echo "nginx is not installed or not in PATH"
  exit 1
fi

if [[ "$MODE" == "dev" ]]; then
  SRC_CONF="$REPO_ROOT/nginx/matcha.dev.conf"
else
  SRC_CONF="$REPO_ROOT/nginx/matcha.conf"
fi

if [[ ! -f "$SRC_CONF" ]]; then
  echo "Config file not found: $SRC_CONF"
  exit 1
fi

# Homebrew nginx (macOS)
if [[ -d "/opt/homebrew/etc/nginx/servers" ]]; then
  TARGET_DIR="/opt/homebrew/etc/nginx/servers"
  TARGET_CONF="$TARGET_DIR/matcha.conf"
  ln -sf "$SRC_CONF" "$TARGET_CONF"
  nginx -t
  nginx -s reload || true
  echo "Linked $SRC_CONF -> $TARGET_CONF"
  echo "Done. Active mode: $MODE"
  exit 0
fi

# Ubuntu/Debian style nginx
if [[ -d "/etc/nginx/sites-available" && -d "/etc/nginx/sites-enabled" ]]; then
  TARGET_AVAILABLE="/etc/nginx/sites-available/matcha.conf"
  TARGET_ENABLED="/etc/nginx/sites-enabled/matcha.conf"

  if [[ $EUID -ne 0 ]]; then
    echo "Need sudo/root for /etc/nginx. Re-run with sudo:"
    echo "  sudo $0 --mode $MODE"
    exit 1
  fi

  cp "$SRC_CONF" "$TARGET_AVAILABLE"
  ln -sf "$TARGET_AVAILABLE" "$TARGET_ENABLED"
  nginx -t
  systemctl reload nginx || nginx -s reload || true
  echo "Installed $TARGET_AVAILABLE and enabled site"
  echo "Done. Active mode: $MODE"
  exit 0
fi

echo "Unsupported nginx layout. Please install manually."
echo "Source config: $SRC_CONF"
exit 1
