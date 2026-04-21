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

NGINX_BIN="$(command -v nginx || true)"
BREW_BIN="$(command -v brew || true)"

install_nginx_if_needed() {
  if [[ -n "$NGINX_BIN" ]]; then
    return 0
  fi

  if [[ "$(uname -s)" == "Darwin" && -n "$BREW_BIN" ]]; then
    echo "nginx not found, installing via Homebrew..."
    brew install nginx
    NGINX_BIN="$(command -v nginx || true)"
    return 0
  fi

  echo "nginx is not installed or not in PATH"
  echo "Install it first, then re-run this script."
  echo "macOS: brew install nginx"
  echo "Ubuntu/Debian: sudo apt-get install nginx"
  exit 1
}

install_nginx_if_needed

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
if [[ "$(uname -s)" == "Darwin" && -n "$BREW_BIN" ]]; then
  BREW_PREFIX="$(brew --prefix)"
  TARGET_DIR="$BREW_PREFIX/etc/nginx/servers"
  mkdir -p "$TARGET_DIR"
  TARGET_CONF="$TARGET_DIR/matcha.conf"
  ln -sf "$SRC_CONF" "$TARGET_CONF"
  "$NGINX_BIN" -t
  "$NGINX_BIN" -s reload || true
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
  "$NGINX_BIN" -t
  systemctl reload nginx || "$NGINX_BIN" -s reload || true
  echo "Installed $TARGET_AVAILABLE and enabled site"
  echo "Done. Active mode: $MODE"
  exit 0
fi

echo "Unsupported nginx layout. Please install manually."
echo "Source config: $SRC_CONF"
exit 1
