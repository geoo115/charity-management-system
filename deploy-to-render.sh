#!/bin/bash

# 🚀 Render Deployment Helper Script for Lewisham Charity Hub

echo "🚀 Lewisham Charity Hub - Render Deployment Helper"
echo "================================================="

# Check if we're in the right directory
if [ ! -f "render.yaml" ]; then
    echo "❌ Error: render.yaml not found. Make sure you're in the project root directory."
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    echo "✅ Git repository initialized."
fi

# Check for git remote
if ! git remote get-url origin &> /dev/null; then
    echo "🔗 No Git remote found."
    echo "Please add your GitHub repository as origin:"
    echo "git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
    echo ""
    read -p "Enter your GitHub repository URL: " repo_url
    if [ ! -z "$repo_url" ]; then
        git remote add origin "$repo_url"
        echo "✅ Git remote added."
    fi
fi

# Stage all files
echo "📝 Staging files for deployment..."
git add .

# Commit with deployment message
echo "💾 Committing deployment configuration..."
git commit -m "Add Render deployment configuration

- Add Dockerfile.production for containerized deployment
- Add render.yaml for automated service provisioning
- Add deployment documentation and helper scripts
- Configure PostgreSQL and Redis services
- Set up environment variables for production

Ready for deployment on Render! 🚀"

# Push to repository
echo "🚀 Pushing to GitHub..."
if git push origin main; then
    echo "✅ Successfully pushed to GitHub!"
else
    echo "📤 Attempting to push to 'master' branch..."
    git push origin master
fi

echo ""
echo "🎉 Your code is now ready for Render deployment!"
echo ""
echo "Next steps:"
echo "1. Go to https://dashboard.render.com"
echo "2. Click 'New +' → 'Blueprint'"
echo "3. Connect your GitHub repository"
echo "4. Render will automatically detect render.yaml"
echo "5. Click 'Apply' to deploy"
echo ""
echo "Your app will be available at:"
echo "https://lewisham-charity-hub.onrender.com"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT.md"

# Optional: Open Render dashboard
read -p "Would you like to open Render dashboard in your browser? (y/n): " open_browser
if [ "$open_browser" = "y" ] || [ "$open_browser" = "Y" ]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open "https://dashboard.render.com"
    elif command -v open &> /dev/null; then
        open "https://dashboard.render.com"
    else
        echo "Please manually open: https://dashboard.render.com"
    fi
fi

echo "🎯 Happy deploying!" 