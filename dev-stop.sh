#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.dev-pids"

if [ ! -f "$PID_FILE" ]; then
  echo "No .dev-pids file found. Nothing to stop."
  exit 0
fi

read -r BACKEND_PID FRONTEND_PID < "$PID_FILE"

for PID in $BACKEND_PID $FRONTEND_PID; do
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "Stopped PID $PID"
  else
    echo "PID $PID already stopped"
  fi
done

rm -f "$PID_FILE"
echo "Done."
