package cache

import (
	"sync"
	"time"
)

// Simple in-memory cache for performance optimization
type PerformanceCache struct {
	cache map[string]cacheItem
	mutex sync.RWMutex
}

type cacheItem struct {
	data   interface{}
	expiry time.Time
}

var (
	instance *PerformanceCache
	once     sync.Once
)

// GetInstance returns a singleton cache instance
func GetInstance() *PerformanceCache {
	once.Do(func() {
		instance = &PerformanceCache{
			cache: make(map[string]cacheItem),
		}
		// Start cleanup goroutine
		go instance.cleanup()
	})
	return instance
}

// Set stores a value in the cache with TTL
func (pc *PerformanceCache) Set(key string, value interface{}, ttl time.Duration) {
	pc.mutex.Lock()
	defer pc.mutex.Unlock()

	pc.cache[key] = cacheItem{
		data:   value,
		expiry: time.Now().Add(ttl),
	}
}

// Get retrieves a value from the cache
func (pc *PerformanceCache) Get(key string) (interface{}, bool) {
	pc.mutex.RLock()
	defer pc.mutex.RUnlock()

	item, exists := pc.cache[key]
	if !exists {
		return nil, false
	}

	if time.Now().After(item.expiry) {
		// Item expired
		delete(pc.cache, key)
		return nil, false
	}

	return item.data, true
}

// Delete removes a value from the cache
func (pc *PerformanceCache) Delete(key string) {
	pc.mutex.Lock()
	defer pc.mutex.Unlock()
	delete(pc.cache, key)
}

// cleanup removes expired items every minute
func (pc *PerformanceCache) cleanup() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			pc.mutex.Lock()
			now := time.Now()
			for key, item := range pc.cache {
				if now.After(item.expiry) {
					delete(pc.cache, key)
				}
			}
			pc.mutex.Unlock()
		}
	}
}

// Clear removes all items from the cache
func (pc *PerformanceCache) Clear() {
	pc.mutex.Lock()
	defer pc.mutex.Unlock()
	pc.cache = make(map[string]cacheItem)
}
