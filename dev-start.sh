#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.dev-pids"

if [ -f "$PID_FILE" ]; then
  echo "Dev servers may already be running (found .dev-pids). Run ./dev-stop.sh first."
  exit 1
fi

echo "Starting backend..."
cd "$SCRIPT_DIR"
uv run uvicorn backend.main:app --reload &
BACKEND_PID=$!

echo "Starting frontend..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo "$BACKEND_PID $FRONTEND_PID" > "$PID_FILE"

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Open http://localhost:5173"
echo "Run ./dev-stop.sh to stop both servers."
