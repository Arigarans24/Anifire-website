#!/usr/bin/env bash
# Bring up the whole Anifire stack in ONE terminal:
#   Postgres (docker) + Spring Boot backend + Next.js frontend.
# Logs are merged with colored [backend]/[frontend] prefixes.
# Ctrl-C tears everything down (apps + docker) cleanly.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

COMPOSE_FILE="anime-backend/anime-backend/compose.yaml"
backend_pid=""
frontend_pid=""
cleanup_done=false

kill_tree() {
  local pid="${1:-}"
  [[ -z "$pid" ]] && return
  if ! kill -0 "$pid" 2>/dev/null; then
    return
  fi

  local child
  for child in $(ps -o pid= --ppid "$pid" 2>/dev/null || true); do
    kill_tree "$child"
  done

  kill "$pid" 2>/dev/null || true
}

free_port() {
  local port="$1" pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -ti "tcp:$port" 2>/dev/null || true)
  elif command -v fuser >/dev/null 2>&1; then
    pids=$(fuser -n tcp "$port" 2>/dev/null || true)
  else
    echo "▸ Port $port is in use, but no lsof/fuser is installed. Skipping auto-free; stop the process manually if needed."
    return
  fi

  if [ -n "$pids" ]; then
    echo "▸ Port $port busy — freeing (pids: $pids)"
    for pid in $pids; do
      kill_tree "$pid"
    done
    sleep 1
  fi
}

cleanup() {
  if $cleanup_done; then
    return
  fi
  cleanup_done=true
  echo ""
  echo "▸ Shutting down..."
  [ -n "$backend_pid" ] && kill_tree "$backend_pid"
  [ -n "$frontend_pid" ] && kill_tree "$frontend_pid"
  docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
  echo "▸ Done."
}
trap cleanup INT TERM EXIT

echo "▸ Starting Postgres (docker)..."
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but not installed or not on PATH."
  exit 1
fi

docker compose -f "$COMPOSE_FILE" up -d
sleep 2

echo "▸ Starting backend (Spring Boot)..."
free_port 8080
( cd anime-backend/anime-backend && exec ./gradlew bootRun ) \
  > >(sed $'s/^/[\x1b[36mbackend\x1b[0m]  /') 2>&1 &
backend_pid=$!

echo "▸ Starting frontend (Next.js)..."
free_port 3000
( cd anime-streaming && exec npm run dev ) \
  > >(sed $'s/^/[\x1b[35mfrontend\x1b[0m] /') 2>&1 &
frontend_pid=$!

cat <<BANNER

══════════════════════════════════════════════
  Anifire stack is starting up
  Frontend:  http://localhost:3000
  Backend:   http://localhost:8080/api/v1/animes
  Press Ctrl-C to stop everything.
══════════════════════════════════════════════

BANNER

wait "$backend_pid" "$frontend_pid"
