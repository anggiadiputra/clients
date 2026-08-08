#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Pindah ke root repo jika dijalankan dari dalam folder backend
if [ -d "../.git" ]; then
    cd ..
fi

echo "🚀 [1/3] Pulling latest code from Git..."
git pull origin main

echo "⚙️ [2/3] Installing dependencies & Prisma setup..."
cd backend
npm install
npx prisma db push
npm run prisma:gen
npm run build

echo "🔄 [3/3] Restarting PM2 process..."
if command -v pm2 &> /dev/null; then
    pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs
    pm2 save
    echo "✅ Backend updated & restarted successfully!"
else
    echo "⚠️ PM2 not found. Please restart backend manually."
fi
