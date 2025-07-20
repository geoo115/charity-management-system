package models

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// ConfigValue represents a strongly-typed configuration value
type ConfigValue struct {
	StringValue string
	IntValue    int
	BoolValue   bool
	JSONValue   map[string]interface{}
	FloatValue  float64
	DateValue   time.Time
	TimeValue   time.Time
}

// SystemConfig stores system-wide configuration
type SystemConfig struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Key         string         `json:"key" gorm:"uniqueIndex;not null"`
	Value       string         `json:"value" gorm:"not null"`
	Type        string         `json:"type" gorm:"default:'string'"` // string, int, bool, json
	Category    string         `json:"category"`
	Description string         `json:"description"`
	IsPublic    bool           `json:"is_public" gorm:"default:false"`
	IsReadOnly  bool           `json:"is_read_only" gorm:"default:false"`
	UpdatedBy   *uint          `json:"updated_by"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	UpdatedByUser *User `json:"updated_by_user" gorm:"foreignKey:UpdatedBy"`
}

// GetValue returns the typed configuration value
func (sc *SystemConfig) GetValue() ConfigValue {
	switch sc.Type {
	case ConfigTypeInt:
		var val int
		fmt.Sscanf(sc.Value, "%d", &val)
		return ConfigValue{IntValue: val}
	case ConfigTypeBool:
		return ConfigValue{BoolValue: sc.Value == "true"}
	case ConfigTypeFloat:
		var val float64
		fmt.Sscanf(sc.Value, "%f", &val)
		return ConfigValue{FloatValue: val}
	case ConfigTypeJSON:
		// Simple placeholder - would need proper JSON parsing in real implementation
		return ConfigValue{JSONValue: map[string]interface{}{"raw": sc.Value}}
	default:
		return ConfigValue{StringValue: sc.Value}
	}
}

// SetValue sets the configuration value with the appropriate type
func (sc *SystemConfig) SetValue(value interface{}) {
	switch v := value.(type) {
	case int:
		sc.Type = ConfigTypeInt
		sc.Value = fmt.Sprintf("%d", v)
	case bool:
		sc.Type = ConfigTypeBool
		sc.Value = fmt.Sprintf("%t", v)
	case float64:
		sc.Type = ConfigTypeFloat
		sc.Value = fmt.Sprintf("%f", v)
	case map[string]interface{}:
		sc.Type = ConfigTypeJSON
		// Simple placeholder - would need proper JSON marshaling in real implementation
		sc.Value = fmt.Sprintf("%v", v)
	default:
		sc.Type = ConfigTypeString
		sc.Value = fmt.Sprintf("%v", v)
	}
}

// Note: SystemSetting has been removed as it was duplicating SystemConfig functionality
