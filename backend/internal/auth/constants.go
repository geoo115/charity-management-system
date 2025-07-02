package auth

import "time"

// TokenExpiry defines how long JWT tokens are valid
const TokenExpiry = 24 * time.Hour // 24 hours for development

// RefreshTokenExpiry defines how long refresh tokens are valid
const RefreshTokenExpiry = 7 * 24 * time.Hour // 7 days

// PasswordResetTokenExpiry defines how long password reset tokens are valid
const PasswordResetTokenExpiry = 1 * time.Hour // 1 hour
