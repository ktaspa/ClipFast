#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "Starting ClipFast (local dev — full Docker stack is optional)..."

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "Created .env from .env.example — add ASSEMBLY_AI_API_KEY / GOOGLE_API_KEY when you need the clip pipeline."
  else
    echo "No .env found; continuing without it (optional keys + SQLite if Postgres is down)."
  fi
fi

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

echo ""
echo "Docker (optional):"
echo "  docker compose up -d postgres   # DB only — keep DATABASE_URL pointing at localhost:5432"
echo "  docker compose up -d            # Postgres + API + frontend (needs Docker Desktop running)"
echo "Without Postgres, the API falls back to SQLite (clipfast_local.db in this folder)."
echo ""

echo "Starting FastAPI backend..."
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "Starting Next.js frontend..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
cd "$ROOT"

echo ""
echo "ClipFast is running:"
echo "  Frontend: http://127.0.0.1:3000"
echo "  Backend:  http://127.0.0.1:8000"
echo "  API docs: http://127.0.0.1:8000/docs"
echo ""
echo "If the frontend has missing CSS, 404 on /_next/static, or Cannot find module './948.js': cd frontend && npm run clean && npm run dev"
echo "If webpack vendor-chunk / motion-utils errors persist:             cd frontend && npm run dev:turbo"
echo "If you see EMFILE (too many open files):   cd frontend && npm run dev:poll"
echo ""
echo "Press Ctrl+C to stop."

trap 'kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null; exit' INT TERM
wait
