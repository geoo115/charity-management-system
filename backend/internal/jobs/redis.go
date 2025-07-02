package jobs

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
)

// RedisClient is the global Redis client
var RedisClient *redis.Client

// In-memory fallback for when Redis is unavailable
var (
	inMemoryNotifications []map[string]interface{}
	notificationMutex     sync.Mutex
)

// InitializeRedis sets up the Redis connection
func InitializeRedis(addr string, password string, db int) error {
	// If Redis is not configured, use in-memory implementation
	if addr == "" {
		log.Println("Redis not configured, using in-memory notification system")
		inMemoryNotifications = make([]map[string]interface{}, 0)
		return nil
	}

	RedisClient = redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           db,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Test the connection
	_, err := RedisClient.Ping(ctx).Result()
	if err != nil {
		log.Printf("Redis connection failed: %v. Using in-memory fallback.", err)
		RedisClient = nil
		inMemoryNotifications = make([]map[string]interface{}, 0)
		return nil // Not returning error to make Redis truly optional
	}

	log.Println("Redis connection established")
	return nil
}

// EnqueueNotification adds a notification job to the queue
func EnqueueNotification(notificationType string, data map[string]interface{}) error {
	if RedisClient != nil {
		// Use Redis if available
		ctx := context.Background()
		_, err := RedisClient.XAdd(ctx, &redis.XAddArgs{
			Stream: "notifications",
			Values: map[string]interface{}{
				"type": notificationType,
				"data": data,
			},
		}).Result()
		return err
	}

	// Otherwise use in-memory storage
	notificationMutex.Lock()
	defer notificationMutex.Unlock()

	notificationData := map[string]interface{}{
		"type":      notificationType,
		"data":      data,
		"timestamp": time.Now(),
	}
	inMemoryNotifications = append(inMemoryNotifications, notificationData)

	// Process immediately in development mode
	go processInMemoryNotification(notificationData)

	return nil
}

// StartBackgroundWorker starts the notification worker
func StartBackgroundWorker() {
	// Only start Redis worker if Redis is configured
	if RedisClient != nil {
		go startRedisWorker()
	} else {
		log.Println("Redis not available, using immediate in-memory processing")
		// In-memory processing happens directly in EnqueueNotification
	}
}

// startRedisWorker handles notifications from Redis stream
func startRedisWorker() {
	ctx := context.Background()
	log.Println("Starting Redis notification worker")

	for {
		// Read from Redis Stream with blocking call
		streams, err := RedisClient.XRead(ctx, &redis.XReadArgs{
			Streams: []string{"notifications", "0"},
			Count:   1,
			Block:   0,
		}).Result()

		if err != nil {
			log.Printf("Error reading from notification stream: %v", err)
			time.Sleep(5 * time.Second)
			continue
		}

		for _, stream := range streams {
			for _, message := range stream.Messages {
				// Process notification message
				log.Printf("Processing notification: %v", message.Values)
				processNotification(message.Values)

				// Acknowledge message processing
				RedisClient.XDel(ctx, "notifications", message.ID)
			}
		}
	}
}

// processInMemoryNotification handles in-memory notifications
func processInMemoryNotification(data map[string]interface{}) {
	// Process the notification data
	log.Printf("Processing in-memory notification: %v", data)
	processNotification(data)
}

// processNotification handles the actual notification processing
func processNotification(values map[string]interface{}) {
	// Extract notification type
	notificationType, ok := values["type"].(string)
	if !ok {
		log.Printf("Invalid notification type: %v", values["type"])
		return
	}

	// Process based on notification type
	switch notificationType {
	case "sms":
		log.Printf("Processing SMS notification (implementation simplified)")
		// Process SMS notification
	case "email":
		log.Printf("Processing Email notification (implementation simplified)")
		// Process email notification
	default:
		log.Printf("Unknown notification type: %s", notificationType)
	}
}
