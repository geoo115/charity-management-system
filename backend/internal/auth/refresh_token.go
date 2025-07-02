package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

// RefreshTokenClaims defines the structure of refresh token claims
type RefreshTokenClaims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

const (
	RefreshTokenLength = 32
)

// GenerateRefreshToken creates a new refresh token
func GenerateRefreshToken(userID uint, email string, role string) (string, error) {
	// Get JWT secret from environment
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "default_secret_for_development"
	}

	// Create token with claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, RefreshTokenClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(RefreshTokenExpiry)),
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

// ValidateRefreshToken validates a refresh token and returns claims
func ValidateRefreshToken(tokenString string) (*RefreshTokenClaims, error) {
	// Get JWT secret from environment
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "default_secret_for_development"
	}

	// Parse the token
	token, err := jwt.ParseWithClaims(tokenString, &RefreshTokenClaims{}, func(token *jwt.Token) (interface{}, error) {
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
	if claims, ok := token.Claims.(*RefreshTokenClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid refresh token")
}

// RefreshTokenHandler handles refresh token requests
func RefreshTokenHandler(userID uint, email string) (string, error) {
	// Get user role - this would normally come from database
	role := "Visitor" // Default role, should be fetched from database

	refreshToken, err := GenerateRefreshToken(userID, email, role)
	if err != nil {
		return "", err
	}

	return refreshToken, nil
}

// GenerateSecureTokenID generates a secure random token ID
func GenerateSecureTokenID() (string, error) {
	bytes := make([]byte, RefreshTokenLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}
