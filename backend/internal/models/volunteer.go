package models

import (
	"strings"
	"time"

	"gorm.io/gorm"
)

// VolunteerProfile represents additional volunteer-specific data
type VolunteerProfile struct {
	ID             uint       `gorm:"primarykey" json:"id"`
	UserID         uint       `json:"user_id" gorm:"uniqueIndex"`
	ApplicationID  *uint      `json:"application_id"`
	Experience     string     `json:"experience"`
	References     string     `json:"references"`
	Skills         string     `json:"skills"`
	Availability   string     `json:"availability"`
	Status         string     `json:"status"` // Active, Inactive, Suspended, Training
	Notes          string     `json:"notes,omitempty"`
	PreferredRoles string     `json:"preferred_roles"`
	TotalHours     float64    `json:"total_hours" gorm:"default:0"`
	LastShiftDate  *time.Time `json:"last_shift_date"`

	// New role hierarchy fields
	RoleLevel         string `json:"role_level" gorm:"default:'general'"`     // general, specialized, lead
	Specializations   string `json:"specializations"`                         // JSON array of specializations
	LeadershipSkills  string `json:"leadership_skills"`                       // Leadership capabilities for lead volunteers
	MentorID          *uint  `json:"mentor_id"`                               // Assigned mentor for new volunteers
	TeamMembers       string `json:"team_members"`                            // JSON array of team member IDs (for leads)
	CanTrainOthers    bool   `json:"can_train_others" gorm:"default:false"`   // Permission to train other volunteers
	CanManageShifts   bool   `json:"can_manage_shifts" gorm:"default:false"`  // Permission to manage shifts
	EmergencyResponse bool   `json:"emergency_response" gorm:"default:false"` // Qualified for emergency response

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User        User                  `json:"user" gorm:"foreignKey:UserID"`
	Application *VolunteerApplication `json:"application" gorm:"foreignKey:ApplicationID"`
	Mentor      *User                 `json:"mentor" gorm:"foreignKey:MentorID"`
}

// VolunteerApplication represents a visitor's application to become a volunteer
type VolunteerApplication struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	FirstName       string         `json:"first_name" gorm:"not null"`
	LastName        string         `json:"last_name" gorm:"not null"`
	Email           string         `json:"email" gorm:"not null;uniqueIndex"`
	Phone           string         `json:"phone"`
	Skills          string         `json:"skills" gorm:"type:text"`
	Experience      string         `json:"experience" gorm:"type:text"`
	Availability    string         `json:"availability" gorm:"type:text"`
	Password        string         `json:"-" gorm:"not null"`
	TermsAccepted   bool           `json:"terms_accepted" gorm:"default:false"`
	FirstLogin      bool           `json:"first_login" gorm:"default:true"`
	Status          string         `json:"status" gorm:"default:'pending'"`
	RejectionReason string         `json:"rejection_reason" gorm:"type:text"`
	ApprovedAt      *time.Time     `json:"approved_at" gorm:"index"`
	ApprovedBy      *uint          `json:"approved_by"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	ApprovedByUser *User `json:"approved_by_user" gorm:"foreignKey:ApprovedBy"`
}

// TableName specifies the table name
func (VolunteerApplication) TableName() string {
	return "volunteer_applications"
}

// GetSkillsArray returns skills as a slice
func (va *VolunteerApplication) GetSkillsArray() []string {
	if va.Skills == "" {
		return []string{}
	}
	// Split by comma and trim spaces
	skills := []string{}
	for _, skill := range strings.Split(va.Skills, ",") {
		if trimmed := strings.TrimSpace(skill); trimmed != "" {
			skills = append(skills, trimmed)
		}
	}
	return skills
}

// GetAvailabilityArray returns availability as a slice
func (va *VolunteerApplication) GetAvailabilityArray() []string {
	if va.Availability == "" {
		return []string{}
	}
	// Split by comma and trim spaces
	availability := []string{}
	for _, avail := range strings.Split(va.Availability, ",") {
		if trimmed := strings.TrimSpace(avail); trimmed != "" {
			availability = append(availability, trimmed)
		}
	}
	return availability
}

// VolunteerShift represents a volunteer's assignment to a specific shift
type VolunteerShift struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	VolunteerID uint           `json:"volunteer_id" gorm:"not null;index"`
	ShiftID     uint           `json:"shift_id" gorm:"not null;index"`
	Status      string         `json:"status" gorm:"type:varchar(50);not null;default:'assigned'"`
	AssignedAt  time.Time      `json:"assigned_at" gorm:"not null"`
	ConfirmedAt *time.Time     `json:"confirmed_at,omitempty"`
	CompletedAt *time.Time     `json:"completed_at,omitempty"`
	CancelledAt *time.Time     `json:"cancelled_at,omitempty"`
	Notes       string         `json:"notes" gorm:"type:text"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`

	// Relationships
	Volunteer User  `json:"volunteer" gorm:"foreignKey:VolunteerID"`
	Shift     Shift `json:"shift" gorm:"foreignKey:ShiftID"`
}

// TableName returns the table name for VolunteerShift
func (VolunteerShift) TableName() string {
	return "volunteer_shifts"
}

// BeforeCreate sets default values before creating a volunteer shift
func (vs *VolunteerShift) BeforeCreate(tx *gorm.DB) error {
	if vs.Status == "" {
		vs.Status = VolunteerShiftStatusAssigned
	}
	if vs.AssignedAt.IsZero() {
		vs.AssignedAt = time.Now()
	}
	return nil
}

// Confirm marks the volunteer shift as confirmed
func (vs *VolunteerShift) Confirm() {
	vs.Status = VolunteerShiftStatusConfirmed
	now := time.Now()
	vs.ConfirmedAt = &now
	vs.UpdatedAt = now
}

// Complete marks the volunteer shift as completed
func (vs *VolunteerShift) Complete() {
	vs.Status = VolunteerShiftStatusCompleted
	now := time.Now()
	vs.CompletedAt = &now
	vs.UpdatedAt = now
}

// Cancel marks the volunteer shift as cancelled
func (vs *VolunteerShift) Cancel(reason string) {
	vs.Status = VolunteerShiftStatusCancelled
	now := time.Now()
	vs.CancelledAt = &now
	if reason != "" {
		if vs.Notes != "" {
			vs.Notes += "\nCancellation reason: " + reason
		} else {
			vs.Notes = "Cancellation reason: " + reason
		}
	}
	vs.UpdatedAt = now
}

// MarkNoShow marks the volunteer shift as no-show
func (vs *VolunteerShift) MarkNoShow(reason string) {
	vs.Status = VolunteerShiftStatusNoShow
	now := time.Now()
	vs.CancelledAt = &now // Use CancelledAt for no-show as well
	if reason != "" {
		if vs.Notes != "" {
			vs.Notes += "\nNo-show reason: " + reason
		} else {
			vs.Notes = "No-show reason: " + reason
		}
	}
	vs.UpdatedAt = now
}

// IsActive returns true if the shift is in an active state
func (vs *VolunteerShift) IsActive() bool {
	return vs.Status == VolunteerShiftStatusAssigned || vs.Status == VolunteerShiftStatusConfirmed
}

// IsCompleted returns true if the shift has been completed
func (vs *VolunteerShift) IsCompleted() bool {
	return vs.Status == VolunteerShiftStatusCompleted
}

// IsCancelled returns true if the shift has been cancelled or marked as no-show
func (vs *VolunteerShift) IsCancelled() bool {
	return vs.Status == VolunteerShiftStatusCancelled || vs.Status == VolunteerShiftStatusNoShow
}

// GetDuration returns the duration of the shift if both start and end times are available
func (vs *VolunteerShift) GetDuration() *time.Duration {
	if vs.CompletedAt != nil && !vs.AssignedAt.IsZero() {
		duration := vs.CompletedAt.Sub(vs.AssignedAt)
		return &duration
	}
	return nil
}

// VolunteerNote represents notes specific to volunteers
type VolunteerNote struct {
	ID          uint             `gorm:"primarykey" json:"id"`
	VolunteerID uint             `json:"volunteer_id" gorm:"not null;index"`
	Volunteer   VolunteerProfile `json:"volunteer" gorm:"foreignKey:VolunteerID"`
	CreatedByID uint             `json:"created_by_id" gorm:"not null"`
	CreatedBy   User             `json:"created_by" gorm:"foreignKey:CreatedByID"`
	Content     string           `json:"content" gorm:"type:text;not null"`
	Type        string           `json:"type" gorm:"type:varchar(50);not null"`              // e.g., "performance", "feedback", "incident"
	Visibility  string           `json:"visibility" gorm:"type:varchar(20);default:'admin'"` // admin, volunteer, all
	IsImportant bool             `json:"is_important" gorm:"default:false"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}

// UserNote represents a note attached to any user's profile
type UserNote struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"not null;index"`
	AuthorID  uint      `json:"author_id" gorm:"not null"`
	Content   string    `json:"content" gorm:"type:text;not null"`
	Type      string    `json:"type" gorm:"type:varchar(50);not null"` // e.g., "general", "incident", "feedback", "volunteer"
	Category  string    `json:"category" gorm:"type:varchar(50)"`      // e.g., "performance", "training", "behavior"
	IsPrivate bool      `json:"is_private" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relationships
	User   User `json:"user" gorm:"foreignKey:UserID"`
	Author User `json:"author" gorm:"foreignKey:AuthorID"`
}

// TableName specifies the table name
func (UserNote) TableName() string {
	return "user_notes"
}

// Task represents a task assigned to volunteers
type Task struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	Title          string         `json:"title" binding:"required"`
	Description    string         `json:"description"`
	Status         string         `json:"status" gorm:"default:'pending'"`  // pending, in_progress, completed
	Priority       string         `json:"priority" gorm:"default:'medium'"` // low, medium, high
	DueDate        *time.Time     `json:"due_date"`
	AssignedUserID *uint          `json:"assigned_user_id"`
	AssignedUser   *User          `json:"assigned_user,omitempty" gorm:"foreignKey:AssignedUserID"`
	CreatedByID    uint           `json:"created_by_id"`
	CreatedBy      User           `json:"created_by" gorm:"foreignKey:CreatedByID"`
	CompletedAt    *time.Time     `json:"completed_at"`
	EstimatedHours *float64       `json:"estimated_hours"`
	ActualHours    *float64       `json:"actual_hours"`
	Notes          string         `json:"notes"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`
}

// TrainingModule represents a training course/module
type TrainingModule struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	Name         string         `json:"name" binding:"required"`
	Title        string         `json:"title" binding:"required"` // Display title for the module
	Description  string         `json:"description"`
	Content      string         `json:"content"`  // Could be markdown or HTML
	Duration     int            `json:"duration"` // Duration in minutes
	Required     bool           `json:"required" gorm:"default:false"`
	ExpiryMonths int            `json:"expiry_months"` // How many months before renewal needed
	Active       bool           `json:"active" gorm:"default:true"`
	CreatedByID  uint           `json:"created_by_id"`
	CreatedBy    User           `json:"created_by" gorm:"foreignKey:CreatedByID"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

// UserTraining represents a user's completion of a training module
type UserTraining struct {
	ID               uint           `gorm:"primarykey" json:"id"`
	UserID           uint           `json:"user_id"`
	User             User           `json:"user" gorm:"foreignKey:UserID"`
	TrainingModuleID uint           `json:"training_module_id"`
	TrainingModule   TrainingModule `json:"training_module" gorm:"foreignKey:TrainingModuleID"`
	Status           string         `json:"status" gorm:"default:'not_started'"` // not_started, in_progress, completed, expired
	CompletedAt      *time.Time     `json:"completed_at"`
	ExpiresAt        *time.Time     `json:"expires_at"`
	Score            *int           `json:"score"`           // Optional score if there's a test
	CertificateURL   string         `json:"certificate_url"` // URL to certificate if generated
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
}

// Announcement represents system announcements
type Announcement struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	Title       string         `json:"title" binding:"required"`
	Content     string         `json:"content" binding:"required"`
	Priority    string         `json:"priority" gorm:"default:'medium'"` // low, medium, high
	TargetRole  string         `json:"target_role"`                      // All, Admin, Volunteer, Donor, Visitor
	Active      bool           `json:"active" gorm:"default:true"`
	ExpiresAt   *time.Time     `json:"expires_at"`
	CreatedByID uint           `json:"created_by_id"`
	CreatedBy   User           `json:"created_by" gorm:"foreignKey:CreatedByID"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// AnnouncementRead tracks which users have read which announcements
type AnnouncementRead struct {
	ID             uint         `gorm:"primarykey" json:"id"`
	UserID         uint         `json:"user_id"`
	User           User         `json:"user" gorm:"foreignKey:UserID"`
	AnnouncementID uint         `json:"announcement_id"`
	Announcement   Announcement `json:"announcement" gorm:"foreignKey:AnnouncementID"`
	ReadAt         time.Time    `json:"read_at"`
	CreatedAt      time.Time    `json:"created_at"`
}

// NotificationSettings represents user notification preferences
type NotificationSettings struct {
	ID                 uint      `gorm:"primarykey" json:"id"`
	UserID             uint      `json:"user_id" gorm:"uniqueIndex"`
	User               User      `json:"user" gorm:"foreignKey:UserID"`
	EmailNotifications bool      `json:"emailNotifications" gorm:"default:true"`
	SMSNotifications   bool      `json:"smsNotifications" gorm:"default:false"`
	ShiftReminders     bool      `json:"shiftReminders" gorm:"default:true"`
	TaskAssignments    bool      `json:"taskAssignments" gorm:"default:true"`
	Announcements      bool      `json:"announcements" gorm:"default:true"`
	Achievements       bool      `json:"achievements" gorm:"default:true"`
	PushUrgent         bool      `json:"push_urgent" gorm:"default:true"`
	PushReminders      bool      `json:"push_reminders" gorm:"default:true"`
	PushMessages       bool      `json:"push_messages" gorm:"default:false"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// Helper methods for VolunteerProfile role management

// IsGeneral returns true if volunteer is general level
func (vp *VolunteerProfile) IsGeneral() bool {
	return vp.RoleLevel == VolunteerRoleGeneral
}

// IsSpecialized returns true if volunteer is specialized level
func (vp *VolunteerProfile) IsSpecialized() bool {
	return vp.RoleLevel == VolunteerRoleSpecialized
}

// IsLead returns true if volunteer is lead level
func (vp *VolunteerProfile) IsLead() bool {
	return vp.RoleLevel == VolunteerRoleLead
}

// CanManageTeam returns true if volunteer can manage team members
func (vp *VolunteerProfile) CanManageTeam() bool {
	return vp.IsLead() && vp.CanManageShifts
}

// CanTrainVolunteers returns true if volunteer can train others
func (vp *VolunteerProfile) CanTrainVolunteers() bool {
	return (vp.IsSpecialized() || vp.IsLead()) && vp.CanTrainOthers
}

// CanHandleEmergencies returns true if volunteer is qualified for emergency response
func (vp *VolunteerProfile) CanHandleEmergencies() bool {
	return vp.EmergencyResponse && (vp.IsSpecialized() || vp.IsLead())
}

// GetSpecializationsArray returns specializations as a slice
func (vp *VolunteerProfile) GetSpecializationsArray() []string {
	if vp.Specializations == "" {
		return []string{}
	}
	// Parse JSON array or comma-separated values
	specializations := []string{}
	for _, spec := range strings.Split(vp.Specializations, ",") {
		if trimmed := strings.TrimSpace(spec); trimmed != "" {
			specializations = append(specializations, trimmed)
		}
	}
	return specializations
}

// GetTeamMembersArray returns team member IDs as a slice
func (vp *VolunteerProfile) GetTeamMembersArray() []string {
	if vp.TeamMembers == "" {
		return []string{}
	}
	// Parse JSON array or comma-separated values
	members := []string{}
	for _, member := range strings.Split(vp.TeamMembers, ",") {
		if trimmed := strings.TrimSpace(member); trimmed != "" {
			members = append(members, trimmed)
		}
	}
	return members
}

// PromoteToSpecialized promotes a general volunteer to specialized
func (vp *VolunteerProfile) PromoteToSpecialized(specializations []string) {
	vp.RoleLevel = VolunteerRoleSpecialized
	vp.Specializations = strings.Join(specializations, ",")
	vp.UpdatedAt = time.Now()
}

// PromoteToLead promotes a volunteer to lead role
func (vp *VolunteerProfile) PromoteToLead(enableManagement, enableTraining, enableEmergency bool) {
	vp.RoleLevel = VolunteerRoleLead
	vp.CanManageShifts = enableManagement
	vp.CanTrainOthers = enableTraining
	vp.EmergencyResponse = enableEmergency
	vp.UpdatedAt = time.Now()
}

// DemoteToGeneral demotes volunteer back to general role
func (vp *VolunteerProfile) DemoteToGeneral() {
	vp.RoleLevel = VolunteerRoleGeneral
	vp.Specializations = ""
	vp.LeadershipSkills = ""
	vp.TeamMembers = ""
	vp.CanTrainOthers = false
	vp.CanManageShifts = false
	vp.EmergencyResponse = false
	vp.UpdatedAt = time.Now()
}

// GetRolePermissions returns the permissions for the volunteer's role level
func (vp *VolunteerProfile) GetRolePermissions() map[string]bool {
	permissions := map[string]bool{
		"can_view_shifts":      true,
		"can_signup_shifts":    true,
		"can_checkin_visitors": true,
		"can_view_performance": true,
		"can_update_profile":   true,
	}

	if vp.IsSpecialized() || vp.IsLead() {
		permissions["can_view_specialized_shifts"] = true
		permissions["can_assist_complex_cases"] = true
		permissions["can_provide_specialized_services"] = true
	}

	if vp.IsLead() {
		permissions["can_manage_team"] = vp.CanManageShifts
		permissions["can_train_volunteers"] = vp.CanTrainOthers
		permissions["can_coordinate_emergency"] = vp.EmergencyResponse
		permissions["can_assign_tasks"] = vp.CanManageShifts
		permissions["can_approve_time_off"] = vp.CanManageShifts
		permissions["can_view_team_performance"] = vp.CanManageShifts
	}

	return permissions
}

// VolunteerTeam represents a team structure for lead volunteers
type VolunteerTeam struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	Name        string         `json:"name" binding:"required"`
	Description string         `json:"description"`
	LeadID      uint           `json:"lead_id"`
	Lead        User           `json:"lead" gorm:"foreignKey:LeadID"`
	Members     string         `json:"members"` // JSON array of volunteer IDs
	Active      bool           `json:"active" gorm:"default:true"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// VolunteerTask represents tasks assigned to volunteers
type VolunteerTask struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	Title       string         `json:"title" binding:"required"`
	Description string         `json:"description"`
	AssignedTo  uint           `json:"assigned_to"`
	AssignedBy  uint           `json:"assigned_by"`
	Priority    string         `json:"priority" gorm:"default:'medium'"` // low, medium, high
	Status      string         `json:"status" gorm:"default:'pending'"`  // pending, in_progress, completed, cancelled
	DueDate     *time.Time     `json:"due_date"`
	CompletedAt *time.Time     `json:"completed_at"`
	Notes       string         `json:"notes"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Volunteer User `json:"volunteer" gorm:"foreignKey:AssignedTo"`
	Assigner  User `json:"assigner" gorm:"foreignKey:AssignedBy"`
}

// VolunteerMentorship represents mentorship relationships
type VolunteerMentorship struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	MentorID  uint           `json:"mentor_id"`
	MenteeID  uint           `json:"mentee_id"`
	StartDate time.Time      `json:"start_date"`
	EndDate   *time.Time     `json:"end_date"`
	Status    string         `json:"status" gorm:"default:'active'"` // active, completed, terminated
	Notes     string         `json:"notes"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Mentor User `json:"mentor" gorm:"foreignKey:MentorID"`
	Mentee User `json:"mentee" gorm:"foreignKey:MenteeID"`
}
