#!/usr/bin/env bash

# IMS-V2 One-Command VPS Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting IMS-V2 Deployment..."

# 1. Pull latest updates from master
echo "📥 Pulling latest changes from Git master..."
git pull origin master

# 2. Build with optimized Node memory flags
echo "🔨 Compiling production build..."
NODE_OPTIONS="--max-old-space-size=2048" npm run build

# 3. Restart PM2 application instance
echo "🔄 Restarting PM2 process (ims-v2)..."
pm2 restart ims-v2

echo ""
echo "✅ Deployment Successful!"
echo "--------------------------------"
pm2 status ims-v2
