package db

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"gorm.io/gorm"
)

// HealthStatus represents the overall health status
type HealthStatus string

const (
	HealthStatusHealthy   HealthStatus = "healthy"
	HealthStatusDegraded  HealthStatus = "degraded"
	HealthStatusUnhealthy HealthStatus = "unhealthy"
)

// HealthMetrics represents comprehensive database health statistics
type HealthMetrics struct {
	Status             HealthStatus  `json:"status"`
	IsConnected        bool          `json:"is_connected"`
	ResponseTime       time.Duration `json:"response_time_ms"`
	OpenConnections    int           `json:"open_connections"`
	MaxConnections     int           `json:"max_connections"`
	IdleConnections    int           `json:"idle_connections"`
	InUseConnections   int           `json:"in_use_connections"`
	WaitingConnections int64         `json:"waiting_connections"`
	TotalQueries       int64         `json:"total_queries"`
	SlowQueries        int64         `json:"slow_queries"`
	LastHealthCheck    time.Time     `json:"last_health_check"`
	DatabaseSize       string        `json:"database_size"`
	TableCount         int           `json:"table_count"`
	IndexEfficiency    float64       `json:"index_efficiency"`
	LockWaitTime       time.Duration `json:"lock_wait_time"`
	CacheHitRatio      float64       `json:"cache_hit_ratio"`
	ActiveTransactions int           `json:"active_transactions"`
	LongestTransaction time.Duration `json:"longest_transaction"`
	ErrorCount         int64         `json:"error_count"`
	Warnings           []string      `json:"warnings,omitempty"`
}

// HealthChecker manages database health monitoring
type HealthChecker struct {
	db                *gorm.DB
	logger            *log.Logger
	metrics           *HealthMetrics
	mutex             sync.RWMutex
	checkInterval     time.Duration
	timeout           time.Duration
	thresholds        HealthThresholds
	lastCheckTime     time.Time
	consecutiveErrors int
}

// HealthThresholds defines warning and critical thresholds
type HealthThresholds struct {
	SlowResponseTime     time.Duration
	CriticalResponseTime time.Duration
	MaxConnectionUsage   float64 // Percentage
	MinIndexEfficiency   float64
	MinCacheHitRatio     float64
	MaxLockWaitTime      time.Duration
	MaxTransactionTime   time.Duration
}

// NewHealthChecker creates a new health checker with default settings
func NewHealthChecker(db *gorm.DB) *HealthChecker {
	return &HealthChecker{
		db:            db,
		logger:        log.New(log.Writer(), "[DB-Health] ", log.LstdFlags|log.Lshortfile),
		checkInterval: 5 * time.Minute,
		timeout:       30 * time.Second,
		thresholds: HealthThresholds{
			SlowResponseTime:     500 * time.Millisecond,
			CriticalResponseTime: 2 * time.Second,
			MaxConnectionUsage:   0.8, // 80%
			MinIndexEfficiency:   70.0,
			MinCacheHitRatio:     0.95, // 95%
			MaxLockWaitTime:      100 * time.Millisecond,
			MaxTransactionTime:   30 * time.Second,
		},
	}
}

// CheckHealth performs comprehensive database health check
func (hc *HealthChecker) CheckHealth() (*HealthMetrics, error) {
	hc.mutex.Lock()
	defer hc.mutex.Unlock()

	start := time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), hc.timeout)
	defer cancel()

	metrics := &HealthMetrics{
		LastHealthCheck: start,
		Warnings:        make([]string, 0),
	}

	// Test basic connectivity
	if err := hc.checkConnectivity(ctx, metrics); err != nil {
		hc.consecutiveErrors++
		metrics.Status = HealthStatusUnhealthy
		return metrics, fmt.Errorf("connectivity check failed: %w", err)
	}

	metrics.ResponseTime = time.Since(start)
	metrics.IsConnected = true

	// Collect detailed metrics
	if err := hc.collectConnectionMetrics(metrics); err != nil {
		hc.logger.Printf("Warning: Failed to collect connection metrics: %v", err)
		metrics.Warnings = append(metrics.Warnings, "Connection metrics unavailable")
	}

	if err := hc.collectDatabaseMetrics(ctx, metrics); err != nil {
		hc.logger.Printf("Warning: Failed to collect database metrics: %v", err)
		metrics.Warnings = append(metrics.Warnings, "Database metrics unavailable")
	}

	if err := hc.collectPerformanceMetrics(ctx, metrics); err != nil {
		hc.logger.Printf("Warning: Failed to collect performance metrics: %v", err)
		metrics.Warnings = append(metrics.Warnings, "Performance metrics unavailable")
	}

	// Determine overall health status
	hc.determineHealthStatus(metrics)

	// Reset consecutive errors on successful check
	hc.consecutiveErrors = 0
	hc.lastCheckTime = time.Now()
	hc.metrics = metrics

	return metrics, nil
}

// checkConnectivity tests basic database connectivity
func (hc *HealthChecker) checkConnectivity(ctx context.Context, metrics *HealthMetrics) error {
	sqlDB, err := hc.db.DB()
	if err != nil {
		metrics.IsConnected = false
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// Test ping with timeout
	if err := sqlDB.PingContext(ctx); err != nil {
		metrics.IsConnected = false
		return fmt.Errorf("database ping failed: %w", err)
	}

	return nil
}

// collectConnectionMetrics gathers connection pool statistics
func (hc *HealthChecker) collectConnectionMetrics(metrics *HealthMetrics) error {
	sqlDB, err := hc.db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	stats := sqlDB.Stats()
	metrics.OpenConnections = stats.OpenConnections
	metrics.MaxConnections = stats.MaxOpenConnections
	metrics.IdleConnections = stats.Idle
	metrics.InUseConnections = stats.InUse
	metrics.WaitingConnections = stats.WaitCount

	// Check connection usage
	if metrics.MaxConnections > 0 {
		usage := float64(metrics.OpenConnections) / float64(metrics.MaxConnections)
		if usage > hc.thresholds.MaxConnectionUsage {
			metrics.Warnings = append(metrics.Warnings,
				fmt.Sprintf("High connection usage: %.1f%%", usage*100))
		}
	}

	return nil
}

// collectDatabaseMetrics gathers database-specific metrics
func (hc *HealthChecker) collectDatabaseMetrics(ctx context.Context, metrics *HealthMetrics) error {
	// Get database size
	var dbSize string
	err := hc.db.WithContext(ctx).Raw(`
		SELECT pg_size_pretty(pg_database_size(current_database()))
	`).Scan(&dbSize).Error
	if err != nil {
		hc.logger.Printf("Warning: Failed to get database size: %v", err)
		dbSize = "unknown"
	}
	metrics.DatabaseSize = dbSize

	// Get table count
	var tableCount int
	err = hc.db.WithContext(ctx).Raw(`
		SELECT COUNT(*) 
		FROM information_schema.tables 
		WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
	`).Scan(&tableCount).Error
	if err != nil {
		hc.logger.Printf("Warning: Failed to get table count: %v", err)
	}
	metrics.TableCount = tableCount

	// Get active transactions
	var activeTransactions int
	err = hc.db.WithContext(ctx).Raw(`
		SELECT COUNT(*) 
		FROM pg_stat_activity 
		WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%'
	`).Scan(&activeTransactions).Error
	if err != nil {
		hc.logger.Printf("Warning: Failed to get active transactions: %v", err)
	}
	metrics.ActiveTransactions = activeTransactions

	return nil
}

// collectPerformanceMetrics gathers performance-related metrics
func (hc *HealthChecker) collectPerformanceMetrics(ctx context.Context, metrics *HealthMetrics) error {
	// Get index efficiency
	var indexEfficiency float64
	err := hc.db.WithContext(ctx).Raw(`
		SELECT COALESCE(ROUND(
			(SUM(idx_scan) * 100.0 / GREATEST(SUM(seq_scan + idx_scan), 1)), 2
		), 0) as index_efficiency
		FROM pg_stat_user_tables 
		WHERE schemaname = 'public'
	`).Scan(&indexEfficiency).Error
	if err != nil {
		hc.logger.Printf("Warning: Failed to calculate index efficiency: %v", err)
		indexEfficiency = 0
	}
	metrics.IndexEfficiency = indexEfficiency

	if indexEfficiency < hc.thresholds.MinIndexEfficiency {
		metrics.Warnings = append(metrics.Warnings,
			fmt.Sprintf("Low index efficiency: %.1f%%", indexEfficiency))
	}

	// Get cache hit ratio
	var cacheHitRatio float64
	err = hc.db.WithContext(ctx).Raw(`
		SELECT COALESCE(
			sum(heap_blks_hit) / GREATEST(sum(heap_blks_hit) + sum(heap_blks_read), 1), 0
		) as cache_hit_ratio
		FROM pg_statio_user_tables
	`).Scan(&cacheHitRatio).Error
	if err != nil {
		hc.logger.Printf("Warning: Failed to calculate cache hit ratio: %v", err)
		cacheHitRatio = 0
	}
	metrics.CacheHitRatio = cacheHitRatio

	if cacheHitRatio < hc.thresholds.MinCacheHitRatio {
		metrics.Warnings = append(metrics.Warnings,
			fmt.Sprintf("Low cache hit ratio: %.1f%%", cacheHitRatio*100))
	}

	// Get longest running transaction
	var longestTxnSeconds float64
	err = hc.db.WithContext(ctx).Raw(`
		SELECT COALESCE(
			EXTRACT(EPOCH FROM MAX(now() - xact_start)), 0
		) as longest_transaction
		FROM pg_stat_activity 
		WHERE state = 'active' AND xact_start IS NOT NULL
	`).Scan(&longestTxnSeconds).Error
	if err != nil {
		hc.logger.Printf("Warning: Failed to get longest transaction: %v", err)
		longestTxnSeconds = 0
	}
	metrics.LongestTransaction = time.Duration(longestTxnSeconds * float64(time.Second))

	if metrics.LongestTransaction > hc.thresholds.MaxTransactionTime {
		metrics.Warnings = append(metrics.Warnings,
			fmt.Sprintf("Long running transaction: %v", metrics.LongestTransaction))
	}

	return nil
}

// determineHealthStatus evaluates overall health based on metrics
func (hc *HealthChecker) determineHealthStatus(metrics *HealthMetrics) {
	if !metrics.IsConnected {
		metrics.Status = HealthStatusUnhealthy
		return
	}

	// Count critical issues
	criticalIssues := 0
	warningIssues := len(metrics.Warnings)

	if metrics.ResponseTime > hc.thresholds.CriticalResponseTime {
		criticalIssues++
		metrics.Warnings = append(metrics.Warnings,
			fmt.Sprintf("Critical response time: %v", metrics.ResponseTime))
	} else if metrics.ResponseTime > hc.thresholds.SlowResponseTime {
		warningIssues++
		if len(metrics.Warnings) == 0 || metrics.Warnings[len(metrics.Warnings)-1] !=
			fmt.Sprintf("Slow response time: %v", metrics.ResponseTime) {
			metrics.Warnings = append(metrics.Warnings,
				fmt.Sprintf("Slow response time: %v", metrics.ResponseTime))
		}
	}

	if hc.consecutiveErrors > 3 {
		criticalIssues++
	}

	// Determine status
	if criticalIssues > 0 {
		metrics.Status = HealthStatusUnhealthy
	} else if warningIssues > 2 {
		metrics.Status = HealthStatusDegraded
	} else {
		metrics.Status = HealthStatusHealthy
	}
}

// GetLastMetrics returns the last collected health metrics
func (hc *HealthChecker) GetLastMetrics() *HealthMetrics {
	hc.mutex.RLock()
	defer hc.mutex.RUnlock()
	return hc.metrics
}

// StartMonitoring begins continuous health monitoring
func (hc *HealthChecker) StartMonitoring() {
	ticker := time.NewTicker(hc.checkInterval)
	defer ticker.Stop()

	hc.logger.Println("Starting database health monitoring")

	for range ticker.C {
		metrics, err := hc.CheckHealth()
		if err != nil {
			hc.logger.Printf("Health check failed: %v", err)
			continue
		}

		// Log based on health status
		switch metrics.Status {
		case HealthStatusUnhealthy:
			hc.logger.Printf("DATABASE UNHEALTHY: %d warnings, response: %v",
				len(metrics.Warnings), metrics.ResponseTime)
			for _, warning := range metrics.Warnings {
				hc.logger.Printf("  - %s", warning)
			}
		case HealthStatusDegraded:
			hc.logger.Printf("DATABASE DEGRADED: %d warnings, response: %v",
				len(metrics.Warnings), metrics.ResponseTime)
		case HealthStatusHealthy:
			// Log detailed metrics every 15 minutes
			if time.Now().Minute()%15 == 0 {
				hc.logger.Printf("DB Healthy: Response=%v, Conns=%d/%d, Index=%.1f%%, Cache=%.1f%%",
					metrics.ResponseTime, metrics.OpenConnections, metrics.MaxConnections,
					metrics.IndexEfficiency, metrics.CacheHitRatio*100)
			}
		}
	}
}

// Legacy function for backward compatibility
func CheckHealth(db *gorm.DB) (*HealthMetrics, error) {
	checker := NewHealthChecker(db)
	return checker.CheckHealth()
}

// MonitorPerformance provides detailed performance analysis
func MonitorPerformance(db *gorm.DB) {
	checker := NewHealthChecker(db)
	checker.logger.Println("=== Database Performance Analysis ===")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Check for slow queries
	slowQueries := checker.getSlowQueries(ctx)
	if len(slowQueries) > 0 {
		checker.logger.Printf("Found %d slow queries:", len(slowQueries))
		for _, sq := range slowQueries {
			checker.logger.Printf("  - %.2fms (%d calls): %s",
				sq.Duration, sq.Calls, truncateQuery(sq.Query, 100))
		}
	}

	// Check table sizes
	tableSizes := checker.getTableSizes(ctx)
	if len(tableSizes) > 0 {
		checker.logger.Println("Largest tables:")
		for _, ts := range tableSizes {
			checker.logger.Printf("  - %s: %s (%d operations)",
				ts.TableName, ts.Size, ts.RowCount)
		}
	}

	// Check unused indexes
	unusedIndexes := checker.getUnusedIndexes(ctx)
	if len(unusedIndexes) > 0 {
		checker.logger.Printf("Found %d unused indexes:", len(unusedIndexes))
		for _, ui := range unusedIndexes {
			checker.logger.Printf("  - %s.%s (%s)",
				ui.TableName, ui.IndexName, ui.Size)
		}
	}

	checker.logger.Println("=== End Performance Analysis ===")
}

// Helper types for performance monitoring
type SlowQuery struct {
	Query    string  `json:"query"`
	Duration float64 `json:"duration_ms"`
	Calls    int64   `json:"calls"`
}

type TableSize struct {
	TableName string `json:"table_name"`
	Size      string `json:"size"`
	RowCount  int64  `json:"row_count"`
}

type UnusedIndex struct {
	IndexName string `json:"index_name"`
	TableName string `json:"table_name"`
	Size      string `json:"size"`
}

// getSlowQueries retrieves slow query information
func (hc *HealthChecker) getSlowQueries(ctx context.Context) []SlowQuery {
	var slowQueries []SlowQuery
	err := hc.db.WithContext(ctx).Raw(`
		SELECT 
			query,
			mean_exec_time as duration,
			calls
		FROM pg_stat_statements 
		WHERE mean_exec_time > 1000 
		ORDER BY mean_exec_time DESC 
		LIMIT 10
	`).Scan(&slowQueries).Error

	if err != nil {
		hc.logger.Printf("Note: pg_stat_statements not available: %v", err)
		return nil
	}

	return slowQueries
}

// getTableSizes retrieves table size information
func (hc *HealthChecker) getTableSizes(ctx context.Context) []TableSize {
	var tableSizes []TableSize
	err := hc.db.WithContext(ctx).Raw(`
		SELECT 
			t.table_name,
			pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name))) as size,
			COALESCE(s.n_tup_ins + s.n_tup_upd + s.n_tup_del, 0) as row_count
		FROM information_schema.tables t
		LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
		WHERE t.table_schema = 'public' 
		AND t.table_type = 'BASE TABLE'
		ORDER BY pg_total_relation_size(quote_ident(t.table_name)) DESC
		LIMIT 10
	`).Scan(&tableSizes).Error

	if err != nil {
		hc.logger.Printf("Warning: Failed to get table sizes: %v", err)
		return nil
	}

	return tableSizes
}

// getUnusedIndexes retrieves unused index information
func (hc *HealthChecker) getUnusedIndexes(ctx context.Context) []UnusedIndex {
	var unusedIndexes []UnusedIndex
	err := hc.db.WithContext(ctx).Raw(`
		SELECT 
			indexrelname as index_name,
			relname as table_name,
			pg_size_pretty(pg_relation_size(indexrelid)) as size
		FROM pg_stat_user_indexes 
		WHERE idx_scan = 0 
		AND schemaname = 'public'
		AND indexrelname NOT LIKE '%_pkey'
		ORDER BY pg_relation_size(indexrelid) DESC
		LIMIT 10
	`).Scan(&unusedIndexes).Error

	if err != nil {
		hc.logger.Printf("Warning: Failed to check unused indexes: %v", err)
		return nil
	}

	return unusedIndexes
}

// truncateQuery truncates a query string to the specified length
func truncateQuery(query string, maxLen int) string {
	if len(query) <= maxLen {
		return query
	}
	return query[:maxLen] + "..."
}

// OptimizeDatabase performs routine database optimization tasks
func OptimizeDatabase(db *gorm.DB) error {
	logger := log.New(log.Writer(), "[DB-Optimize] ", log.LstdFlags)
	logger.Println("Starting database optimization...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	// Update table statistics
	logger.Println("Updating table statistics...")
	if err := db.WithContext(ctx).Exec("ANALYZE").Error; err != nil {
		logger.Printf("Warning: Failed to analyze tables: %v", err)
	}

	// Vacuum tables (light vacuum, not full)
	logger.Println("Performing light vacuum...")
	if err := db.WithContext(ctx).Exec("VACUUM").Error; err != nil {
		logger.Printf("Warning: Failed to vacuum: %v", err)
	}

	logger.Println("Database optimization completed")
	return nil
}

// CleanupOldData removes old unnecessary data to maintain performance
func CleanupOldData(db *gorm.DB) error {
	logger := log.New(log.Writer(), "[DB-Cleanup] ", log.LstdFlags)
	logger.Println("Starting cleanup of old data...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	cutoffDate := time.Now().AddDate(0, -6, 0) // 6 months ago

	// Clean old audit logs (keep last 6 months)
	result := db.WithContext(ctx).Exec("DELETE FROM audit_logs WHERE created_at < ?", cutoffDate)
	if result.Error != nil {
		logger.Printf("Warning: Failed to clean old audit logs: %v", result.Error)
	} else {
		logger.Printf("Cleaned %d old audit log entries", result.RowsAffected)
	}

	// Clean old notification logs (keep last 3 months)
	notificationCutoff := time.Now().AddDate(0, -3, 0)
	result = db.WithContext(ctx).Exec("DELETE FROM notification_logs WHERE created_at < ?", notificationCutoff)
	if result.Error != nil {
		logger.Printf("Warning: Failed to clean old notification logs: %v", result.Error)
	} else {
		logger.Printf("Cleaned %d old notification log entries", result.RowsAffected)
	}

	// Clean old password reset tokens (keep last 1 day)
	passwordResetCutoff := time.Now().AddDate(0, 0, -1)
	result = db.WithContext(ctx).Exec("DELETE FROM password_resets WHERE created_at < ?", passwordResetCutoff)
	if result.Error != nil {
		logger.Printf("Warning: Failed to clean old password reset tokens: %v", result.Error)
	} else {
		logger.Printf("Cleaned %d old password reset tokens", result.RowsAffected)
	}

	// Clean expired refresh tokens
	result = db.WithContext(ctx).Exec("DELETE FROM refresh_tokens WHERE expires_at < ?", time.Now())
	if result.Error != nil {
		logger.Printf("Warning: Failed to clean expired refresh tokens: %v", result.Error)
	} else {
		logger.Printf("Cleaned %d expired refresh tokens", result.RowsAffected)
	}

	logger.Println("Data cleanup completed")
	return nil
}
