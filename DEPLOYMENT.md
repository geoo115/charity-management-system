# 🚀 Deployment Guide - Render

This guide will help you deploy the Lewisham Charity Hub to Render for free testing and sharing.

## 📋 Prerequisites

1. GitHub account with your code repository
2. Render account (free at [render.com](https://render.com))

## 🔧 Step-by-Step Deployment

### 1. Prepare Your Repository

Make sure these files are in your repository root:
- `Dockerfile.production` ✅ (Created)
- `render.yaml` ✅ (Created)
- `deployment.env.example` ✅ (Created)

### 2. Push to GitHub

```bash
# Make sure you're in the project root
cd /path/to/LDH2

# Add all files
git add .

# Commit changes
git commit -m "Add Render deployment configuration"

# Push to GitHub
git push origin main
```

### 3. Deploy on Render

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Sign up/Login with GitHub

2. **Create New Blueprint**
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository containing your code
   - Render will automatically detect `render.yaml`

3. **Review Configuration**
   - **Service Name**: `lewisham-charity-hub`
   - **Database**: PostgreSQL (Free tier)
   - **Redis**: Redis (Free tier)
   - **Build Command**: Docker build using `Dockerfile.production`

4. **Set Environment Variables**
   - Render will automatically set database connection strings
   - You may need to add:
     ```
     JWT_SECRET=your-super-secret-jwt-key-here
     REFRESH_SECRET=your-super-secret-refresh-key-here
     GIN_MODE=release
     ```

5. **Deploy**
   - Click "Apply"
   - Wait for build and deployment (5-10 minutes)

## 🌐 Access Your Application

After deployment, you'll get URLs like:
- **Main App**: `https://lewisham-charity-hub.onrender.com`
- **API Health**: `https://lewisham-charity-hub.onrender.com/health`
- **Database**: Managed by Render (internal connection)

## 🔄 Automatic Deployments

- Every push to `main` branch will trigger automatic redeployment
- Monitor deployments in Render dashboard
- View logs for debugging

## 📊 Free Tier Limits

**Render Free Tier includes:**
- 750 hours/month web service time
- PostgreSQL database (90 days, then deleted if inactive)
- 1GB storage
- Custom domain support
- Automatic SSL certificates

## 🐛 Troubleshooting

### Build Fails
- Check logs in Render dashboard
- Verify `Dockerfile.production` syntax
- Ensure all dependencies are listed

### Database Connection Issues
- Verify `DATABASE_URL` environment variable
- Check database service is running
- Review connection string format

### Frontend Not Loading
- Check if build created `.next` folder
- Verify static files are copied correctly
- Review browser console for errors

## 🔧 Local Testing

Test your production build locally:

```bash
# Build the production image
docker build -f Dockerfile.production -t lewisham-hub .

# Run with environment variables
docker run -p 8080:8080 \
  -e DATABASE_URL="your-local-db-url" \
  -e JWT_SECRET="test-secret" \
  lewisham-hub
```

## 📞 Support

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Community**: [community.render.com](https://community.render.com)
- **Status**: [status.render.com](https://status.render.com)

## 🔒 Security Notes

- Never commit real secrets to Git
- Use Render's environment variables for sensitive data
- Enable HTTPS (automatic on Render)
- Consider rate limiting for production use 