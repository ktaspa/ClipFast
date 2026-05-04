#!/bin/bash
set -e

SERVER="root@45.76.233.237"
D="/opt/clixfair"
LOCAL="/Users/kapiltaspa/clipfast"
SSH=(ssh)
SCP=(scp)
if [[ -n "${SSHPASS:-}" ]]; then
  SSH=(sshpass -e ssh)
  SCP=(sshpass -e scp)
fi

echo "==> Syncing .env to server (backend needs GOOGLE_CLIENT_SECRET)..."
"${SCP[@]}" "$LOCAL/.env" "$SERVER:$D/.env"

echo "==> Uploading frontend files..."
"${SCP[@]}" "$LOCAL/frontend/next.config.js"             "$SERVER:$D/frontend/next.config.js"
"${SCP[@]}" "$LOCAL/frontend/lib/api.ts"                "$SERVER:$D/frontend/lib/api.ts"
"${SCP[@]}" "$LOCAL/frontend/components/SocialCard.tsx" "$SERVER:$D/frontend/components/SocialCard.tsx"
"${SCP[@]}" "$LOCAL/frontend/components/LandingPage.tsx" "$SERVER:$D/frontend/components/LandingPage.tsx"
"${SCP[@]}" "$LOCAL/frontend/app/dashboard/page.tsx"    "$SERVER:$D/frontend/app/dashboard/page.tsx"
"${SCP[@]}" "$LOCAL/frontend/app/auth/page.tsx"         "$SERVER:$D/frontend/app/auth/page.tsx"
"${SSH[@]}" "$SERVER" "rm -rf $D/frontend/app/api/auth/send-otp $D/frontend/app/api/auth/verify-otp && rm -f $D/frontend/lib/rate-limit.ts"
"${SSH[@]}" "$SERVER" "mkdir -p $D/frontend/app/pricing"
"${SCP[@]}" "$LOCAL/frontend/app/pricing/page.tsx"       "$SERVER:$D/frontend/app/pricing/page.tsx"

echo "==> Uploading backend billing and clipping updates..."
"${SCP[@]}" "$LOCAL/docker-compose.yml"                  "$SERVER:$D/docker-compose.yml"
"${SCP[@]}" "$LOCAL/backend/models.py"                   "$SERVER:$D/backend/models.py"
"${SCP[@]}" "$LOCAL/backend/database.py"                 "$SERVER:$D/backend/database.py"
"${SCP[@]}" "$LOCAL/backend/main.py"                     "$SERVER:$D/backend/main.py"
"${SCP[@]}" "$LOCAL/backend/schemas.py"                  "$SERVER:$D/backend/schemas.py"
"${SCP[@]}" "$LOCAL/backend/security.py"                 "$SERVER:$D/backend/security.py"
"${SCP[@]}" "$LOCAL/backend/requirements.txt"            "$SERVER:$D/backend/requirements.txt"
"${SCP[@]}" "$LOCAL/backend/routes/jobs.py"              "$SERVER:$D/backend/routes/jobs.py"
"${SCP[@]}" "$LOCAL/backend/routes/activity.py"          "$SERVER:$D/backend/routes/activity.py"
"${SCP[@]}" "$LOCAL/backend/routes/socials.py"           "$SERVER:$D/backend/routes/socials.py"
"${SCP[@]}" "$LOCAL/backend/routes/clips.py"             "$SERVER:$D/backend/routes/clips.py"
"${SCP[@]}" "$LOCAL/backend/routes/channels.py"          "$SERVER:$D/backend/routes/channels.py"
"${SCP[@]}" "$LOCAL/backend/routes/uploads.py"           "$SERVER:$D/backend/routes/uploads.py"
"${SCP[@]}" "$LOCAL/backend/services/ai_service.py"      "$SERVER:$D/backend/services/ai_service.py"
"${SCP[@]}" "$LOCAL/backend/services/video_service.py"   "$SERVER:$D/backend/services/video_service.py"
"${SSH[@]}" "$SERVER" "mkdir -p $D/backend/routes $D/backend/services"
"${SCP[@]}" "$LOCAL/backend/routes/billing.py"           "$SERVER:$D/backend/routes/billing.py"
"${SCP[@]}" "$LOCAL/backend/services/credit_service.py"  "$SERVER:$D/backend/services/credit_service.py"

echo "==> Uploading YouTube callback page..."
"${SSH[@]}" "$SERVER" "mkdir -p $D/frontend/app/auth/youtube/callback"
"${SCP[@]}" "$LOCAL/frontend/app/auth/youtube/callback/page.tsx" \
    "$SERVER:$D/frontend/app/auth/youtube/callback/page.tsx"

echo "==> Rebuilding backend and frontend..."
"${SSH[@]}" "$SERVER" "cd $D && docker compose up -d --build backend frontend"

echo "==> Done! https://clixfair.com/dashboard"
