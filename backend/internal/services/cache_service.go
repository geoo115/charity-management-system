package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

// CacheService provides Redis-based caching operations for high-performance endpoints
type CacheService struct {
	client *redis.Client
	ctx    context.Context
	stats  *CacheStats
}

// CacheStats tracks cache performance metrics
type CacheStats struct {
	Hits      int64     `json:"hits"`
	Misses    int64     `json:"misses"`
	Sets      int64     `json:"sets"`
	Deletes   int64     `json:"deletes"`
	Errors    int64     `json:"errors"`
	TotalOps  int64     `json:"total_ops"`
	StartTime time.Time `json:"start_time"`
}

// CacheConfig holds Redis configuration
type CacheConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
	PoolSize int
	Timeout  time.Duration
}

var (
	cacheService *CacheService
	ErrCacheMiss = errors.New("cache miss: key not found")
	ErrCacheSet  = errors.New("failed to set cache value")
)

// Cache key prefixes for different data types
const (
	PrefixUser         = "user:"
	PrefixVolunteer    = "volunteer:"
	PrefixDashboard    = "dashboard:"
	PrefixSession      = "session:"
	PrefixQueue        = "queue:"
	PrefixNotification = "notification:"
	PrefixAnalytics    = "analytics:"
	PrefixHealthCheck  = "health:"
	PrefixRateLimit    = "ratelimit:"
)

// NewCacheService creates a new Redis-based cache service
func NewCacheService(config CacheConfig) (*CacheService, error) {
	ctx := context.Background()

	// Create Redis client with comprehensive options
	rdb := redis.NewClient(&redis.Options{
		Addr:         fmt.Sprintf("%s:%s", config.Host, config.Port),
		Password:     config.Password,
		DB:           config.DB,
		PoolSize:     config.PoolSize,
		DialTimeout:  config.Timeout,
		ReadTimeout:  config.Timeout,
		WriteTimeout: config.Timeout,
		PoolTimeout:  config.Timeout * 2,
		IdleTimeout:  time.Minute * 5,
		MaxRetries:   3,
	})

	// Test connection
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Printf("Connected to Redis at %s:%s (DB: %d)", config.Host, config.Port, config.DB)

	service := &CacheService{
		client: rdb,
		ctx:    ctx,
		stats: &CacheStats{
			StartTime: time.Now(),
		},
	}

	// Start background cleanup and monitoring
	go service.startMaintenance()

	return service, nil
}

// GetCacheService returns a singleton cache service instance
func GetCacheService() *CacheService {
	if cacheService == nil {
		// Initialize with default config if not already done
		config := CacheConfig{
			Host:     getEnvOrDefault("REDIS_HOST", "localhost"),
			Port:     getEnvOrDefault("REDIS_PORT", "6379"),
			Password: getEnvOrDefault("REDIS_PASSWORD", ""),
			DB:       0,
			PoolSize: 10,
			Timeout:  time.Second * 5,
		}

		var err error
		cacheService, err = NewCacheService(config)
		if err != nil {
			log.Printf("Failed to initialize cache service: %v", err)
			// Return a mock service that fails gracefully
			return &CacheService{stats: &CacheStats{StartTime: time.Now()}}
		}
	}
	return cacheService
}

// GetCacheServiceFromContext retrieves the cache service from Gin context
func GetCacheServiceFromContext(c *gin.Context) *CacheService {
	if cache, exists := c.Get("cacheService"); exists {
		return cache.(*CacheService)
	}
	return GetCacheService()
}

// Get retrieves a value from cache by key and deserializes into dest
func (cs *CacheService) Get(key string, dest interface{}) error {
	if cs.client == nil {
		cs.incrementStat("misses")
		return ErrCacheMiss
	}

	cs.incrementStat("total_ops")

	val, err := cs.client.Get(cs.ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			cs.incrementStat("misses")
			return ErrCacheMiss
		}
		cs.incrementStat("errors")
		return fmt.Errorf("cache get error for key %s: %w", key, err)
	}

	// Deserialize JSON
	if err := json.Unmarshal([]byte(val), dest); err != nil {
		cs.incrementStat("errors")
		return fmt.Errorf("cache deserialization error for key %s: %w", key, err)
	}

	cs.incrementStat("hits")
	return nil
}

// Set stores a value in cache with expiration
func (cs *CacheService) Set(key string, value interface{}, expiration time.Duration) error {
	if cs.client == nil {
		return ErrCacheSet
	}

	cs.incrementStat("total_ops")

	// Serialize to JSON
	data, err := json.Marshal(value)
	if err != nil {
		cs.incrementStat("errors")
		return fmt.Errorf("cache serialization error for key %s: %w", key, err)
	}

	// Set with expiration
	if err := cs.client.Set(cs.ctx, key, data, expiration).Err(); err != nil {
		cs.incrementStat("errors")
		return fmt.Errorf("cache set error for key %s: %w", key, err)
	}

	cs.incrementStat("sets")
	return nil
}

// GetVolunteerFromCache retrieves a volunteer profile from cache
func (cs *CacheService) GetVolunteerFromCache(volunteerID uint) (interface{}, error) {
	key := fmt.Sprintf("%s%d", PrefixVolunteer, volunteerID)
	var volunteer interface{}

	if err := cs.Get(key, &volunteer); err != nil {
		return nil, err
	}

	return volunteer, nil
}

// CacheVolunteer caches a volunteer profile with 1 hour expiration
func (cs *CacheService) CacheVolunteer(volunteerID uint, profile interface{}) error {
	key := fmt.Sprintf("%s%d", PrefixVolunteer, volunteerID)
	return cs.Set(key, profile, time.Hour)
}

// GetDashboardMetricsFromCache retrieves dashboard metrics from cache
func (cs *CacheService) GetDashboardMetricsFromCache(volunteerID uint, timeRange string, dest interface{}) error {
	key := fmt.Sprintf("%s%d:%s", PrefixDashboard, volunteerID, timeRange)
	return cs.Get(key, dest)
}

// CacheDashboardMetrics caches dashboard metrics with 15 minute expiration
func (cs *CacheService) CacheDashboardMetrics(volunteerID uint, timeRange string, metrics interface{}) error {
	key := fmt.Sprintf("%s%d:%s", PrefixDashboard, volunteerID, timeRange)
	return cs.Set(key, metrics, time.Minute*15)
}

// GetMultiple retrieves multiple keys at once
func (cs *CacheService) GetMultiple(keys []string) (map[string]interface{}, error) {
	if cs.client == nil {
		return nil, ErrCacheMiss
	}

	cs.incrementStat("total_ops")

	results := make(map[string]interface{})
	pipe := cs.client.Pipeline()

	// Queue all get operations
	cmds := make(map[string]*redis.StringCmd)
	for _, key := range keys {
		cmds[key] = pipe.Get(cs.ctx, key)
	}

	// Execute pipeline
	_, err := pipe.Exec(cs.ctx)
	if err != nil && err != redis.Nil {
		cs.incrementStat("errors")
		return nil, fmt.Errorf("pipeline execution failed: %w", err)
	}

	// Process results
	for key, cmd := range cmds {
		val, err := cmd.Result()
		if err == nil {
			var result interface{}
			if json.Unmarshal([]byte(val), &result) == nil {
				results[key] = result
				cs.incrementStat("hits")
			}
		} else {
			cs.incrementStat("misses")
		}
	}

	return results, nil
}

// SetMultiple sets multiple key-value pairs with the same expiration
func (cs *CacheService) SetMultiple(data map[string]interface{}, expiration time.Duration) error {
	if cs.client == nil {
		return ErrCacheSet
	}

	cs.incrementStat("total_ops")

	pipe := cs.client.Pipeline()

	for key, value := range data {
		jsonData, err := json.Marshal(value)
		if err != nil {
			cs.incrementStat("errors")
			continue
		}
		pipe.Set(cs.ctx, key, jsonData, expiration)
	}

	_, err := pipe.Exec(cs.ctx)
	if err != nil {
		cs.incrementStat("errors")
		return fmt.Errorf("pipeline set failed: %w", err)
	}

	cs.incrementStat("sets")
	return nil
}

// DeletePattern deletes cache entries matching a pattern
func (cs *CacheService) DeletePattern(pattern string) error {
	if cs.client == nil {
		return nil
	}

	cs.incrementStat("total_ops")

	// Use SCAN to find matching keys (more efficient than KEYS)
	iter := cs.client.Scan(cs.ctx, 0, pattern, 0).Iterator()
	var keys []string

	for iter.Next(cs.ctx) {
		keys = append(keys, iter.Val())
	}

	if err := iter.Err(); err != nil {
		cs.incrementStat("errors")
		return fmt.Errorf("scan error for pattern %s: %w", pattern, err)
	}

	if len(keys) > 0 {
		if err := cs.client.Del(cs.ctx, keys...).Err(); err != nil {
			cs.incrementStat("errors")
			return fmt.Errorf("delete error for pattern %s: %w", pattern, err)
		}
		cs.incrementStat("deletes")
	}

	return nil
}

// InvalidateUserCache invalidates all cache entries for a specific user
func (cs *CacheService) InvalidateUserCache(userID uint) error {
	patterns := []string{
		fmt.Sprintf("%s%d*", PrefixUser, userID),
		fmt.Sprintf("%s%d*", PrefixVolunteer, userID),
		fmt.Sprintf("%s%d*", PrefixDashboard, userID),
		fmt.Sprintf("%s%d*", PrefixSession, userID),
	}

	for _, pattern := range patterns {
		if err := cs.DeletePattern(pattern); err != nil {
			log.Printf("Failed to invalidate cache pattern %s: %v", pattern, err)
		}
	}

	return nil
}

// Exists checks if a key exists in cache
func (cs *CacheService) Exists(key string) bool {
	if cs.client == nil {
		return false
	}

	result, err := cs.client.Exists(cs.ctx, key).Result()
	return err == nil && result > 0
}

// TTL returns the time-to-live for a key
func (cs *CacheService) TTL(key string) (time.Duration, error) {
	if cs.client == nil {
		return 0, ErrCacheMiss
	}

	return cs.client.TTL(cs.ctx, key).Result()
}

// Extend extends the expiration time for a key
func (cs *CacheService) Extend(key string, expiration time.Duration) error {
	if cs.client == nil {
		return ErrCacheSet
	}

	return cs.client.Expire(cs.ctx, key, expiration).Err()
}

// GetStats returns comprehensive cache statistics
func (cs *CacheService) GetStats() interface{} {
	if cs.stats == nil {
		return map[string]interface{}{"status": "not_initialized"}
	}

	uptime := time.Since(cs.stats.StartTime)
	hitRate := float64(0)
	if cs.stats.Hits+cs.stats.Misses > 0 {
		hitRate = float64(cs.stats.Hits) / float64(cs.stats.Hits+cs.stats.Misses) * 100
	}

	stats := map[string]interface{}{
		"hits":       cs.stats.Hits,
		"misses":     cs.stats.Misses,
		"sets":       cs.stats.Sets,
		"deletes":    cs.stats.Deletes,
		"errors":     cs.stats.Errors,
		"total_ops":  cs.stats.TotalOps,
		"hit_rate":   fmt.Sprintf("%.2f%%", hitRate),
		"uptime":     uptime.String(),
		"start_time": cs.stats.StartTime,
	}

	// Add Redis info if available
	if cs.client != nil {
		if info, err := cs.client.Info(cs.ctx, "memory").Result(); err == nil {
			stats["redis_memory"] = cs.parseRedisInfo(info)
		}
		if poolStats := cs.client.PoolStats(); poolStats != nil {
			stats["pool_stats"] = map[string]interface{}{
				"hits":        poolStats.Hits,
				"misses":      poolStats.Misses,
				"timeouts":    poolStats.Timeouts,
				"total_conns": poolStats.TotalConns,
				"idle_conns":  poolStats.IdleConns,
				"stale_conns": poolStats.StaleConns,
			}
		}
	}

	return stats
}

// HealthCheck returns comprehensive cache health status
func (cs *CacheService) HealthCheck() interface{} {
	health := map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now(),
	}

	if cs.client == nil {
		health["status"] = "unhealthy"
		health["error"] = "Redis client not initialized"
		return health
	}

	// Test connection with timeout
	ctx, cancel := context.WithTimeout(cs.ctx, time.Second*2)
	defer cancel()

	start := time.Now()
	if err := cs.client.Ping(ctx).Err(); err != nil {
		health["status"] = "unhealthy"
		health["error"] = err.Error()
	} else {
		health["response_time"] = time.Since(start).String()
	}

	return health
}

// incrementStat safely increments a statistic counter
func (cs *CacheService) incrementStat(stat string) {
	if cs.stats == nil {
		return
	}

	switch stat {
	case "hits":
		cs.stats.Hits++
	case "misses":
		cs.stats.Misses++
	case "sets":
		cs.stats.Sets++
	case "deletes":
		cs.stats.Deletes++
	case "errors":
		cs.stats.Errors++
	case "total_ops":
		cs.stats.TotalOps++
	}
}

// parseRedisInfo parses Redis INFO output for memory statistics
func (cs *CacheService) parseRedisInfo(info string) map[string]string {
	result := make(map[string]string)
	lines := strings.Split(info, "\r\n")

	for _, line := range lines {
		if strings.Contains(line, ":") && !strings.HasPrefix(line, "#") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				result[parts[0]] = parts[1]
			}
		}
	}

	return result
}

// startMaintenance runs background tasks for cache maintenance
func (cs *CacheService) startMaintenance() {
	ticker := time.NewTicker(time.Minute * 10)
	defer ticker.Stop()

	for range ticker.C {
		// Cleanup expired keys (Redis handles this automatically, but we can optimize)
		// Log statistics periodically
		if cs.stats.TotalOps > 0 && cs.stats.TotalOps%1000 == 0 {
			log.Printf("Cache Stats: %+v", cs.GetStats())
		}
	}
}

// Close gracefully closes the Redis connection
func (cs *CacheService) Close() error {
	if cs.client != nil {
		return cs.client.Close()
	}
	return nil
}

// Utility function to get environment variable with default
func getEnvOrDefault(key, defaultValue string) string {
	if value := getEnv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnv gets environment variable value
func getEnv(key string) string {
	return os.Getenv(key)
}
