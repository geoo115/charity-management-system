package models

import (
	"errors"
	"strings"
	"unicode"
)

// ValidatePassword checks password strength. Returns nil if acceptable.
func ValidatePassword(pw string) error {
	if len(pw) < 12 {
		return errors.New("password must be at least 12 characters")
	}

	var hasUpper, hasLower, hasDigit, hasSpecial bool
	for _, r := range pw {
		switch {
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsLower(r):
			hasLower = true
		case unicode.IsDigit(r):
			hasDigit = true
		default:
			if unicode.IsPunct(r) || unicode.IsSymbol(r) {
				hasSpecial = true
			}
		}
	}

	if !hasUpper || !hasLower || !hasDigit || !hasSpecial {
		return errors.New("password must include upper, lower, digit and special character")
	}

	// Reject very common passwords
	lower := strings.ToLower(strings.TrimSpace(pw))
	common := []string{"password", "123456", "123456789", "qwerty", "letmein", "welcome"}
	for _, c := range common {
		if strings.Contains(lower, c) {
			return errors.New("password is too common")
		}
	}

	return nil
}
