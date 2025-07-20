package models

import (
	"time"

	"gorm.io/gorm"
)

// Donation status values
const (
	DonationStatusPending   = "pending"
	DonationStatusReceived  = "received"
	DonationStatusProcessed = "processed"
	DonationStatusCancelled = "cancelled"
)

// Donation represents a donation made to the organization
type Donation struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	UserID         *uint          `json:"user_id" gorm:"index"` // Added for payment handler compatibility
	DonorID        *uint          `json:"donor_id" gorm:"index"`
	Name           string         `json:"name"` // Name of the donor
	ContactEmail   string         `json:"contact_email"`
	ContactPhone   string         `json:"contact_phone"`
	Type           string         `json:"type" gorm:"index"` // money, goods, time, etc.
	Amount         float64        `json:"amount"`            // For monetary donations
	Currency       string         `json:"currency" gorm:"default:GBP"`
	Goods          string         `json:"goods"` // Description of goods donated
	GoodsList      []DonationItem `json:"goods_list" gorm:"-"`
	GoodsValue     float64        `json:"goods_value"` // Estimated value of goods
	Description    string         `json:"description"`
	PaymentMethod  string         `json:"payment_method"` // cash, card, bank transfer
	PaymentID      string         `json:"payment_id"`     // External payment reference
	DropoffDate    *time.Time     `json:"dropoff_date"`
	PickupTime     *time.Time     `json:"pickup_time" gorm:"index"`
	Status         string         `json:"status" gorm:"default:pending;index"`
	ImpactScore    int            `json:"impact_score"` // Calculated impact score
	Quantity       int            `json:"quantity"`     // Number of items for goods donations
	ReceiptSent    bool           `json:"receipt_sent"`
	IsAnonymous    bool           `json:"is_anonymous"`
	IsRecurring    bool           `json:"is_recurring" gorm:"default:false"` // Added for payment handler
	SubscriptionID string         `json:"subscription_id,omitempty"`         // Added for payment handler
	Notes          string         `json:"notes"`
	ReceivedBy     *uint          `json:"received_by"`
	ReceivedAt     *time.Time     `json:"received_at"`
	ProcessedBy    *uint          `json:"processed_by"`
	ProcessedAt    *time.Time     `json:"processed_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	User            *User `json:"user,omitempty" gorm:"foreignKey:UserID"` // Added for payment handler compatibility
	Donor           *User `json:"donor,omitempty" gorm:"foreignKey:DonorID"`
	ReceivedByUser  *User `json:"received_by_user,omitempty" gorm:"foreignKey:ReceivedBy"`
	ProcessedByUser *User `json:"processed_by_user,omitempty" gorm:"foreignKey:ProcessedBy"`
}

// DonationItem represents an individual item in a goods donation
type DonationItem struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	DonationID   uint           `json:"donation_id" gorm:"index"`
	Name         string         `json:"name"`
	Category     string         `json:"category"`
	Quantity     int            `json:"quantity"`
	Condition    string         `json:"condition"`
	Value        float64        `json:"value"`
	Description  string         `json:"description"`
	Status       string         `json:"status" gorm:"default:received"`
	InventoryTag string         `json:"inventory_tag"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Donation Donation `json:"-" gorm:"foreignKey:DonationID"`
}

// DonationAppeal represents fundraising campaigns
type DonationAppeal struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	Title         string         `json:"title" gorm:"not null"`
	Description   string         `json:"description" gorm:"type:text"`
	TargetAmount  float64        `json:"target_amount"`
	CurrentAmount float64        `json:"current_amount" gorm:"default:0"`
	Category      string         `json:"category"`
	UrgencyLevel  string         `json:"urgency_level" gorm:"default:'Medium'"`
	StartDate     time.Time      `json:"start_date"`
	EndDate       time.Time      `json:"end_date"`
	IsActive      bool           `json:"is_active" gorm:"default:true"`
	CreatedBy     uint           `json:"created_by"`
	ImageURL      string         `json:"image_url"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	CreatedByUser User       `json:"created_by_user" gorm:"foreignKey:CreatedBy"`
	Donations     []Donation `json:"donations" gorm:"many2many:appeal_donations;"`
}

// RecurringDonation tracks recurring donation setups
type RecurringDonation struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	DonorID          uint           `json:"donor_id" gorm:"not null;index"`
	Amount           float64        `json:"amount" gorm:"not null"`
	Currency         string         `json:"currency" gorm:"default:'GBP'"`
	Frequency        string         `json:"frequency" gorm:"not null"` // monthly, quarterly, annual
	NextPaymentDate  time.Time      `json:"next_payment_date"`
	PaymentMethod    string         `json:"payment_method"`
	StripeCustomerID string         `json:"stripe_customer_id"`
	IsActive         bool           `json:"is_active" gorm:"default:true"`
	StartDate        time.Time      `json:"start_date"`
	EndDate          *time.Time     `json:"end_date"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Donor User `json:"donor" gorm:"foreignKey:DonorID"`
}

// UrgentNeed represents urgent donation needs tracking in the system with enhanced inventory management
type UrgentNeed struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Name         string         `json:"name" gorm:"not null;index"`      // Item name (e.g., "Phones", "Laptops")
	Category     string         `json:"category" gorm:"not null;index"`  // General category (e.g., "Electronics", "Clothing")
	Description  string         `json:"description" gorm:"type:text"`    // Detailed description of the need
	CurrentStock int            `json:"current_stock" gorm:"default:0"`  // Current inventory level
	TargetStock  int            `json:"target_stock" gorm:"not null"`    // Target inventory level needed
	Urgency      string         `json:"urgency" gorm:"default:'Medium'"` // Low, Medium, High, Critical
	Status       string         `json:"status" gorm:"default:'active'"`  // active, fulfilled, cancelled
	RequestedBy  uint           `json:"requested_by" gorm:"index"`
	AssignedTo   *uint          `json:"assigned_to" gorm:"index"`
	DueDate      *time.Time     `json:"due_date"`
	FulfilledAt  *time.Time     `json:"fulfilled_at"`
	FulfilledBy  *uint          `json:"fulfilled_by"`
	Notes        string         `json:"notes" gorm:"type:text"`
	IsPublic     bool           `json:"is_public" gorm:"default:true"`      // Public by default for donor visibility
	LastUpdated  time.Time      `json:"last_updated" gorm:"autoUpdateTime"` // Real-time tracking
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	RequestedByUser *User `json:"requested_by_user" gorm:"foreignKey:RequestedBy"`
	AssignedToUser  *User `json:"assigned_to_user" gorm:"foreignKey:AssignedTo"`
	FulfilledByUser *User `json:"fulfilled_by_user" gorm:"foreignKey:FulfilledBy"`
}

// TableName specifies the table name
func (UrgentNeed) TableName() string {
	return "urgent_needs"
}

// IsLowStock returns true if current stock is below 30% of target
func (un *UrgentNeed) IsLowStock() bool {
	if un.TargetStock == 0 {
		return false
	}
	return float64(un.CurrentStock)/float64(un.TargetStock) < 0.3
}

// IsCriticalStock returns true if current stock is below 10% of target
func (un *UrgentNeed) IsCriticalStock() bool {
	if un.TargetStock == 0 {
		return false
	}
	return float64(un.CurrentStock)/float64(un.TargetStock) < 0.1
}

// GetStockPercentage returns the stock percentage (0-100)
func (un *UrgentNeed) GetStockPercentage() float64 {
	if un.TargetStock == 0 {
		return 0
	}
	return (float64(un.CurrentStock) / float64(un.TargetStock)) * 100
}

// GetQuantityNeeded returns how many items are needed to reach target
func (un *UrgentNeed) GetQuantityNeeded() int {
	needed := un.TargetStock - un.CurrentStock
	if needed < 0 {
		return 0
	}
	return needed
}

// UpdateUrgencyFromStock automatically sets urgency based on stock levels
func (un *UrgentNeed) UpdateUrgencyFromStock() {
	stockPercentage := un.GetStockPercentage()

	switch {
	case stockPercentage < 10:
		un.Urgency = "Critical"
	case stockPercentage < 30:
		un.Urgency = "High"
	case stockPercentage < 70:
		un.Urgency = "Medium"
	default:
		un.Urgency = "Low"
	}
}

// Payment represents a payment transaction
type Payment struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	UserID          uint           `json:"user_id" gorm:"not null;index"`
	DonationID      *uint          `json:"donation_id" gorm:"index"`
	StripePaymentID string         `json:"stripe_payment_id"`
	Amount          float64        `json:"amount" gorm:"not null"`
	Currency        string         `json:"currency" gorm:"default:'GBP'"`
	Status          string         `json:"status" gorm:"not null"` // pending, succeeded, failed, canceled
	Type            string         `json:"type"`                   // donation, refund, etc.
	PaymentMethod   string         `json:"payment_method"`
	PaymentMethodID string         `json:"payment_method_id"`
	Description     string         `json:"description"`
	Metadata        string         `json:"metadata" gorm:"type:text"` // JSON metadata
	FailureReason   string         `json:"failure_reason"`
	RefundedAmount  float64        `json:"refunded_amount" gorm:"default:0"`
	RefundAmount    float64        `json:"refund_amount" gorm:"default:0"` // For compatibility
	ProcessedAt     *time.Time     `json:"processed_at"`
	CompletedAt     *time.Time     `json:"completed_at"`
	RefundedAt      *time.Time     `json:"refunded_at"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	User     User      `json:"user" gorm:"foreignKey:UserID"`
	Donation *Donation `json:"donation,omitempty" gorm:"foreignKey:DonationID"`
}

// Subscription represents a recurring payment subscription
type Subscription struct {
	ID                   uint           `gorm:"primaryKey" json:"id"`
	UserID               uint           `json:"user_id" gorm:"not null;index"`
	StripeSubscriptionID string         `json:"stripe_subscription_id"`
	Status               string         `json:"status" gorm:"not null"` // active, canceled, past_due, etc.
	Amount               float64        `json:"amount" gorm:"not null"`
	Currency             string         `json:"currency" gorm:"default:'GBP'"`
	Interval             string         `json:"interval" gorm:"not null"` // month, year
	IntervalCount        int            `json:"interval_count" gorm:"default:1"`
	PaymentMethodID      string         `json:"payment_method_id"`
	CurrentPeriodStart   time.Time      `json:"current_period_start"`
	CurrentPeriodEnd     time.Time      `json:"current_period_end"`
	CancelAt             *time.Time     `json:"cancel_at"`
	CanceledAt           *time.Time     `json:"canceled_at"`
	TrialStart           *time.Time     `json:"trial_start"`
	TrialEnd             *time.Time     `json:"trial_end"`
	NextPayment          time.Time      `json:"next_payment"`              // Next payment date
	Metadata             string         `json:"metadata" gorm:"type:text"` // JSON metadata
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
	DeletedAt            gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	User User `json:"user" gorm:"foreignKey:UserID"`
}
