# CORS Fix Deployment Guide

## Issue
The frontend is getting CORS errors when trying to access the API from `https://skill-x-client.vercel.app` to `https://skillx-production-5d56.up.railway.app`.

## Root Cause Found
The issue was that the frontend axios requests were missing the `withCredentials: true` option, which is required for CORS requests with credentials.

## Changes Made

### Backend Changes
1. **Fixed CORS Configuration Order**: CORS is now applied before other middleware
2. **Added Production Domain**: Added the Railway production domain to allowed origins
3. **Enhanced Debugging**: Added comprehensive logging for CORS issues
4. **Explicit Preflight Handler**: Added explicit OPTIONS request handling
5. **Environment Variable Support**: Added support for CLIENT_ORIGIN environment variable
6. **Railway Proxy Headers**: Added support for Railway's proxy headers (X-Forwarded-For, X-Forwarded-Proto)

### Frontend Changes
1. **Axios Configuration**: Added `withCredentials: true` to all axios requests
2. **Global Axios Settings**: Set global axios defaults for CORS
3. **API Utility**: Created utility functions for consistent API requests with proper CORS settings

## Deployment Steps

### 1. Deploy Backend to Railway
```bash
# If using Railway CLI
railway up

# Or push to your connected repository
git add .
git commit -m "Fix CORS configuration for production"
git push
```

### 2. Deploy Frontend to Vercel
```bash
# Deploy the frontend with the updated axios configuration
git add .
git commit -m "Fix axios CORS configuration"
git push
```

### 3. Set Environment Variables in Railway
In your Railway dashboard, ensure these environment variables are set:
- `CLIENT_ORIGIN=https://skill-x-client.vercel.app`
- `NODE_ENV=production`

### 4. Verify Deployment
After deployment, check the Railway logs for:
- Environment information logging
- CORS check logging
- Preflight request logging
- Login function calls

### 5. Test the Fix
1. Try logging in from your frontend
2. Check browser developer tools for CORS errors
3. Check Railway logs for debugging output

## Debugging
If the issue persists, check the Railway logs for:
- `CORS check for origin:` - Shows what origin is being checked
- `Allowed origins:` - Shows the list of allowed origins
- `Preflight request received for:` - Shows if OPTIONS requests are being handled
- `Preflight response headers set` - Shows if CORS headers are being set
- `Login function called` - Shows if the login request reaches the controller

## Key Changes Summary
- **Backend**: Multiple layers of CORS protection with debugging
- **Frontend**: Added `withCredentials: true` to axios requests
- **Both**: Proper handling of Railway's proxy headers

## Security Note
The current configuration allows all origins for debugging. Once the issue is resolved, uncomment the production security code in the CORS configuration. 