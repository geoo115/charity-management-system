package jobs

import (
	"log"
	"os"
	"strconv"
	"sync"
	"time"
)

// JobConfig controls which background jobs are enabled
type JobConfig struct {
	EnableInventoryChecks  bool
	EnableReminderEmails   bool
	InventoryCheckInterval time.Duration
	ReminderEmailInterval  time.Duration
}

// Default job configuration with sensible defaults
var defaultJobConfig = JobConfig{
	EnableInventoryChecks:  true,
	EnableReminderEmails:   true,
	InventoryCheckInterval: 6 * time.Hour,
	ReminderEmailInterval:  24 * time.Hour,
}

var (
	jobsWaitGroup sync.WaitGroup
	stopChan      chan struct{}
)

// GetJobConfigFromEnv loads job configuration from environment variables
func GetJobConfigFromEnv() JobConfig {
	config := defaultJobConfig

	// Check if jobs are enabled/disabled
	if val, exists := os.LookupEnv("ENABLE_INVENTORY_CHECKS"); exists {
		config.EnableInventoryChecks, _ = strconv.ParseBool(val)
	}

	if val, exists := os.LookupEnv("ENABLE_REMINDER_EMAILS"); exists {
		config.EnableReminderEmails, _ = strconv.ParseBool(val)
	}

	// Check for custom intervals
	if val, exists := os.LookupEnv("INVENTORY_CHECK_INTERVAL_HOURS"); exists {
		if hours, err := strconv.Atoi(val); err == nil && hours > 0 {
			config.InventoryCheckInterval = time.Duration(hours) * time.Hour
		}
	}

	if val, exists := os.LookupEnv("REMINDER_EMAIL_INTERVAL_HOURS"); exists {
		if hours, err := strconv.Atoi(val); err == nil && hours > 0 {
			config.ReminderEmailInterval = time.Duration(hours) * time.Hour
		}
	}

	return config
}

// StartBackgroundJobs initializes scheduled tasks with the given configuration
func StartBackgroundJobs() {
	config := GetJobConfigFromEnv()
	log.Println("Starting background jobs with configuration:", config)

	stopChan = make(chan struct{})

	// Start enabled jobs in goroutines
	if config.EnableInventoryChecks {
		jobsWaitGroup.Add(1)
		go scheduleInventoryChecks(config.InventoryCheckInterval, stopChan, &jobsWaitGroup)
	} else {
		log.Println("Inventory checks disabled")
	}

	if config.EnableReminderEmails {
		jobsWaitGroup.Add(1)
		go scheduleReminderEmails(config.ReminderEmailInterval, stopChan, &jobsWaitGroup)
	} else {
		log.Println("Reminder emails disabled")
	}
}

// StopBackgroundJobs gracefully stops all background jobs
func StopBackgroundJobs() {
	log.Println("Stopping background jobs...")
	close(stopChan)

	// Wait with timeout for jobs to finish
	done := make(chan struct{})
	go func() {
		jobsWaitGroup.Wait()
		close(done)
	}()

	// Wait up to 5 seconds for jobs to finish
	select {
	case <-done:
		log.Println("All jobs stopped gracefully")
	case <-time.After(5 * time.Second):
		log.Println("Some jobs did not stop in time")
	}
}

// scheduleInventoryChecks checks inventory levels and flags items below threshold
func scheduleInventoryChecks(interval time.Duration, stop chan struct{}, wg *sync.WaitGroup) {
	defer wg.Done()
	log.Printf("Starting inventory checks at %s intervals", interval)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Run an initial check immediately
	runInventoryCheck()

	for {
		select {
		case <-ticker.C:
			runInventoryCheck()
		case <-stop:
			log.Println("Stopping inventory checks")
			return
		}
	}
}

// runInventoryCheck performs the actual inventory check
func runInventoryCheck() {
	log.Println("Running scheduled inventory check")
	// Implementation would check database inventory levels
	// and flag items that are below threshold
}

// scheduleReminderEmails sends reminder emails for upcoming shifts
func scheduleReminderEmails(interval time.Duration, stop chan struct{}, wg *sync.WaitGroup) {
	defer wg.Done()
	log.Printf("Starting reminder emails at %s intervals", interval)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			log.Println("Sending shift reminder emails")
			// Implementation would find shifts in next 24 hours
			// and send reminder emails to assigned volunteers
		case <-stop:
			log.Println("Stopping reminder emails")
			return
		}
	}
}
