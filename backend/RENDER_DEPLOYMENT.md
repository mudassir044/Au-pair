# 🚀 Render Deployment Guide

## ✅ Your Backend is Render-Ready!

Your au-pair backend is fully configured for Render deployment. Here's what you need to do:

## 1. Environment Variables in Render

Set these environment variables in your Render service dashboard:

### Required Variables:

```
NODE_ENV=production
PORT=10000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
```

### Optional (for email functionality):

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Au Pair Service <noreply@aupair.com>
FRONTEND_URL=https://your-frontend-url.netlify.app
```

## 2. Render Service Configuration

Your backend is configured with:

- ✅ **Build Command**: `npm run render-build`
- ✅ **Start Command**: `npm start`
- ✅ **Node.js Environment**: Ready
- ✅ **Port Configuration**: Uses Render's PORT env var
- ✅ **Host Binding**: Configured for 0.0.0.0 in production

## 3. Deployment Steps

1. **Push your code** to GitHub/GitLab
2. **Create new Web Service** in Render
3. **Connect your repository**
4. **Set environment variables** (from step 1)
5. **Deploy!**

## 4. Render Service Settings

```
Build Command: npm run render-build
Start Command: npm start
Environment: Node
Auto-Deploy: Yes (recommended)
```

## 5. Post-Deployment Verification

After deployment, test these endpoints:

### Health Check:

```bash
curl https://your-app.onrender.com/health
```

### API Test:

```bash
curl -X POST https://your-app.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","role":"AU_PAIR"}'
```

## 6. Troubleshooting

### Common Issues:

**Build Fails:**

- Check that all dependencies are in package.json
- Verify TypeScript compiles locally with `npm run build`

**Service Won't Start:**

- Check environment variables are set correctly
- Verify Supabase credentials are valid

**Database Connection Fails:**

- Confirm SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
- Check Supabase project is active

**CORS Issues:**

- Set FRONTEND_URL to your actual frontend domain
- Frontend should use https://your-app.onrender.com as API base URL

## 7. Performance & Scaling

Your backend includes:

- ✅ Efficient database queries
- ✅ Connection pooling via Supabase
- ✅ Proper error handling
- ✅ Socket.io for real-time features
- ✅ Health monitoring

## 8. Monitoring

Monitor your service via:

- **Render Dashboard**: Service metrics and logs
- **Health Endpoint**: `GET /health` for service status
- **Application Logs**: Check for errors and performance

## 🎉 You're Ready to Deploy!

Your backend is **100% ready** for Render deployment. Just:

1. Set the environment variables
2. Push to your repo
3. Deploy on Render
4. Test the endpoints

Once deployed, au pairs and families can immediately start:

- ✅ Registering accounts
- ✅ Searching for matches
- ✅ Sending messages
- ✅ Managing profiles
- ✅ Real-time chatting

**Your au-pair platform is ready to go live!** 🚀
