#!/bin/bash

# Seed Production Database Script
# This script connects to your deployed database and seeds it with test data

echo "🌱 Seeding Production Database for Charity Management System"
echo "=================================================="

# Check if we're in the backend directory
if [ ! -f "go.mod" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    echo "   cd backend && ./scripts/seed-production.sh"
    exit 1
fi

# Environment Variables for Production Database
# You need to set these to match your actual production database credentials
export APP_ENV=production
export SEED_DATABASE=true
export SEED_DB=true

# Production Database Configuration
# ⚠️  IMPORTANT: Replace these with your actual production database credentials
export DB_HOST="your-db-host"
export DB_PORT="5432"
export DB_USER="your-db-user"
export DB_PASSWORD="your-db-password"
export DB_NAME="your-db-name"
export DB_SSLMODE="require"

# Admin Account Configuration
# These will create the initial admin account
export ADMIN_EMAIL="admin@lewisham-hub.org"
export ADMIN_PASSWORD="AdminPass123!"
export ADMIN_FIRST_NAME="System"
export ADMIN_LAST_NAME="Administrator"

# JWT Configuration (use a strong secret in production)
export JWT_SECRET="your-production-jwt-secret-key-make-it-long-and-random"
export JWT_EXPIRATION="24h"

# CORS Configuration
export CORS_ALLOWED_ORIGINS="https://charity-management-system-puce.vercel.app,http://localhost:3000"

echo "📝 Configuration:"
echo "   Database Host: $DB_HOST"
echo "   Database Name: $DB_NAME"
echo "   Admin Email: $ADMIN_EMAIL"
echo ""

# Warning about production data
echo "⚠️  WARNING: This will seed your production database with test data!"
echo "   This includes:"
echo "   - Admin users (password: testpass123)"
echo "   - Test visitor accounts (password: testpass123)"
echo "   - Test volunteer accounts (password: volunteer123)"
echo "   - Test staff accounts (password: staff123)"
echo "   - Sample donations, help requests, and other data"
echo ""

read -p "Are you sure you want to continue? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Seeding cancelled"
    exit 1
fi

echo "🚀 Starting database seeding..."
echo ""

# Run the seeding
if go run ./cmd/api/main.go; then
    echo ""
    echo "✅ Database seeding completed successfully!"
    echo ""
    echo "🔑 Test Accounts Created:"
    echo "   Admin: admin@lewisham-hub.org (password: testpass123)"
    echo "   Deputy Admin: deputy.admin@lewisham-hub.org (password: testpass123)"
    echo "   Visitor: sarah.johnson@example.com (password: testpass123)"
    echo "   Volunteer: david.thompson@example.com (password: volunteer123)"
    echo "   Staff: coordinator@lewisham-hub.org (password: staff123)"
    echo ""
    echo "🌐 Your frontend should now be able to connect to:"
    echo "   Backend: https://charity-backend-w5cm.onrender.com"
    echo "   Frontend: https://charity-management-system-puce.vercel.app"
    echo ""
else
    echo ""
    echo "❌ Database seeding failed!"
    echo "   Please check the error messages above and verify your database credentials."
    exit 1
fi