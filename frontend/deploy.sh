#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Pindah ke root repo jika dijalankan dari dalam folder frontend
if [ -d "../.git" ]; then
    cd ..
fi

echo "🚀 [1/2] Pulling latest code from Git..."
git pull origin main

echo "🎨 [2/2] Building Frontend..."
cd frontend
npm install
npm run build

echo "✨ Frontend build complete! Files compiled to frontend/dist/"
