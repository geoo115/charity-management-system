#!/bin/bash

echo "🔍 Testing Backend Endpoints"
echo "============================"

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s "https://charity-backend-w5cm.onrender.com/api/health" | jq -r '.status // "Failed"'

# Test CORS with a preflight request
echo ""
echo "2. Testing CORS preflight..."
curl -I -X OPTIONS \
  -H "Origin: https://charity-management-system-puce.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  "https://charity-backend-w5cm.onrender.com/api/v1/auth/login" 2>/dev/null | grep -E "Access-Control|HTTP"

# Test WebSocket status
echo ""
echo "3. Testing WebSocket status..."
curl -s "https://charity-backend-w5cm.onrender.com/api/v1/ws-status" | jq -r '.available // "Failed"'

# Test if basic endpoints respond
echo ""
echo "4. Testing API endpoints availability..."
endpoints=(
  "/api/health"
  "/api/v1/ws-status" 
  "/api/v1/auth/login"
)

for endpoint in "${endpoints[@]}"; do
  status_code=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
    -H "Origin: https://charity-management-system-puce.vercel.app" \
    "https://charity-backend-w5cm.onrender.com${endpoint}")
  
  if [ "$status_code" = "204" ] || [ "$status_code" = "200" ]; then
    echo "  ✅ $endpoint - OK ($status_code)"
  else
    echo "  ❌ $endpoint - Failed ($status_code)"
  fi
done

echo ""
echo "🎯 Next Steps:"
echo "1. Wait for backend deployment to complete (~2-3 minutes)"
echo "2. Test your frontend at: https://charity-management-system-puce.vercel.app"
echo "3. Try logging in with: admin@lewisham-hub.org / testpass123"