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

# Recursively kill a process and all of its descendants (npm spawns next-server,
# gradle spawns the JVM — a plain `kill <pid>` would orphan the children).
kill_tree() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null); do
    kill_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

# Free a TCP port left occupied by a previous run (stale gradle/JVM or next-server)
# so the app can bind instead of failing with "Port already in use".
free_port() {
  local port="$1" pids
  pids=$(lsof -ti "tcp:$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "▸ Port $port busy — freeing (pids: $pids)"
    kill $pids 2>/dev/null || true
    sleep 1
    pids=$(lsof -ti "tcp:$port" 2>/dev/null || true)
    [ -n "$pids" ] && kill -9 $pids 2>/dev/null || true
  fi
}

cleanup() {
  $cleanup_done && return
  cleanup_done=true
  echo ""
  echo "▸ Shutting down..."
  [ -n "$backend_pid" ]  && kill_tree "$backend_pid"
  [ -n "$frontend_pid" ] && kill_tree "$frontend_pid"
  docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
  echo "▸ Done."
}
trap cleanup INT TERM EXIT

echo "▸ Starting Postgres (docker)..."
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

# Stay in the foreground until both apps exit (or Ctrl-C).
wait "$backend_pid" "$frontend_pid"
