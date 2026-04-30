#!/bin/bash

echo "🧪 Testing Promotion API with Auto-Fee Creation"
echo "================================================"
echo ""

# Wait for dev server to be ready
sleep 2

# Test promotion endpoint
echo "📍 Testing: POST /api/v1/students/promote"
echo ""

# Dummy IDs for testing (replace with real ones from your DB)
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/students/promote \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=test" \
  -d '{
    "studentIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
    "targetBatchId": "507f1f77bcf86cd799439013"
  }')

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
