#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🎨 Setting up Frontend..."
npm install
npm run build

echo "✨ Frontend build completed! Output is located in dist/ folder."
