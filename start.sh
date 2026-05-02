#!/bin/bash
set -e

echo "🚀 Starting ClipFast..."

# Check for .env file
if [ ! -f .env ]; then
  echo "⚠️  No .env file found. Copying .env.example..."
  cp .env.example .env
  echo "✏️  Please edit .env with your API keys, then re-run this script."
  exit 1
fi

# Export env vars
export $(grep -v '^#' .env | xargs)

# Start backend
echo "🐍 Starting FastAPI backend..."
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
echo "⚡ Starting Next.js frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ ClipFast is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
