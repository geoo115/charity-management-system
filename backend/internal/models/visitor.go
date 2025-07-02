package models

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// EmergencyContact represents emergency contact information for visitors
type EmergencyContact struct {
	Name         string `json:"name"`
	Relationship string `json:"relationship"`
	Phone        string `json:"phone"`
	Email        string `json:"email,omitempty"`
}

// VisitorProfile represents additional information for visitors
type VisitorProfile struct {
	ID                   uint           `json:"id" gorm:"primaryKey"`
	UserID               uint           `json:"user_id" gorm:"uniqueIndex;not null"`
	User                 User           `json:"user" gorm:"foreignKey:UserID"`
	HouseholdSize        int            `json:"household_size" gorm:"default:1"`
	DietaryRequirements  string         `json:"dietary_requirements"`
	AccessibilityNeeds   string         `json:"accessibility_needs"`
	EmergencyContact     string         `json:"emergency_contact"` // Changed to string for simplicity
	PreferredContactTime string         `json:"preferred_contact_time"`
	Notes                string         `json:"notes"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
	DeletedAt            gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`
}

// TableName specifies the table name for VisitorProfile
func (VisitorProfile) TableName() string {
	return "visitor_profiles"
}

// Validate checks if the visitor profile is valid
func (vp *VisitorProfile) Validate() error {
	if vp.UserID == 0 {
		return fmt.Errorf("user ID is required")
	}
	if vp.HouseholdSize < 1 {
		return fmt.Errorf("household size must be at least 1")
	}
	return nil
}

// Visit represents a visitor's current or completed visit
type Visit struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	VisitorID     uint           `json:"visitor_id" gorm:"not null;index"`
	TicketID      uint           `json:"ticket_id" gorm:"not null;index"`
	CheckInTime   time.Time      `json:"check_in_time"`
	CheckOutTime  *time.Time     `json:"check_out_time"`
	CheckInMethod string         `json:"check_in_method" gorm:"default:'manual_entry'"` // qr_scan, manual_entry
	CheckedInBy   *uint          `json:"checked_in_by"`
	CheckedOutBy  *uint          `json:"checked_out_by"`
	Status        string         `json:"status" gorm:"default:'checked_in'"` // checked_in, in_service, completed, no_show
	Duration      *int           `json:"duration"`                           // minutes, calculated on checkout
	Notes         string         `json:"notes"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Visitor          User   `json:"visitor" gorm:"foreignKey:VisitorID"`
	Ticket           Ticket `json:"ticket" gorm:"foreignKey:TicketID"`
	CheckedInByUser  *User  `json:"checked_in_by_user" gorm:"foreignKey:CheckedInBy"`
	CheckedOutByUser *User  `json:"checked_out_by_user" gorm:"foreignKey:CheckedOutBy"`
}

// IsActive checks if the visit is currently active
func (v *Visit) IsActive() bool {
	return v.CheckOutTime == nil && (v.Status == "checked_in" || v.Status == "in_service")
}

// Complete marks the visit as completed and calculates duration
func (v *Visit) Complete(staffID uint, notes string) {
	now := time.Now()
	v.CheckOutTime = &now
	v.CheckedOutBy = &staffID
	v.Status = "completed"
	v.Notes = notes
	v.UpdatedAt = now

	// Calculate duration in minutes
	if !v.CheckInTime.IsZero() {
		duration := int(now.Sub(v.CheckInTime).Minutes())
		v.Duration = &duration
	}
}

// MarkNoShow marks the visit as no-show
func (v *Visit) MarkNoShow(staffID uint, notes string) {
	now := time.Now()
	v.CheckOutTime = &now
	v.CheckedOutBy = &staffID
	v.Status = "no_show"
	v.Notes = notes
	v.UpdatedAt = now

	// Calculate duration in minutes (time they were in queue)
	if !v.CheckInTime.IsZero() {
		duration := int(now.Sub(v.CheckInTime).Minutes())
		v.Duration = &duration
	}
}

// VisitCapacity manages daily visit limits and operating schedule
type VisitCapacity struct {
	ID                   uint           `gorm:"primaryKey" json:"id"`
	Date                 time.Time      `json:"date" gorm:"uniqueIndex"`
	DayOfWeek            string         `json:"day_of_week"`
	MaxFoodVisits        int            `json:"max_food_visits" gorm:"default:50"`
	MaxGeneralVisits     int            `json:"max_general_visits" gorm:"default:20"`
	CurrentFoodVisits    int            `json:"current_food_visits" gorm:"default:0"`
	CurrentGeneralVisits int            `json:"current_general_visits" gorm:"default:0"`
	IsOperatingDay       bool           `json:"is_operating_day" gorm:"default:true"`
	Notes                string         `json:"notes"`
	TemporaryAdjustment  bool           `json:"temporary_adjustment" gorm:"default:false"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
	DeletedAt            gorm.DeletedAt `gorm:"index" json:"-"`
}

// HasCapacity checks if there's available capacity for a category
func (vc *VisitCapacity) HasCapacity(category string) bool {
	if !vc.IsOperatingDay {
		return false
	}

	switch category {
	case CategoryFood:
		return vc.CurrentFoodVisits < vc.MaxFoodVisits
	case CategoryGeneral:
		return vc.CurrentGeneralVisits < vc.MaxGeneralVisits
	default:
		return false
	}
}

// GetAvailableCapacity returns remaining capacity for a category
func (vc *VisitCapacity) GetAvailableCapacity(category string) int {
	switch category {
	case CategoryFood:
		return vc.MaxFoodVisits - vc.CurrentFoodVisits
	case CategoryGeneral:
		return vc.MaxGeneralVisits - vc.CurrentGeneralVisits
	default:
		return 0
	}
}

// IncrementVisits increases the count for a category
func (vc *VisitCapacity) IncrementVisits(category string) {
	switch category {
	case CategoryFood:
		vc.CurrentFoodVisits++
	case CategoryGeneral:
		vc.CurrentGeneralVisits++
	}
}

// TableName specifies the table name
func (VisitCapacity) TableName() string {
	return "visit_capacities"
}

// VisitFeedback represents detailed feedback for a specific visit
type VisitFeedback struct {
	ID            uint  `gorm:"primaryKey" json:"id"`
	VisitorID     uint  `json:"visitor_id" gorm:"not null;index"`
	VisitID       uint  `json:"visit_id" gorm:"not null;index"`
	HelpRequestID *uint `json:"help_request_id" gorm:"index"`

	// Overall ratings (1-5 stars)
	OverallRating      int  `json:"overall_rating" gorm:"not null;check:overall_rating >= 1 AND overall_rating <= 5"`
	StaffHelpfulness   int  `json:"staff_helpfulness" gorm:"check:staff_helpfulness >= 1 AND staff_helpfulness <= 5"`
	WaitTimeRating     int  `json:"wait_time_rating" gorm:"check:wait_time_rating >= 1 AND wait_time_rating <= 5"`
	FacilityRating     int  `json:"facility_rating" gorm:"check:facility_rating >= 1 AND facility_rating <= 5"`
	FoodQualityRating  *int `json:"food_quality_rating" gorm:"check:food_quality_rating >= 1 AND food_quality_rating <= 5"`
	ServiceSpeedRating int  `json:"service_speed_rating" gorm:"check:service_speed_rating >= 1 AND service_speed_rating <= 5"`

	// Detailed feedback
	PositiveComments    string `json:"positive_comments" gorm:"type:text"`
	AreasForImprovement string `json:"areas_for_improvement" gorm:"type:text"`
	Suggestions         string `json:"suggestions" gorm:"type:text"`
	AccessibilityNotes  string `json:"accessibility_notes" gorm:"type:text"`

	// Experience questions
	WouldRecommend bool `json:"would_recommend" gorm:"default:false"`
	FeelWelcomed   bool `json:"feel_welcomed" gorm:"default:false"`
	NeedsWereMet   bool `json:"needs_were_met" gorm:"default:false"`

	// Service specific feedback
	ServiceCategory   string `json:"service_category"` // food, general, emergency
	ItemsReceived     string `json:"items_received" gorm:"type:text"`
	ItemsSatisfaction *int   `json:"items_satisfaction" gorm:"check:items_satisfaction >= 1 AND items_satisfaction <= 5"`

	// Visit context
	VisitDate      time.Time `json:"visit_date"`
	ActualWaitTime *int      `json:"actual_wait_time"` // minutes

	// Privacy and follow-up
	IsAnonymous        bool `json:"is_anonymous" gorm:"default:false"`
	AllowPublicSharing bool `json:"allow_public_sharing" gorm:"default:false"`
	AllowFollowUp      bool `json:"allow_follow_up" gorm:"default:true"`

	// Administrative
	Status          string     `json:"status" gorm:"default:'submitted';index"` // submitted, reviewed, responded
	ReviewedBy      *uint      `json:"reviewed_by"`
	ReviewedAt      *time.Time `json:"reviewed_at"`
	AdminResponse   string     `json:"admin_response" gorm:"type:text"`
	AdminResponseBy *uint      `json:"admin_response_by"`
	AdminResponseAt *time.Time `json:"admin_response_at"`

	// Notification tracking
	IsVisitorNotified bool       `json:"is_visitor_notified" gorm:"default:false"`
	VisitorNotifiedAt *time.Time `json:"visitor_notified_at"`
	AdminNotes        string     `json:"admin_notes" gorm:"type:text"`

	CreatedAt time.Time      `json:"created_at" gorm:"index"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Visitor             User         `json:"visitor" gorm:"foreignKey:VisitorID"`
	Visit               Visit        `json:"visit" gorm:"foreignKey:VisitID"`
	HelpRequest         *HelpRequest `json:"help_request" gorm:"foreignKey:HelpRequestID"`
	ReviewedByUser      *User        `json:"reviewed_by_user" gorm:"foreignKey:ReviewedBy"`
	AdminResponseByUser *User        `json:"admin_response_by_user" gorm:"foreignKey:AdminResponseBy"`
}

// GetAverageRating calculates the average rating across all categories
func (vf *VisitFeedback) GetAverageRating() float64 {
	ratings := []int{vf.OverallRating}
	count := 1

	if vf.StaffHelpfulness > 0 {
		ratings = append(ratings, vf.StaffHelpfulness)
		count++
	}
	if vf.WaitTimeRating > 0 {
		ratings = append(ratings, vf.WaitTimeRating)
		count++
	}
	if vf.FacilityRating > 0 {
		ratings = append(ratings, vf.FacilityRating)
		count++
	}
	if vf.FoodQualityRating != nil && *vf.FoodQualityRating > 0 {
		ratings = append(ratings, *vf.FoodQualityRating)
		count++
	}
	if vf.ServiceSpeedRating > 0 {
		ratings = append(ratings, vf.ServiceSpeedRating)
		count++
	}

	if count == 0 {
		return 0
	}

	sum := 0
	for _, rating := range ratings {
		sum += rating
	}

	return float64(sum) / float64(count)
}

// IsHighPriority checks if feedback requires immediate attention
func (vf *VisitFeedback) IsHighPriority() bool {
	// Low overall rating or specific concerns
	if vf.OverallRating <= 2 {
		return true
	}

	// Check for specific low ratings
	if vf.WaitTimeRating > 0 && vf.WaitTimeRating <= 2 {
		return true
	}
	if vf.StaffHelpfulness > 0 && vf.StaffHelpfulness <= 2 {
		return true
	}
	if vf.FacilityRating > 0 && vf.FacilityRating <= 2 {
		return true
	}

	// Not recommending the service
	if !vf.WouldRecommend {
		return true
	}

	// Didn't feel welcomed or needs not met
	if !vf.FeelWelcomed || !vf.NeedsWereMet {
		return true
	}

	return false
}

// GetResponseStatus returns the current response status
func (vf *VisitFeedback) GetResponseStatus() string {
	if vf.AdminResponseAt != nil {
		return "responded"
	}
	if vf.ReviewedAt != nil {
		return "reviewed"
	}
	return "pending"
}

// CanEdit checks if feedback can still be edited
func (vf *VisitFeedback) CanEdit() bool {
	// Can edit within 24 hours if not yet reviewed
	if vf.ReviewedAt != nil {
		return false
	}

	return time.Since(vf.CreatedAt) < 24*time.Hour
}

// Ticket represents a visitor's access ticket
type Ticket struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	TicketNumber  string         `json:"ticket_number" gorm:"type:varchar(50);uniqueIndex;not null"`
	HelpRequestID uint           `json:"help_request_id" gorm:"not null"`
	VisitorID     uint           `json:"visitor_id" gorm:"not null"`
	VisitorName   string         `json:"visitor_name" gorm:"type:varchar(255);not null"`
	Category      string         `json:"category" gorm:"type:varchar(100)"`
	VisitDate     time.Time      `json:"visit_date"`
	TimeSlot      string         `json:"time_slot" gorm:"type:varchar(20)"`
	QRCode        string         `json:"qr_code" gorm:"type:text"`
	Status        string         `json:"status" gorm:"type:varchar(20);not null;default:'active'"`
	IssuedAt      time.Time      `json:"issued_at" gorm:"not null"`
	ValidUntil    time.Time      `json:"valid_until" gorm:"not null"`
	ExpiresAt     time.Time      `json:"expires_at" gorm:"not null"`
	UsedAt        *time.Time     `json:"used_at,omitempty"`
	UsedBy        *uint          `json:"used_by,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`

	// Relationships
	HelpRequest HelpRequest `json:"help_request" gorm:"foreignKey:HelpRequestID"`
	Visitor     User        `json:"visitor" gorm:"foreignKey:VisitorID"`
	UsedByUser  *User       `json:"used_by_user,omitempty" gorm:"foreignKey:UsedBy"`
}

// TableName returns the table name for Ticket
func (Ticket) TableName() string {
	return "tickets"
}

// Ticket status constants
const (
	TicketStatusActive    = "active"
	TicketStatusUsed      = "used"
	TicketStatusExpired   = "expired"
	TicketStatusCancelled = "cancelled"
)

// GenerateTicketNumber creates a unique ticket number
func GenerateTicketNumber() string {
	now := time.Now()
	return fmt.Sprintf("LDH-%d-%03d", now.Year()%100, now.YearDay())
}

// GenerateEmergencyTicketNumber creates a unique emergency ticket number with EMG prefix
func GenerateEmergencyTicketNumber() string {
	now := time.Now()
	return fmt.Sprintf("EMG-%d-%03d", now.Year()%100, now.YearDay())
}

// GenerateQRCode creates a unique QR code data for the ticket
func (t *Ticket) GenerateQRCode() string {
	// Create a unique QR code data that includes ticket details for verification
	return fmt.Sprintf("LDH-TICKET:%s:%d:%s", t.TicketNumber, t.ID, t.ValidUntil.Format("2006-01-02"))
}

// IsExpired checks if the ticket has expired
func (t *Ticket) IsExpired() bool {
	return time.Now().After(t.ValidUntil)
}

// IsValid checks if the ticket is valid for use
func (t *Ticket) IsValid() bool {
	return t.Status == TicketStatusActive &&
		t.ValidUntil.After(time.Now()) &&
		t.UsedAt == nil
}

// CanBeUsed checks if the ticket can be used today
func (t *Ticket) CanBeUsed() bool {
	today := time.Now().Format("2006-01-02")
	visitDay := t.ValidUntil.Format("2006-01-02")
	return t.IsValid() && today == visitDay
}

// IsValidForToday checks if the ticket is valid for today
func (t *Ticket) IsValidForToday() bool {
	today := time.Now().Format("2006-01-02")
	visitDate := t.ValidUntil.Format("2006-01-02")
	return visitDate == today && t.Status == TicketStatusActive
}

// GetFormattedVisitDate returns the visit date as a formatted string
func (t *Ticket) GetFormattedVisitDate() string {
	return t.ValidUntil.Format("2006-01-02")
}

// Use marks the ticket as used
func (t *Ticket) Use() {
	t.Status = TicketStatusUsed
	now := time.Now()
	t.UsedAt = &now
	t.UpdatedAt = now
}

// Cancel marks the ticket as cancelled
func (t *Ticket) Cancel() {
	t.Status = TicketStatusCancelled
	t.UpdatedAt = time.Now()
}

// TimeSlotBooking represents a booked time slot
type TimeSlotBooking struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	VisitorID uint           `json:"visitor_id"`
	Category  string         `json:"category"`
	Date      string         `json:"date"`
	TimeSlot  string         `json:"time_slot"`
	Status    string         `json:"status"` // booked, used, cancelled
	BookedAt  time.Time      `json:"booked_at"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// Relationships
	Visitor User `json:"visitor" gorm:"foreignKey:VisitorID"`
}

// Validate checks if the time slot booking is valid
func (tsb *TimeSlotBooking) Validate() error {
	if tsb.VisitorID == 0 {
		return fmt.Errorf("visitor ID is required")
	}
	if tsb.Category == "" {
		return fmt.Errorf("category is required")
	}
	if tsb.Date == "" {
		return fmt.Errorf("date is required")
	}
	if tsb.TimeSlot == "" {
		return fmt.Errorf("time slot is required")
	}
	return nil
}

// QueueSettings represents queue configuration settings
type QueueSettings struct {
	ID                     uint           `gorm:"primaryKey" json:"id"`
	Category               string         `json:"category" gorm:"unique;not null"`           // Service category
	MaxWaitTime            int            `json:"max_wait_time"`                             // Maximum wait time in minutes
	AverageServiceTime     int            `json:"average_service_time"`                      // Average service time in minutes
	AlertThreshold         int            `json:"alert_threshold"`                           // Alert when wait time exceeds this
	MaxDailyCapacity       int            `json:"max_daily_capacity"`                        // Maximum entries per day
	DailyLimit             int            `json:"daily_limit"`                               // Daily limit for queue entries
	StartTime              string         `json:"start_time"`                                // Queue opening time (HH:MM format)
	EndTime                string         `json:"end_time"`                                  // Queue closing time (HH:MM format)
	ConcurrentServiceDesks int            `json:"concurrent_service_desks" gorm:"default:1"` // Number of service desks
	IsActive               bool           `json:"is_active" gorm:"default:true"`             // Whether this category is accepting new entries
	Priority               int            `json:"priority" gorm:"default:1"`                 // Priority level (1 = highest)
	RequiresAppointment    bool           `json:"requires_appointment" gorm:"default:false"`
	AllowWalkIns           bool           `json:"allow_walk_ins" gorm:"default:true"`
	CreatedAt              time.Time      `json:"created_at"`
	UpdatedAt              time.Time      `json:"updated_at"`
	DeletedAt              gorm.DeletedAt `gorm:"index" json:"-"`
}

// Validate checks if the queue settings are valid
func (qs *QueueSettings) Validate() error {
	if qs.Category == "" {
		return fmt.Errorf("category is required")
	}
	if qs.MaxWaitTime < 0 {
		return fmt.Errorf("max wait time cannot be negative")
	}
	if qs.MaxDailyCapacity < 0 {
		return fmt.Errorf("max daily capacity cannot be negative")
	}
	return nil
}

// QueueEntry represents a visitor in a service queue
type QueueEntry struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	VisitorID        uint           `json:"visitor_id" gorm:"index"`
	HelpRequestID    uint           `json:"help_request_id" gorm:"index"`
	Category         string         `json:"category" gorm:"index"`
	Reference        string         `json:"reference" gorm:"index"` // Reference or ticket number
	Position         int            `json:"position"`
	EstimatedMinutes int            `json:"estimated_minutes"`                   // Estimated wait time in minutes
	Status           string         `json:"status" gorm:"default:waiting;index"` // waiting, called, served, cancelled, completed
	JoinedAt         time.Time      `json:"joined_at"`
	CalledAt         *time.Time     `json:"called_at"`
	ServedAt         *time.Time     `json:"served_at"`
	CancelledAt      *time.Time     `json:"cancelled_at"`
	Notes            string         `json:"notes"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Visitor     User        `json:"visitor" gorm:"foreignKey:VisitorID"`
	HelpRequest HelpRequest `json:"help_request" gorm:"foreignKey:HelpRequestID"`
}

// MarkServiced marks a queue entry as serviced
func (q *QueueEntry) MarkServiced() {
	q.Status = "served"
	now := time.Now()
	q.ServedAt = &now
}

// MarkCompleted marks a queue entry as completed
func (q *QueueEntry) MarkCompleted() {
	q.Status = "completed"
	now := time.Now()
	// Using UpdatedAt for completion time since there's no CompletedAt field
	q.UpdatedAt = now
}

// MarkCancelled marks a queue entry as cancelled
func (q *QueueEntry) MarkCancelled() {
	q.Status = "cancelled"
	now := time.Now()
	q.CancelledAt = &now
}

// MarkCalled marks a queue entry as called
func (q *QueueEntry) MarkCalled() {
	q.Status = "called"
	now := time.Now()
	q.CalledAt = &now
}

// UpdateEstimatedTime updates the estimated wait time
func (q *QueueEntry) UpdateEstimatedTime(minutes int) {
	q.EstimatedMinutes = minutes
}

// QueueEntryUpdate represents an update to a queue entry
type QueueEntryUpdate struct {
	HelpRequestID *uint      `json:"help_request_id"`
	TicketNumber  *string    `json:"ticket_number"`
	ScheduledTime string     `json:"scheduled_time"`
	CheckedInAt   *time.Time `json:"checked_in_at"`
}
