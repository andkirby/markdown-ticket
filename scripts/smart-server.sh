#!/usr/bin/env bash
# Smart Server Manager — switches between prod and dev (--hot) mode.
#
# - Starts in PROD mode (bun server/server.ts) — low memory footprint
# - On file changes in server/ → switches to DEV mode (bun --hot) — auto-reload
# - After 1 hour of no file changes → falls back to PROD mode
# - Auto-restarts on crash
#
# Usage: bash scripts/smart-server.sh [idle-timeout-seconds]
#   Default idle timeout: 3600 (1 hour)

set -euo pipefail

# Help
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Smart Server Manager — auto-switches between prod and dev (--hot) mode."
  echo ""
  echo "Usage: bash scripts/smart-server.sh [idle-timeout-seconds]"
  echo ""
  echo "Options:"
  echo "  idle-timeout-seconds  Seconds before falling back to prod (default: 3600 = 1h)"
  echo "  -h, --help            Show this help"
  echo ""
  echo "Behavior:"
  echo "  - Starts in PROD mode (low memory)"
  echo "  - File change in server/ → switches to DEV (--hot, auto-reload)"
  echo "  - Idle for timeout → falls back to PROD"
  echo "  - Auto-restarts on crash"
  echo ""
  echo "Commands:"
  echo "  bun run smart-server         # 1-hour idle timeout"
  echo "  bun run smart-server:30      # 30-min idle timeout"
  echo "  bash scripts/smart-server.sh 900  # 15-min custom timeout"
  exit 0
fi

ENTRYPOINT="server/server.ts"
WATCH_DIR="server"
IDLE_TIMEOUT="${1:-3600}"

# State
CURRENT_MODE="none"
SERVER_PID=""
LAST_CHANGE_TS=0
FSWATCH_PID=""

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
DIM='\033[2m'
RESET='\033[0m'

log()  { echo -e "${CYAN}[smart]${RESET} $*"; }

cleanup() {
  log "Shutting down..."
  kill "$SERVER_PID" "$FSWATCH_PID" 2>/dev/null || true
  wait "$SERVER_PID" "$FSWATCH_PID" 2>/dev/null || true
  rm -f /tmp/mdt-smart-server.lock
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Prevent double-run
LOCKFILE="/tmp/mdt-smart-server.lock"
if [ -f "$LOCKFILE" ]; then
  OLD_PID=$(cat "$LOCKFILE" 2>/dev/null || echo "")
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Already running (PID $OLD_PID)."
    exit 1
  fi
  rm -f "$LOCKFILE"
fi
echo $$ > "$LOCKFILE"

# ── Server lifecycle ─────────────────────────────────────────

start_prod() {
  [[ "$CURRENT_MODE" == "prod" ]] && return
  stop_current
  log "Starting ${GREEN}PROD${RESET} mode ${DIM}(low memory)${RESET}"
  bun "$ENTRYPOINT" &
  SERVER_PID=$!
  CURRENT_MODE="prod"
}

start_hot() {
  [[ "$CURRENT_MODE" == "hot" ]] && return
  stop_current
  log "Starting ${YELLOW}DEV (--hot)${RESET} mode ${DIM}(auto-reload)${RESET}"
  bun --hot "$ENTRYPOINT" &
  SERVER_PID=$!
  CURRENT_MODE="hot"
}

stop_current() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill -TERM "$SERVER_PID" 2>/dev/null || true
    for _ in $(seq 1 10); do
      kill -0 "$SERVER_PID" 2>/dev/null || break
      sleep 0.5
    done
    kill -KILL "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
    SERVER_PID=""
  fi
}

# ── File change handler ──────────────────────────────────────

on_file_change() {
  LAST_CHANGE_TS=$(date +%s)
  if [[ "$CURRENT_MODE" == "hot" ]]; then
    return  # bun --hot handles reload internally
  fi
  log "File change detected → switching to ${YELLOW}DEV${RESET}"
  start_hot
}

# ── Init ─────────────────────────────────────────────────────

log "Smart Server Manager"
log "  Idle timeout: $(( IDLE_TIMEOUT / 60 ))min | Watching: ${WATCH_DIR}/"
log ""

# Start fswatch (exclude build artifacts)
fswatch -r -1 \
  --event Updated --event Created --event Removed --event Moved \
  -e '\.js$' -e '\.js\.map$' -e '\.d\.ts$' -e 'node_modules' \
  "$WATCH_DIR/" 2>/dev/null \
  | while read -r _; do on_file_change; done &
FSWATCH_PID=$!

# Start in prod
start_prod

# ── Main loop: health check + idle detection ─────────────────

while true; do
  sleep 60

  # Restart on crash
  if [[ -n "$SERVER_PID" ]] && ! kill -0 "$SERVER_PID" 2>/dev/null; then
    log "Server crashed → restarting in $CURRENT_MODE"
    if [[ "$CURRENT_MODE" == "hot" ]]; then start_hot; else start_prod; fi
  fi

  # Idle fallback to prod
  if [[ "$CURRENT_MODE" == "hot" ]]; then
    ELAPSED=$(( $(date +%s) - LAST_CHANGE_TS ))
    if [[ "$ELAPSED" -ge "$IDLE_TIMEOUT" ]]; then
      log "Idle $(( ELAPSED / 60 ))min → falling back to ${GREEN}PROD${RESET}"
      start_prod
    fi
  fi
done
