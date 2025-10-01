# WebSocket Connection Troubleshooting Guide

## Current Issue
Your frontend is successfully connecting to the backend API, but WebSocket connections are failing with error code 1006 (abnormal closure).

## What I've Done

### 1. **Enhanced WebSocket Error Handling**
- Added better error logging in the WebSocket upgrader
- Added debugging logs to track connection attempts
- Improved CORS handling for WebSocket connections

### 2. **Added Test WebSocket Endpoint**
- Created `/ws/test` endpoint without authentication for testing
- This helps isolate if the issue is with authentication or basic WebSocket connectivity

### 3. **Enhanced Authentication Middleware**
- Added detailed logging to WebSocket authentication process
- Better error messages for debugging

## Immediate Testing Steps

### Step 1: Test Basic WebSocket Connectivity
Once your backend redeploys, test the basic WebSocket connection:

```javascript
// Run this in your browser's developer console
const testWs = new WebSocket('wss://charity-backend-w5cm.onrender.com/ws/test');
testWs.onopen = () => console.log('Test WebSocket connected!');
testWs.onmessage = (e) => console.log('Received:', e.data);
testWs.onerror = (e) => console.error('WebSocket error:', e);
testWs.onclose = (e) => console.log('WebSocket closed:', e.code, e.reason);
```

### Step 2: Test WebSocket Status Endpoint
```bash
curl https://charity-backend-w5cm.onrender.com/api/v1/ws-status
```

### Step 3: Check Authentication Token
In your browser's developer console while logged in:
```javascript
localStorage.getItem('auth_token')
```

## Possible Root Causes & Solutions

### 1. **Render Platform WebSocket Limitations**
**Issue**: Render's free tier might have WebSocket limitations
**Solution**: Consider upgrading to a paid plan or test with a different deployment platform

### 2. **Token Format Issues**
**Issue**: The JWT token might not be in the expected format
**Solution**: Check if the token includes the "Bearer " prefix and is valid

### 3. **CORS with WebSocket**
**Issue**: WebSocket connections handle CORS differently than HTTP
**Solution**: I've updated the CORS settings, but you may need to configure Render-specific settings

### 4. **Timeout Issues**
**Issue**: WebSocket handshake taking too long
**Solution**: Consider implementing a connection timeout and retry mechanism

## Environment Variables to Verify in Render

Make sure these are set in your Render environment:
```bash
CORS_ALLOWED_ORIGINS=https://charity-management-system-puce.vercel.app
JWT_SECRET=your-secret
APP_ENV=production
```

## Alternative: Disable WebSocket Temporarily

If WebSocket continues to fail, you can disable it temporarily by modifying the frontend:

### Option 1: Disable WebSocket in Production
Add this to your frontend `.env.production`:
```bash
NEXT_PUBLIC_DISABLE_WEBSOCKET=true
```

### Option 2: Use Polling Instead
Modify the notification system to use HTTP polling instead of WebSocket for real-time updates.

## Next Steps After Backend Redeploys

1. **Monitor Render Logs**: Watch the deployment logs for WebSocket-related messages
2. **Test Basic Connectivity**: Use the test endpoint I created
3. **Check Browser Network Tab**: Look for WebSocket upgrade requests and their responses
4. **Test with Different Browsers**: Sometimes browsers handle WebSocket differently

## Advanced Debugging

If the basic test fails, we'll need to:
1. Check if Render supports WebSocket on your plan
2. Configure WebSocket-specific settings in Render
3. Consider using a dedicated WebSocket service (like Pusher or Ably)
4. Implement polling fallback

## Quick Fix: Disable WebSocket for Now

If you want the application to work immediately without WebSocket:

1. Set `NEXT_PUBLIC_DISABLE_WEBSOCKET=true` in Vercel
2. The app will fall back to regular HTTP requests for notifications
3. Users won't get real-time updates but everything else will work

Let me know what you find when testing the `/ws/test` endpoint!