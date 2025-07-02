package models

import (
	"strings"
	"time"

	"gorm.io/gorm"
)

// StaffProfile represents staff member information
type StaffProfile struct {
	ID               uint           `gorm:"primarykey" json:"id"`
	UserID           uint           `json:"user_id" gorm:"uniqueIndex"`
	EmployeeID       string         `json:"employee_id" gorm:"uniqueIndex;size:20"`
	Department       string         `json:"department" gorm:"size:100"`
	Position         string         `json:"position" gorm:"size:100"`
	HireDate         time.Time      `json:"hire_date"`
	SupervisorID     *uint          `json:"supervisor_id"`
	Status           string         `json:"status" gorm:"default:'active';size:20"` // active, inactive, suspended, training
	Skills           string         `json:"skills"`                                 // JSON array of skills
	Certifications   string         `json:"certifications"`                         // JSON array of certifications
	WorkSchedule     string         `json:"work_schedule"`                          // JSON of work schedule
	ContactInfo      string         `json:"contact_info"`
	EmergencyContact string         `json:"emergency_contact"`
	Notes            string         `json:"notes"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User       User          `json:"user" gorm:"foreignKey:UserID"`
	Supervisor *StaffProfile `json:"supervisor,omitempty" gorm:"foreignKey:SupervisorID"`
}

// Staff constants
const (
	StaffStatusActive    = "active"
	StaffStatusInactive  = "inactive"
	StaffStatusSuspended = "suspended"
	StaffStatusTraining  = "training"
)

// Department constants
const (
	DepartmentGeneral   = "general"
	DepartmentFood      = "food"
	DepartmentEmergency = "emergency"
	DepartmentAdmin     = "admin"
	DepartmentSupport   = "support"
)

// Position constants
const (
	PositionStaffMember = "staff_member"
	PositionSeniorStaff = "senior_staff"
	PositionSupervisor  = "supervisor"
	PositionManager     = "manager"
	PositionSpecialist  = "specialist"
	PositionCoordinator = "coordinator"
)

// StaffAssignment represents staff assignment to queues/departments
type StaffAssignment struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	StaffID    uint           `json:"staff_id" gorm:"index"`
	QueueType  string         `json:"queue_type" gorm:"size:50"`
	Department string         `json:"department" gorm:"size:100"`
	ShiftStart time.Time      `json:"shift_start"`
	ShiftEnd   time.Time      `json:"shift_end"`
	Status     string         `json:"status" gorm:"default:'active';size:20"` // active, completed, cancelled
	Notes      string         `json:"notes"`
	AssignedBy uint           `json:"assigned_by"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Staff          StaffProfile `json:"staff" gorm:"foreignKey:StaffID"`
	AssignedByUser User         `json:"assigned_by_user" gorm:"foreignKey:AssignedBy"`
}

// StaffPerformanceMetric represents staff performance tracking
type StaffPerformanceMetric struct {
	ID                    uint      `gorm:"primarykey" json:"id"`
	StaffID               uint      `json:"staff_id" gorm:"index"`
	Date                  time.Time `json:"date" gorm:"index"`
	VisitorsServed        int       `json:"visitors_served" gorm:"default:0"`
	AverageServiceTime    int       `json:"average_service_time"` // in minutes
	SatisfactionRating    float64   `json:"satisfaction_rating" gorm:"type:decimal(3,2)"`
	TasksCompleted        int       `json:"tasks_completed" gorm:"default:0"`
	HoursWorked           float64   `json:"hours_worked" gorm:"type:decimal(5,2)"`
	OvertimeHours         float64   `json:"overtime_hours" gorm:"type:decimal(5,2);default:0"`
	BreakCompliance       bool      `json:"break_compliance" gorm:"default:true"`
	PunctualityScore      float64   `json:"punctuality_score" gorm:"type:decimal(5,2);default:100"`
	CustomerFeedbackScore float64   `json:"customer_feedback_score" gorm:"type:decimal(3,2)"`
	EfficiencyRating      string    `json:"efficiency_rating" gorm:"size:5"` // A+, A, B+, B, C+, C, D, F
	Notes                 string    `json:"notes"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`

	// Relationships
	Staff StaffProfile `json:"staff" gorm:"foreignKey:StaffID"`
}

// StaffSchedule represents staff work schedules
type StaffSchedule struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	StaffID    uint           `json:"staff_id" gorm:"index"`
	Date       time.Time      `json:"date" gorm:"index"`
	StartTime  time.Time      `json:"start_time"`
	EndTime    time.Time      `json:"end_time"`
	Department string         `json:"department" gorm:"size:100"`
	BreakTimes string         `json:"break_times"`                               // JSON array of break times
	Status     string         `json:"status" gorm:"default:'scheduled';size:20"` // scheduled, completed, cancelled, no_show
	Notes      string         `json:"notes"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Staff StaffProfile `json:"staff" gorm:"foreignKey:StaffID"`
}

// Helper methods for StaffProfile

// GetSkillsArray returns skills as a slice
func (sp *StaffProfile) GetSkillsArray() []string {
	if sp.Skills == "" {
		return []string{}
	}
	var skills []string
	for _, skill := range strings.Split(sp.Skills, ",") {
		if trimmed := strings.TrimSpace(skill); trimmed != "" {
			skills = append(skills, trimmed)
		}
	}
	return skills
}

// GetCertificationsArray returns certifications as a slice
func (sp *StaffProfile) GetCertificationsArray() []string {
	if sp.Certifications == "" {
		return []string{}
	}
	var certs []string
	for _, cert := range strings.Split(sp.Certifications, ",") {
		if trimmed := strings.TrimSpace(cert); trimmed != "" {
			certs = append(certs, trimmed)
		}
	}
	return certs
}

// IsActive returns true if staff member is active
func (sp *StaffProfile) IsActive() bool {
	return sp.Status == StaffStatusActive
}

// IsSupervisor returns true if staff member has supervisor role
func (sp *StaffProfile) IsSupervisor() bool {
	return sp.Position == PositionSupervisor || sp.Position == PositionManager
}

// CanManageStaff returns true if staff member can manage other staff
func (sp *StaffProfile) CanManageStaff() bool {
	return sp.IsSupervisor() || sp.Position == PositionManager
}

// GetFullName returns the staff member's full name
func (sp *StaffProfile) GetFullName() string {
	return sp.User.FirstName + " " + sp.User.LastName
}

// UpdateStatus updates the staff member's status
func (sp *StaffProfile) UpdateStatus(status string) {
	sp.Status = status
	sp.UpdatedAt = time.Now()
}

// AddSkill adds a skill to the staff member's skill set
func (sp *StaffProfile) AddSkill(skill string) {
	skills := sp.GetSkillsArray()
	for _, existingSkill := range skills {
		if existingSkill == skill {
			return // Skill already exists
		}
	}
	skills = append(skills, skill)
	sp.Skills = strings.Join(skills, ",")
	sp.UpdatedAt = time.Now()
}

// RemoveSkill removes a skill from the staff member's skill set
func (sp *StaffProfile) RemoveSkill(skill string) {
	skills := sp.GetSkillsArray()
	var newSkills []string
	for _, existingSkill := range skills {
		if existingSkill != skill {
			newSkills = append(newSkills, existingSkill)
		}
	}
	sp.Skills = strings.Join(newSkills, ",")
	sp.UpdatedAt = time.Now()
}

// Helper methods for StaffAssignment

// IsActive returns true if assignment is currently active
func (sa *StaffAssignment) IsActive() bool {
	return sa.Status == "active" && time.Now().After(sa.ShiftStart) && time.Now().Before(sa.ShiftEnd)
}

// GetDuration returns the duration of the assignment in hours
func (sa *StaffAssignment) GetDuration() float64 {
	return sa.ShiftEnd.Sub(sa.ShiftStart).Hours()
}

// Helper methods for StaffPerformanceMetric

// GetOverallScore calculates an overall performance score
func (spm *StaffPerformanceMetric) GetOverallScore() float64 {
	// Weighted average of different metrics
	satisfactionWeight := 0.3
	punctualityWeight := 0.2
	efficiencyWeight := 0.3
	feedbackWeight := 0.2

	efficiencyScore := spm.getEfficiencyNumericScore()

	overallScore := (spm.SatisfactionRating*satisfactionWeight +
		spm.PunctualityScore*punctualityWeight +
		efficiencyScore*efficiencyWeight +
		spm.CustomerFeedbackScore*feedbackWeight)

	return overallScore
}

// getEfficiencyNumericScore converts efficiency rating to numeric score
func (spm *StaffPerformanceMetric) getEfficiencyNumericScore() float64 {
	switch spm.EfficiencyRating {
	case "A+":
		return 100.0
	case "A":
		return 95.0
	case "B+":
		return 90.0
	case "B":
		return 85.0
	case "C+":
		return 80.0
	case "C":
		return 75.0
	case "D":
		return 65.0
	case "F":
		return 50.0
	default:
		return 75.0 // Default to C
	}
}

// Helper methods for StaffSchedule

// IsScheduledToday returns true if staff is scheduled for today
func (ss *StaffSchedule) IsScheduledToday() bool {
	today := time.Now().Format("2006-01-02")
	scheduleDate := ss.Date.Format("2006-01-02")
	return scheduleDate == today && ss.Status == "scheduled"
}

// GetWorkingHours returns the number of working hours for this schedule
func (ss *StaffSchedule) GetWorkingHours() float64 {
	return ss.EndTime.Sub(ss.StartTime).Hours()
}

// IsCurrentlyWorking returns true if staff is currently working
func (ss *StaffSchedule) IsCurrentlyWorking() bool {
	now := time.Now()
	return ss.IsScheduledToday() && now.After(ss.StartTime) && now.Before(ss.EndTime)
}
