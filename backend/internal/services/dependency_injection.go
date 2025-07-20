package services

import (
	"context"
	"log"
	"sync"

	"github.com/geoo115/charity-management-system/internal/config"
	"github.com/geoo115/charity-management-system/internal/db"
	"gorm.io/gorm"
)

// ServiceContainer manages all application services with proper dependency injection
type ServiceContainer struct {
	mu       sync.RWMutex
	services map[string]interface{}
	config   *config.Config
	db       *gorm.DB
	logger   *log.Logger
}

// ServiceInterface defines the common interface for all services
type ServiceInterface interface {
	Initialize(ctx context.Context) error
	Shutdown(ctx context.Context) error
	HealthCheck(ctx context.Context) error
}

// NewServiceContainer creates a new service container
func NewServiceContainer(cfg *config.Config, database *gorm.DB, logger *log.Logger) *ServiceContainer {
	return &ServiceContainer{
		services: make(map[string]interface{}),
		config:   cfg,
		db:       database,
		logger:   logger,
	}
}

// Register registers a service in the container
func (sc *ServiceContainer) Register(name string, service interface{}) {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	sc.services[name] = service
}

// Get retrieves a service from the container
func (sc *ServiceContainer) Get(name string) (interface{}, bool) {
	sc.mu.RLock()
	defer sc.mu.RUnlock()
	service, exists := sc.services[name]
	return service, exists
}

// GetAnalyticsService returns the analytics service
func (sc *ServiceContainer) GetAnalyticsService() *AnalyticsService {
	if service, exists := sc.Get("analytics"); exists {
		return service.(*AnalyticsService)
	}

	// Lazy initialization
	analyticsService := NewAnalyticsService()
	sc.Register("analytics", analyticsService)
	return analyticsService
}

// GetCacheService returns the cache service
func (sc *ServiceContainer) GetCacheService() *CacheService {
	if service, exists := sc.Get("cache"); exists {
		return service.(*CacheService)
	}

	// Lazy initialization
	cacheService := GetCacheService()
	sc.Register("cache", cacheService)
	return cacheService
}

// GetAuditService returns the audit service
func (sc *ServiceContainer) GetAuditService() *AuditService {
	if service, exists := sc.Get("audit"); exists {
		return service.(*AuditService)
	}

	// Lazy initialization
	auditService := NewAuditService()
	sc.Register("audit", auditService)
	return auditService
}

// GetQueueService returns the queue service
func (sc *ServiceContainer) GetQueueService() *QueueService {
	if service, exists := sc.Get("queue"); exists {
		return service.(*QueueService)
	}

	// Lazy initialization
	queueService := NewQueueService()
	sc.Register("queue", queueService)
	return queueService
}

// InitializeAll initializes all registered services
func (sc *ServiceContainer) InitializeAll(ctx context.Context) error {
	sc.mu.RLock()
	defer sc.mu.RUnlock()

	for name, service := range sc.services {
		if svc, ok := service.(ServiceInterface); ok {
			if err := svc.Initialize(ctx); err != nil {
				sc.logger.Printf("Failed to initialize service %s: %v", name, err)
				return err
			}
		}
	}

	return nil
}

// ShutdownAll shuts down all registered services
func (sc *ServiceContainer) ShutdownAll(ctx context.Context) error {
	sc.mu.RLock()
	defer sc.mu.RUnlock()

	for name, service := range sc.services {
		if svc, ok := service.(ServiceInterface); ok {
			if err := svc.Shutdown(ctx); err != nil {
				sc.logger.Printf("Failed to shutdown service %s: %v", name, err)
			}
		}
	}

	return nil
}

// HealthCheckAll performs health checks on all services
func (sc *ServiceContainer) HealthCheckAll(ctx context.Context) map[string]error {
	sc.mu.RLock()
	defer sc.mu.RUnlock()

	results := make(map[string]error)

	for name, service := range sc.services {
		if svc, ok := service.(ServiceInterface); ok {
			results[name] = svc.HealthCheck(ctx)
		}
	}

	return results
}

// Global service container instance
var globalContainer *ServiceContainer
var containerOnce sync.Once

// InitializeGlobalContainer initializes the global service container
func InitializeGlobalContainer(cfg *config.Config, database *gorm.DB, logger *log.Logger) *ServiceContainer {
	containerOnce.Do(func() {
		globalContainer = NewServiceContainer(cfg, database, logger)
	})
	return globalContainer
}

// GetGlobalContainer returns the global service container
func GetGlobalContainer() *ServiceContainer {
	if globalContainer == nil {
		// Fallback initialization with defaults
		cfg := &config.Config{}
		database := db.GetDB()
		logger := log.New(log.Writer(), "[Services] ", log.LstdFlags|log.Lshortfile)
		globalContainer = NewServiceContainer(cfg, database, logger)
	}
	return globalContainer
}
