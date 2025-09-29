package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/geoo115/charity-management-system/internal/jobs"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/go-redis/redis/v8"
)

const (
	// Redis key prefix for blacklisted tokens
	redisBlacklistPrefix = "jwt_blacklist:"
)

// BlacklistToken adds a token to the Redis blacklist with the given TTL and persists a DB record if dbSaveFunc is provided.
func BlacklistToken(ctx context.Context, token string, userID uint, ttl time.Duration, dbSaveFunc func(tb *models.TokenBlacklist) error) error {
	if token == "" {
		return errors.New("token is empty")
	}

	// If Redis is available, set a key with TTL
	if jobs.RedisClient != nil {
		key := redisBlacklistPrefix + token
		if err := jobs.RedisClient.Set(ctx, key, "1", ttl).Err(); err != nil {
			// Log but continue to attempt DB save
			return fmt.Errorf("redis set failed: %w", err)
		}
	}

	// Persist to DB if a save function is provided (adapter provided by caller to avoid import cycles)
	if dbSaveFunc != nil {
		tb := &models.TokenBlacklist{
			Token:         token,
			BlacklistedAt: time.Now(),
			UserID:        userID,
			Reason:        "user_logout_or_revocation",
		}
		if err := dbSaveFunc(tb); err != nil {
			return fmt.Errorf("db save failed: %w", err)
		}
	}

	return nil
}

// IsTokenBlacklisted checks Redis for the token; returns true if blacklisted
func IsTokenBlacklisted(ctx context.Context, token string) (bool, error) {
	if jobs.RedisClient == nil {
		return false, nil // Redis not configured: fallback to DB check by caller if needed
	}
	key := redisBlacklistPrefix + token
	res, err := jobs.RedisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return res == "1", nil
}
