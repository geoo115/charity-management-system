package shared

import (
	"fmt"
	"time"
)

// GetNextTicketReleaseDate returns a human-readable next ticket release date.
// This is a minimal, handler-agnostic helper moved here to avoid import cycles
func GetNextTicketReleaseDate() string {
	// For backwards compatibility with previous handlers, return a formatted date
	next := time.Now().AddDate(0, 0, 1)
	return next.Format("Monday, January 2, 2006 at 15:04")
}

// GenerateTicketNumber generates a short ticket number used by handlers and services
func GenerateTicketNumber() string {
	return fmt.Sprintf("TKT-%d", time.Now().Unix()%1000000)
}
