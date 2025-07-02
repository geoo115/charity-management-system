package services

import (
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"
	"gorm.io/gorm"
)

// QueueService handles visitor queue management
type QueueService struct {
	db                          *gorm.DB
	realtimeNotificationService *RealtimeNotificationService
}

// QueueEntry represents a visitor in the queue
type QueueEntry struct {
	ID            uint       `json:"id"`
	VisitorID     uint       `json:"visitor_id"`
	Position      int        `json:"position"`
	EstimatedWait string     `json:"estimated_wait"`
	Status        string     `json:"status"`       // "waiting", "called", "being_served", "completed", "cancelled"
	Priority      string     `json:"priority"`     // "normal", "urgent", "elderly", "disability"
	ServiceType   string     `json:"service_type"` // "food", "clothing", "advice", "general"
	JoinedAt      time.Time  `json:"joined_at"`
	CalledAt      *time.Time `json:"called_at,omitempty"`
	ServedAt      *time.Time `json:"served_at,omitempty"`
	CompletedAt   *time.Time `json:"completed_at,omitempty"`
	Notes         string     `json:"notes,omitempty"`

	// Visitor details for display
	Visitor *models.User `json:"visitor,omitempty"`
}

// QueueStats represents queue statistics
type QueueStats struct {
	TotalWaiting     int64          `json:"total_waiting"`
	TotalBeingServed int64          `json:"total_being_served"`
	AverageWaitTime  time.Duration  `json:"average_wait_time"`
	LongestWait      time.Duration  `json:"longest_wait"`
	CompletedToday   int64          `json:"completed_today"`
	ByServiceType    map[string]int `json:"by_service_type"`
	ByPriority       map[string]int `json:"by_priority"`
}

// NewQueueService creates a new queue service
func NewQueueService() *QueueService {
	return &QueueService{
		db:                          db.DB,
		realtimeNotificationService: GetGlobalRealtimeNotificationService(),
	}
}

// AddToQueue adds a visitor to the queue
func (qs *QueueService) AddToQueue(visitorID uint, serviceType, priority string, notes string) (*QueueEntry, error) {
	// Check if visitor is already in queue
	var existingEntry models.QueueEntry
	if err := qs.db.Where("visitor_id = ? AND status IN ?", visitorID, []string{"waiting", "called", "being_served"}).First(&existingEntry).Error; err == nil {
		return nil, fmt.Errorf("visitor is already in queue")
	}

	// Get current queue position
	var count int64
	qs.db.Model(&models.QueueEntry{}).Where("status = ?", "waiting").Count(&count)
	position := int(count) + 1

	// Adjust position based on priority
	if priority == "urgent" || priority == "elderly" || priority == "disability" {
		// Priority visitors get better position
		var priorityCount int64
		qs.db.Model(&models.QueueEntry{}).Where("status = ? AND priority IN ?", "waiting", []string{"normal"}).Count(&priorityCount)
		if priorityCount > 0 {
			position = int(count) - int(priorityCount) + 1
		}
	}

	// Create queue entry
	queueEntry := models.QueueEntry{
		VisitorID:        visitorID,
		Category:         serviceType,
		Position:         position,
		Status:           "waiting",
		EstimatedMinutes: 0, // Will be calculated
		JoinedAt:         time.Now(),
		Notes:            notes,
	}

	if err := qs.db.Create(&queueEntry).Error; err != nil {
		return nil, fmt.Errorf("failed to add visitor to queue: %w", err)
	}

	// Update positions for other entries
	qs.updateQueuePositions()

	// Get visitor details
	var visitor models.User
	qs.db.First(&visitor, visitorID)

	// Send notification to visitor
	estimatedWait := qs.calculateEstimatedWaitTime(position, serviceType)
	qs.realtimeNotificationService.SendQueueUpdate(visitorID, position, estimatedWait)

	// Broadcast queue update to admin/volunteers
	qs.broadcastQueueStats()

	entry := &QueueEntry{
		ID:            queueEntry.ID,
		VisitorID:     queueEntry.VisitorID,
		Position:      queueEntry.Position,
		EstimatedWait: estimatedWait,
		Status:        queueEntry.Status,
		Priority:      "normal",
		ServiceType:   queueEntry.Category,
		JoinedAt:      queueEntry.JoinedAt,
		Notes:         queueEntry.Notes,
		Visitor:       &visitor,
	}

	log.Printf("Added visitor %d to queue at position %d", visitorID, position)
	return entry, nil
}

// GetQueuePosition returns the current position of a visitor in the queue
func (qs *QueueService) GetQueuePosition(visitorID uint) (*QueueEntry, error) {
	var queueEntry models.QueueEntry
	if err := qs.db.Where("visitor_id = ? AND status IN ?", visitorID, []string{"waiting", "called", "being_served"}).First(&queueEntry).Error; err != nil {
		return nil, fmt.Errorf("visitor not found in queue")
	}

	var visitor models.User
	qs.db.First(&visitor, visitorID)

	estimatedWait := qs.calculateEstimatedWaitTime(queueEntry.Position, queueEntry.Category)

	return &QueueEntry{
		ID:            queueEntry.ID,
		VisitorID:     queueEntry.VisitorID,
		Position:      queueEntry.Position,
		EstimatedWait: estimatedWait,
		Status:        queueEntry.Status,
		Priority:      "normal",
		ServiceType:   queueEntry.Category,
		JoinedAt:      queueEntry.JoinedAt,
		CalledAt:      queueEntry.CalledAt,
		ServedAt:      queueEntry.ServedAt,
		CompletedAt:   nil,
		Notes:         queueEntry.Notes,
		Visitor:       &visitor,
	}, nil
}

// GetQueue returns the current queue with all waiting visitors
func (qs *QueueService) GetQueue(serviceType string) ([]*QueueEntry, error) {
	var queueEntries []models.QueueEntry
	query := qs.db.Where("status IN ?", []string{"waiting", "called", "being_served"}).Order("position ASC")

	if serviceType != "" && serviceType != "all" {
		query = query.Where("category = ?", serviceType)
	}

	if err := query.Find(&queueEntries).Error; err != nil {
		return nil, fmt.Errorf("failed to get queue: %w", err)
	}

	var entries []*QueueEntry
	for _, entry := range queueEntries {
		var visitor models.User
		qs.db.First(&visitor, entry.VisitorID)

		estimatedWait := qs.calculateEstimatedWaitTime(entry.Position, entry.Category)

		entries = append(entries, &QueueEntry{
			ID:            entry.ID,
			VisitorID:     entry.VisitorID,
			Position:      entry.Position,
			EstimatedWait: estimatedWait,
			Status:        entry.Status,
			Priority:      "normal",
			ServiceType:   entry.Category,
			JoinedAt:      entry.JoinedAt,
			CalledAt:      entry.CalledAt,
			ServedAt:      entry.ServedAt,
			CompletedAt:   nil,
			Notes:         entry.Notes,
			Visitor:       &visitor,
		})
	}

	return entries, nil
}

// CallNext calls the next visitor in the queue
func (qs *QueueService) CallNext(serviceType string) (*QueueEntry, error) {
	var queueEntry models.QueueEntry
	query := qs.db.Where("status = ?", "waiting").Order("position ASC")

	if serviceType != "" && serviceType != "all" {
		query = query.Where("category = ?", serviceType)
	}

	if err := query.First(&queueEntry).Error; err != nil {
		return nil, fmt.Errorf("no visitors waiting in queue")
	}

	// Update status to called
	now := time.Now()
	queueEntry.Status = "called"
	queueEntry.CalledAt = &now

	if err := qs.db.Save(&queueEntry).Error; err != nil {
		return nil, fmt.Errorf("failed to update queue entry: %w", err)
	}

	// Get visitor details
	var visitor models.User
	qs.db.First(&visitor, queueEntry.VisitorID)

	// Send notification to visitor
	qs.realtimeNotificationService.SendNotification(RealtimeNotificationData{
		UserID:   queueEntry.VisitorID,
		Type:     "queue_called",
		Title:    "You're Being Called",
		Message:  "Please proceed to the service desk. Your turn has arrived!",
		Priority: "high",
		Category: "queue",
		Channels: []string{"websocket", "push"},
		Data: map[string]interface{}{
			"queue_id":     queueEntry.ID,
			"service_type": queueEntry.Category,
		},
	})

	// Broadcast queue update
	qs.broadcastQueueStats()

	entry := &QueueEntry{
		ID:          queueEntry.ID,
		VisitorID:   queueEntry.VisitorID,
		Position:    queueEntry.Position,
		Status:      queueEntry.Status,
		Priority:    "normal",
		ServiceType: queueEntry.Category,
		JoinedAt:    queueEntry.JoinedAt,
		CalledAt:    queueEntry.CalledAt,
		Notes:       queueEntry.Notes,
		Visitor:     &visitor,
	}

	log.Printf("Called next visitor: %d for service: %s", queueEntry.VisitorID, serviceType)
	return entry, nil
}

// StartServing marks a visitor as being served
func (qs *QueueService) StartServing(queueID uint) error {
	var queueEntry models.QueueEntry
	if err := qs.db.First(&queueEntry, queueID).Error; err != nil {
		return fmt.Errorf("queue entry not found")
	}

	if queueEntry.Status != "called" {
		return fmt.Errorf("visitor must be called before being served")
	}

	now := time.Now()
	queueEntry.Status = "being_served"
	queueEntry.ServedAt = &now

	if err := qs.db.Save(&queueEntry).Error; err != nil {
		return fmt.Errorf("failed to update queue entry: %w", err)
	}

	// Send notification to visitor
	qs.realtimeNotificationService.SendNotification(RealtimeNotificationData{
		UserID:   queueEntry.VisitorID,
		Type:     "queue_serving",
		Title:    "Service Started",
		Message:  "Your service session has begun.",
		Priority: "normal",
		Category: "queue",
		Channels: []string{"websocket"},
	})

	// Broadcast queue update
	qs.broadcastQueueStats()

	log.Printf("Started serving visitor: %d", queueEntry.VisitorID)
	return nil
}

// CompleteService marks a visitor's service as completed
func (qs *QueueService) CompleteService(queueID uint, notes string) error {
	var queueEntry models.QueueEntry
	if err := qs.db.First(&queueEntry, queueID).Error; err != nil {
		return fmt.Errorf("queue entry not found")
	}

	if queueEntry.Status != "being_served" {
		return fmt.Errorf("visitor must be being served to complete service")
	}

	now := time.Now()
	queueEntry.Status = "completed"
	if notes != "" {
		queueEntry.Notes = notes
	}
	queueEntry.UpdatedAt = now

	if err := qs.db.Save(&queueEntry).Error; err != nil {
		return fmt.Errorf("failed to update queue entry: %w", err)
	}

	// Update positions for remaining queue
	qs.updateQueuePositions()

	// Send notification to visitor
	qs.realtimeNotificationService.SendNotification(RealtimeNotificationData{
		UserID:   queueEntry.VisitorID,
		Type:     "queue_completed",
		Title:    "Service Completed",
		Message:  "Thank you for visiting us today. Your service has been completed.",
		Priority: "normal",
		Category: "queue",
		Channels: []string{"websocket", "push"},
	})

	// Broadcast queue update
	qs.broadcastQueueStats()

	log.Printf("Completed service for visitor: %d", queueEntry.VisitorID)
	return nil
}

// RemoveFromQueue removes a visitor from the queue (cancellation)
func (qs *QueueService) RemoveFromQueue(visitorID uint, reason string) error {
	var queueEntry models.QueueEntry
	if err := qs.db.Where("visitor_id = ? AND status IN ?", visitorID, []string{"waiting", "called"}).First(&queueEntry).Error; err != nil {
		return fmt.Errorf("visitor not found in queue")
	}

	queueEntry.Status = "cancelled"
	queueEntry.Notes = reason

	if err := qs.db.Save(&queueEntry).Error; err != nil {
		return fmt.Errorf("failed to update queue entry: %w", err)
	}

	// Update positions for remaining queue
	qs.updateQueuePositions()

	// Send notification to visitor
	qs.realtimeNotificationService.SendNotification(RealtimeNotificationData{
		UserID:   visitorID,
		Type:     "queue_cancelled",
		Title:    "Queue Position Cancelled",
		Message:  "Your queue position has been cancelled.",
		Priority: "normal",
		Category: "queue",
		Channels: []string{"websocket"},
	})

	// Broadcast queue update
	qs.broadcastQueueStats()

	log.Printf("Removed visitor %d from queue: %s", visitorID, reason)
	return nil
}

// GetQueueStats returns current queue statistics
func (qs *QueueService) GetQueueStats() (*QueueStats, error) {
	stats := &QueueStats{
		ByServiceType: make(map[string]int),
		ByPriority:    make(map[string]int),
	}

	// Count waiting visitors
	qs.db.Model(&models.QueueEntry{}).Where("status = ?", "waiting").Count(&stats.TotalWaiting)

	// Count being served
	qs.db.Model(&models.QueueEntry{}).Where("status = ?", "being_served").Count(&stats.TotalBeingServed)

	// Count completed today
	today := time.Now().Truncate(24 * time.Hour)
	qs.db.Model(&models.QueueEntry{}).Where("status = ? AND updated_at >= ?", "completed", today).Count(&stats.CompletedToday)

	// Calculate average wait time (for completed entries today)
	var completedEntries []models.QueueEntry
	qs.db.Where("status = ? AND completed_at >= ? AND served_at IS NOT NULL", "completed", today).Find(&completedEntries)

	if len(completedEntries) > 0 {
		var totalWait time.Duration
		for _, entry := range completedEntries {
			if entry.ServedAt != nil {
				totalWait += entry.ServedAt.Sub(entry.JoinedAt)
			}
		}
		stats.AverageWaitTime = totalWait / time.Duration(len(completedEntries))
	}

	// Find longest current wait
	var oldestEntry models.QueueEntry
	if err := qs.db.Where("status = ?", "waiting").Order("joined_at ASC").First(&oldestEntry).Error; err == nil {
		stats.LongestWait = time.Since(oldestEntry.JoinedAt)
	}

	// Count by service type
	var serviceTypeCounts []struct {
		ServiceType string
		Count       int
	}
	qs.db.Model(&models.QueueEntry{}).Where("status IN ?", []string{"waiting", "called", "being_served"}).
		Select("category, count(*) as count").Group("category").Scan(&serviceTypeCounts)

	for _, count := range serviceTypeCounts {
		stats.ByServiceType[count.ServiceType] = count.Count
	}

	// Count by priority
	var priorityCounts []struct {
		Priority string
		Count    int
	}
	qs.db.Model(&models.QueueEntry{}).Where("status IN ?", []string{"waiting", "called", "being_served"}).
		Select("priority, count(*) as count").Group("priority").Scan(&priorityCounts)

	for _, count := range priorityCounts {
		stats.ByPriority[count.Priority] = count.Count
	}

	return stats, nil
}

// updateQueuePositions recalculates and updates queue positions
func (qs *QueueService) updateQueuePositions() {
	var waitingEntries []models.QueueEntry
	qs.db.Where("status = ?", "waiting").Order("joined_at ASC").Find(&waitingEntries)

	// Sort by join time only since Priority field doesn't exist
	sort.Slice(waitingEntries, func(i, j int) bool {
		return waitingEntries[i].JoinedAt.Before(waitingEntries[j].JoinedAt)
	})

	// Update positions
	for i, entry := range waitingEntries {
		newPosition := i + 1
		if entry.Position != newPosition {
			entry.Position = newPosition
			qs.db.Save(&entry)

			// Send position update to visitor
			estimatedWait := qs.calculateEstimatedWaitTime(newPosition, entry.Category)
			qs.realtimeNotificationService.SendQueueUpdate(entry.VisitorID, newPosition, estimatedWait)
		}
	}
}

// calculateEstimatedWaitTime calculates estimated wait time based on position and service type
func (qs *QueueService) calculateEstimatedWaitTime(position int, serviceType string) string {
	// Base service times (in minutes)
	serviceTimes := map[string]int{
		"food":     15,
		"clothing": 20,
		"advice":   30,
		"general":  25,
	}

	baseTime, ok := serviceTimes[serviceType]
	if !ok {
		baseTime = 20 // default
	}

	// Calculate estimated wait
	estimatedMinutes := (position - 1) * baseTime

	if estimatedMinutes <= 0 {
		return "Now"
	} else if estimatedMinutes < 60 {
		return fmt.Sprintf("%d minutes", estimatedMinutes)
	} else {
		hours := estimatedMinutes / 60
		minutes := estimatedMinutes % 60
		if minutes == 0 {
			return fmt.Sprintf("%d hour(s)", hours)
		}
		return fmt.Sprintf("%d hour(s) %d minutes", hours, minutes)
	}
}

// broadcastQueueStats broadcasts queue statistics to admin/volunteer dashboards
func (qs *QueueService) broadcastQueueStats() {
	stats, err := qs.GetQueueStats()
	if err != nil {
		log.Printf("Failed to get queue stats for broadcast: %v", err)
		return
	}

	// Broadcast to admin and volunteer topics
	qs.realtimeNotificationService.BroadcastToTopic("admin_notifications", RealtimeNotificationData{
		Type:     "queue_stats_update",
		Title:    "Queue Update",
		Message:  fmt.Sprintf("Queue stats updated: %d waiting, %d being served", stats.TotalWaiting, stats.TotalBeingServed),
		Priority: "low",
		Category: "queue",
		Data: map[string]interface{}{
			"stats": stats,
		},
	})

	qs.realtimeNotificationService.BroadcastToTopic("volunteer_notifications", RealtimeNotificationData{
		Type:     "queue_stats_update",
		Title:    "Queue Update",
		Message:  fmt.Sprintf("Queue stats updated: %d waiting", stats.TotalWaiting),
		Priority: "low",
		Category: "queue",
		Data: map[string]interface{}{
			"stats": stats,
		},
	})
}

// GetGlobalQueueService returns the global queue service instance
var globalQueueService *QueueService

func GetGlobalQueueService() *QueueService {
	if globalQueueService == nil {
		globalQueueService = NewQueueService()
	}
	return globalQueueService
}
