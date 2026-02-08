#!/bin/bash

PORTS="3000 4001 4002 4003 4004"

echo "🧹 Cleaning up ports: $PORTS..."

for PORT in $PORTS; do
  PIDS=$(lsof -ti :$PORT)
  if [ -n "$PIDS" ]; then
    echo "  - Killing process(es) on port $PORT (PIDs: $PIDS)"
    kill -9 $PIDS 2>/dev/null || true
  fi
done

echo "✅ Ports are clear."
