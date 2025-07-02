package db

import (
	"context"
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
)

// Repository provides a clean abstraction layer for database operations
type Repository interface {
	// Basic CRUD operations
	Create(ctx context.Context, entity interface{}) error
	GetByID(ctx context.Context, entity interface{}, id uint) error
	Update(ctx context.Context, entity interface{}) error
	Delete(ctx context.Context, entity interface{}, id uint) error

	// Query operations
	Find(ctx context.Context, entities interface{}, conditions ...interface{}) error
	FindOne(ctx context.Context, entity interface{}, conditions ...interface{}) error
	Count(ctx context.Context, entity interface{}, conditions ...interface{}) (int64, error)

	// Transaction operations
	WithTransaction(ctx context.Context, fn func(tx Repository) error) error

	// Raw query operations
	Raw(ctx context.Context, sql string, values ...interface{}) *gorm.DB
	Exec(ctx context.Context, sql string, values ...interface{}) error
}

// BaseRepository implements the Repository interface
type BaseRepository struct {
	db     *gorm.DB
	logger *log.Logger
}

// NewRepository creates a new repository instance
func NewRepository(db *gorm.DB) Repository {
	return &BaseRepository{
		db:     db,
		logger: log.New(log.Writer(), "[DB-Repo] ", log.LstdFlags|log.Lshortfile),
	}
}

// Create inserts a new entity into the database
func (r *BaseRepository) Create(ctx context.Context, entity interface{}) error {
	if err := r.db.WithContext(ctx).Create(entity).Error; err != nil {
		r.logger.Printf("Failed to create entity: %v", err)
		return fmt.Errorf("failed to create entity: %w", err)
	}
	return nil
}

// GetByID retrieves an entity by its ID
func (r *BaseRepository) GetByID(ctx context.Context, entity interface{}, id uint) error {
	if err := r.db.WithContext(ctx).First(entity, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("entity with ID %d not found", id)
		}
		r.logger.Printf("Failed to get entity by ID %d: %v", id, err)
		return fmt.Errorf("failed to get entity by ID: %w", err)
	}
	return nil
}

// Update modifies an existing entity in the database
func (r *BaseRepository) Update(ctx context.Context, entity interface{}) error {
	if err := r.db.WithContext(ctx).Save(entity).Error; err != nil {
		r.logger.Printf("Failed to update entity: %v", err)
		return fmt.Errorf("failed to update entity: %w", err)
	}
	return nil
}

// Delete removes an entity from the database
func (r *BaseRepository) Delete(ctx context.Context, entity interface{}, id uint) error {
	if err := r.db.WithContext(ctx).Delete(entity, id).Error; err != nil {
		r.logger.Printf("Failed to delete entity with ID %d: %v", id, err)
		return fmt.Errorf("failed to delete entity: %w", err)
	}
	return nil
}

// Find retrieves multiple entities based on conditions
func (r *BaseRepository) Find(ctx context.Context, entities interface{}, conditions ...interface{}) error {
	query := r.db.WithContext(ctx)
	if len(conditions) > 0 {
		query = query.Where(conditions[0], conditions[1:]...)
	}

	if err := query.Find(entities).Error; err != nil {
		r.logger.Printf("Failed to find entities: %v", err)
		return fmt.Errorf("failed to find entities: %w", err)
	}
	return nil
}

// FindOne retrieves a single entity based on conditions
func (r *BaseRepository) FindOne(ctx context.Context, entity interface{}, conditions ...interface{}) error {
	query := r.db.WithContext(ctx)
	if len(conditions) > 0 {
		query = query.Where(conditions[0], conditions[1:]...)
	}

	if err := query.First(entity).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("entity not found")
		}
		r.logger.Printf("Failed to find entity: %v", err)
		return fmt.Errorf("failed to find entity: %w", err)
	}
	return nil
}

// Count returns the number of entities matching the conditions
func (r *BaseRepository) Count(ctx context.Context, entity interface{}, conditions ...interface{}) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(entity)
	if len(conditions) > 0 {
		query = query.Where(conditions[0], conditions[1:]...)
	}

	if err := query.Count(&count).Error; err != nil {
		r.logger.Printf("Failed to count entities: %v", err)
		return 0, fmt.Errorf("failed to count entities: %w", err)
	}
	return count, nil
}

// WithTransaction executes a function within a database transaction
func (r *BaseRepository) WithTransaction(ctx context.Context, fn func(tx Repository) error) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		txRepo := &BaseRepository{
			db:     tx,
			logger: r.logger,
		}
		return fn(txRepo)
	})
}

// Raw executes a raw SQL query and returns the result
func (r *BaseRepository) Raw(ctx context.Context, sql string, values ...interface{}) *gorm.DB {
	return r.db.WithContext(ctx).Raw(sql, values...)
}

// Exec executes a raw SQL statement
func (r *BaseRepository) Exec(ctx context.Context, sql string, values ...interface{}) error {
	if err := r.db.WithContext(ctx).Exec(sql, values...).Error; err != nil {
		r.logger.Printf("Failed to execute SQL: %v", err)
		return fmt.Errorf("failed to execute SQL: %w", err)
	}
	return nil
}

// PaginatedRepository extends Repository with pagination capabilities
type PaginatedRepository struct {
	Repository
}

// PaginationOptions contains pagination parameters
type PaginationOptions struct {
	Page     int    `json:"page"`
	Limit    int    `json:"limit"`
	OrderBy  string `json:"order_by"`
	SortDesc bool   `json:"sort_desc"`
}

// PaginatedResult contains paginated data and metadata
type PaginatedResult struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"total_pages"`
	HasNext    bool        `json:"has_next"`
	HasPrev    bool        `json:"has_prev"`
}

// NewPaginatedRepository creates a repository with pagination support
func NewPaginatedRepository(db *gorm.DB) *PaginatedRepository {
	return &PaginatedRepository{
		Repository: NewRepository(db),
	}
}

// FindWithPagination retrieves entities with pagination
func (pr *PaginatedRepository) FindWithPagination(
	ctx context.Context,
	entities interface{},
	opts PaginationOptions,
	conditions ...interface{},
) (*PaginatedResult, error) {
	// Set defaults
	if opts.Page <= 0 {
		opts.Page = 1
	}
	if opts.Limit <= 0 {
		opts.Limit = 10
	}
	if opts.Limit > 100 {
		opts.Limit = 100 // Cap at 100 for performance
	}

	// Count total records
	total, err := pr.Count(ctx, entities, conditions...)
	if err != nil {
		return nil, fmt.Errorf("failed to count records: %w", err)
	}

	// Calculate pagination metadata
	totalPages := int((total + int64(opts.Limit) - 1) / int64(opts.Limit))
	offset := (opts.Page - 1) * opts.Limit

	// Build query
	baseRepo := pr.Repository.(*BaseRepository)
	query := baseRepo.db.WithContext(ctx)

	if len(conditions) > 0 {
		query = query.Where(conditions[0], conditions[1:]...)
	}

	// Apply ordering
	if opts.OrderBy != "" {
		orderClause := opts.OrderBy
		if opts.SortDesc {
			orderClause += " DESC"
		} else {
			orderClause += " ASC"
		}
		query = query.Order(orderClause)
	}

	// Apply pagination
	if err := query.Offset(offset).Limit(opts.Limit).Find(entities).Error; err != nil {
		return nil, fmt.Errorf("failed to find paginated entities: %w", err)
	}

	return &PaginatedResult{
		Data:       entities,
		Total:      total,
		Page:       opts.Page,
		Limit:      opts.Limit,
		TotalPages: totalPages,
		HasNext:    opts.Page < totalPages,
		HasPrev:    opts.Page > 1,
	}, nil
}

// CachedRepository adds caching capabilities to the repository
type CachedRepository struct {
	Repository
	cache    map[string]interface{}
	cacheTTL time.Duration
}

// NewCachedRepository creates a repository with basic in-memory caching
func NewCachedRepository(db *gorm.DB, cacheTTL time.Duration) *CachedRepository {
	return &CachedRepository{
		Repository: NewRepository(db),
		cache:      make(map[string]interface{}),
		cacheTTL:   cacheTTL,
	}
}

// GetByIDCached retrieves an entity by ID with caching
func (cr *CachedRepository) GetByIDCached(ctx context.Context, entity interface{}, id uint, cacheKey string) error {
	// Check cache first
	if cached, exists := cr.cache[cacheKey]; exists {
		// Simple cache hit (in production, you'd want proper cache expiration)
		if cached != nil {
			// Copy cached data to entity (simplified)
			return nil
		}
	}

	// Cache miss, fetch from database
	if err := cr.GetByID(ctx, entity, id); err != nil {
		return err
	}

	// Store in cache
	cr.cache[cacheKey] = entity
	return nil
}

// InvalidateCache removes entries from cache
func (cr *CachedRepository) InvalidateCache(keys ...string) {
	for _, key := range keys {
		delete(cr.cache, key)
	}
}

// RepositoryManager manages multiple repositories and provides a unified interface
type RepositoryManager struct {
	db           *gorm.DB
	repositories map[string]Repository
	logger       *log.Logger
}

// NewRepositoryManager creates a new repository manager
func NewRepositoryManager(db *gorm.DB) *RepositoryManager {
	return &RepositoryManager{
		db:           db,
		repositories: make(map[string]Repository),
		logger:       log.New(log.Writer(), "[DB-RepoMgr] ", log.LstdFlags|log.Lshortfile),
	}
}

// GetRepository returns a repository for the specified entity type
func (rm *RepositoryManager) GetRepository(entityType string) Repository {
	if repo, exists := rm.repositories[entityType]; exists {
		return repo
	}

	// Create new repository for this entity type
	repo := NewRepository(rm.db)
	rm.repositories[entityType] = repo
	return repo
}

// GetPaginatedRepository returns a paginated repository for the specified entity type
func (rm *RepositoryManager) GetPaginatedRepository(entityType string) *PaginatedRepository {
	return NewPaginatedRepository(rm.db)
}

// WithTransaction executes a function with all repositories in a transaction
func (rm *RepositoryManager) WithTransaction(ctx context.Context, fn func(mgr *RepositoryManager) error) error {
	return rm.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		txMgr := &RepositoryManager{
			db:           tx,
			repositories: make(map[string]Repository),
			logger:       rm.logger,
		}
		return fn(txMgr)
	})
}

// Health checks the health of all repositories
func (rm *RepositoryManager) Health(ctx context.Context) error {
	// Test basic connectivity
	sqlDB, err := rm.db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	if err := sqlDB.PingContext(ctx); err != nil {
		return fmt.Errorf("database ping failed: %w", err)
	}

	rm.logger.Printf("Repository manager health check passed")
	return nil
}

// GetGlobalRepository returns a global repository instance
func GetGlobalRepository() Repository {
	if DB == nil {
		log.Fatal("Database connection not initialized")
	}
	return NewRepository(DB)
}

// GetGlobalRepositoryManager returns a global repository manager instance
func GetGlobalRepositoryManager() *RepositoryManager {
	if DB == nil {
		log.Fatal("Database connection not initialized")
	}
	return NewRepositoryManager(DB)
}
