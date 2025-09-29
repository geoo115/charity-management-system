package auth

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

// TokenClaims defines the claims in the JWT
type TokenClaims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateToken creates a new JWT token for a user
func GenerateToken(userID uint, email string, role string) (string, error) {
	// Get JWT secret from environment
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return "", errors.New("JWT_SECRET environment variable is required")
	}

	// Ensure minimum security for JWT secret
	if len(jwtSecret) < 32 {
		return "", errors.New("JWT_SECRET must be at least 32 characters for security")
	}

	// Create token with claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, TokenClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(TokenExpiry)), // Token valid for 15 minutes
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	})

	// Sign and get the complete encoded token as a string
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// ValidateToken verifies a JWT token and returns the claims
func ValidateToken(tokenString string) (*TokenClaims, error) {
	// Get JWT secret from environment
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, errors.New("JWT_SECRET environment variable is required")
	}

	// Ensure minimum security for JWT secret
	if len(jwtSecret) < 32 {
		return nil, errors.New("JWT_SECRET must be at least 32 characters for security")
	}

	// Parse the token
	token, err := jwt.ParseWithClaims(tokenString, &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	// Validate claims
	if claims, ok := token.Claims.(*TokenClaims); ok && token.Valid {
		// Check blacklist (Redis). If Redis is not configured this is a no-op.
		if blacklisted, err := IsTokenBlacklisted(context.Background(), tokenString); err != nil {
			return nil, fmt.Errorf("failed to check token blacklist: %w", err)
		} else if blacklisted {
			return nil, errors.New("token has been revoked")
		}

		return claims, nil
	}

	return nil, errors.New("invalid token")
}
