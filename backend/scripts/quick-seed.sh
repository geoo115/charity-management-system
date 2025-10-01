#!/bin/bash

# Quick Seed Command for Production
# Replace the database credentials below with your actual production database details

echo "🌱 Quick Production Database Seeding"
echo "======================================"

# Set environment variables and run seeding in one command
SEED_DB=true \
APP_ENV=production \
DB_HOST="your-production-db-host" \
DB_PORT="5432" \
DB_USER="your-production-db-user" \
DB_PASSWORD="your-production-db-password" \
DB_NAME="your-production-db-name" \
DB_SSLMODE="require" \
ADMIN_EMAIL="admin@lewisham-hub.org" \
ADMIN_PASSWORD="AdminPass123!" \
JWT_SECRET="your-production-jwt-secret-here" \
CORS_ALLOWED_ORIGINS="https://charity-management-system-puce.vercel.app,http://localhost:3000" \
go run ./cmd/api/main.go

echo ""
echo "✅ If successful, test accounts are now available:"
echo "   Admin: admin@lewisham-hub.org (password: testpass123)"
echo "   Visitor: sarah.johnson@example.com (password: testpass123)"
echo "   Volunteer: david.thompson@example.com (password: volunteer123)"