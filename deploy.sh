#!/usr/bin/env bash

# IMS-V2 Deployment Script
# Usage: ./deploy.sh or bash deploy.sh

cd ~/apps/ims-v2 || cd /root/apps/ims-v2 || true

git pull
npm i --legacy-peer-deps
npm run build
pm2 restart ims-v2
