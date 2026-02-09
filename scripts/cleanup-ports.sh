#!/bin/bash


# Default ports (e.g. Next.js)
DEFAULT_PORTS="3000"

# Find ports defined in .env files within apps directory
# 1. grep -r to find "PORT=xxxx" in .env files
# 2. awk to extract the number
# 3. tr to remove quotes or whitespace
# 4. sort -u to get unique values
DETECTED_PORTS=$(grep -r "^PORT=" apps --include=".env" 2>/dev/null | awk -F '=' '{print $2}' | tr -d ' "' | sort -u | tr '\n' ' ')

# Combine and verify
PORTS="$DEFAULT_PORTS $DETECTED_PORTS"


echo "🧹 Cleaning up ports: $PORTS..."

for PORT in $PORTS; do
  PIDS=$(lsof -ti :$PORT)
  if [ -n "$PIDS" ]; then
    echo "  - Killing process(es) on port $PORT (PIDs: $PIDS)"
    kill -9 $PIDS 2>/dev/null || true
  fi
done

echo "✅ Ports are clear."
