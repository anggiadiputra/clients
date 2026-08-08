#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "⚙️ Setting up Backend..."
npm install --production=false
npx prisma db push
npm run prisma:gen
npm run seed || true
npm run build

echo "🔄 Restarting PM2 process..."
if command -v pm2 &> /dev/null; then
    pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs
    pm2 save
    echo "✅ PM2 process restarted successfully!"
else
    echo "⚠️ PM2 not found. Please restart manually."
fi
