package db

import (
	"log"

	"gorm.io/gorm"
)

// createIndexes creates additional indexes for better performance
func createIndexes(db *gorm.DB) error {
	log.Println("Creating database indexes...")

	indexes := []struct {
		name  string
		query string
	}{
		// User indexes
		{"idx_users_email", "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"},
		{"idx_users_role", "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)"},
		{"idx_users_status", "CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)"},
		{"idx_users_postcode", "CREATE INDEX IF NOT EXISTS idx_users_postcode ON users(postcode)"},

		// Help request indexes
		{"idx_help_requests_category", "CREATE INDEX IF NOT EXISTS idx_help_requests_category ON help_requests(category)"},
		{"idx_help_requests_status", "CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status)"},
		{"idx_help_requests_postcode", "CREATE INDEX IF NOT EXISTS idx_help_requests_postcode ON help_requests(postcode)"},
		{"idx_help_requests_visit_day", "CREATE INDEX IF NOT EXISTS idx_help_requests_visit_day ON help_requests(visit_day)"},
		{"idx_help_requests_visitor_id", "CREATE INDEX IF NOT EXISTS idx_help_requests_visitor_id ON help_requests(visitor_id)"},

		// Ticket indexes
		{"idx_tickets_visitor_id", "CREATE INDEX IF NOT EXISTS idx_tickets_visitor_id ON tickets(visitor_id)"},
		{"idx_tickets_status", "CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)"},
		{"idx_tickets_visit_date", "CREATE INDEX IF NOT EXISTS idx_tickets_visit_date ON tickets(visit_date)"},
		{"idx_tickets_ticket_number", "CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number)"},

		// Shift indexes
		{"idx_shifts_date", "CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date)"},
		{"idx_shifts_location", "CREATE INDEX IF NOT EXISTS idx_shifts_location ON shifts(location)"},
		{"idx_shifts_assigned_volunteer", "CREATE INDEX IF NOT EXISTS idx_shifts_assigned_volunteer ON shifts(assigned_volunteer_id)"},

		// Shift assignment indexes
		{"idx_shift_assignments_shift_id", "CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift_id ON shift_assignments(shift_id)"},
		{"idx_shift_assignments_user_id", "CREATE INDEX IF NOT EXISTS idx_shift_assignments_user_id ON shift_assignments(user_id)"},
		{"idx_shift_assignments_status", "CREATE INDEX IF NOT EXISTS idx_shift_assignments_status ON shift_assignments(status)"},

		// Donation indexes
		{"idx_donations_type", "CREATE INDEX IF NOT EXISTS idx_donations_type ON donations(type)"},
		{"idx_donations_status", "CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status)"},
		{"idx_donations_contact_email", "CREATE INDEX IF NOT EXISTS idx_donations_contact_email ON donations(contact_email)"},
		{"idx_donations_donor_id", "CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id)"},

		// Document indexes
		{"idx_documents_user_id", "CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)"},
		{"idx_documents_type", "CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type)"},
		{"idx_documents_status", "CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)"},

		// Verification indexes
		{"idx_verifications_user_id", "CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON verifications(user_id)"},
		{"idx_verifications_type", "CREATE INDEX IF NOT EXISTS idx_verifications_type ON verifications(type)"},
		{"idx_verifications_token", "CREATE INDEX IF NOT EXISTS idx_verifications_token ON verifications(token)"},

		// Visit capacity indexes
		{"idx_visit_capacity_date", "CREATE INDEX IF NOT EXISTS idx_visit_capacity_date ON visit_capacities(date)"},
		{"idx_visit_capacity_operating", "CREATE INDEX IF NOT EXISTS idx_visit_capacity_operating ON visit_capacities(is_operating_day)"},

		// Visit indexes
		{"idx_visits_visitor_id", "CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON visits(visitor_id)"},
		{"idx_visits_ticket_id", "CREATE INDEX IF NOT EXISTS idx_visits_ticket_id ON visits(ticket_id)"},
		{"idx_visits_status", "CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status)"},
		{"idx_visits_check_in_time", "CREATE INDEX IF NOT EXISTS idx_visits_check_in_time ON visits(check_in_time)"},

		// Queue entry indexes
		{"idx_queue_entries_visitor_id", "CREATE INDEX IF NOT EXISTS idx_queue_entries_visitor_id ON queue_entries(visitor_id)"},
		{"idx_queue_entries_help_request_id", "CREATE INDEX IF NOT EXISTS idx_queue_entries_help_request_id ON queue_entries(help_request_id)"},
		{"idx_queue_entries_status", "CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON queue_entries(status)"},
		{"idx_queue_entries_position", "CREATE INDEX IF NOT EXISTS idx_queue_entries_position ON queue_entries(position)"},
		{"idx_queue_entries_priority", "CREATE INDEX IF NOT EXISTS idx_queue_entries_priority ON queue_entries(priority)"},
		{"idx_queue_entries_category", "CREATE INDEX IF NOT EXISTS idx_queue_entries_category ON queue_entries(category)"},

		// Notification indexes
		{"idx_notifications_user_id", "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)"},
		{"idx_notifications_read", "CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)"},

		// Audit log indexes
		{"idx_audit_logs_entity_type", "CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type)"},
		{"idx_audit_logs_entity_id", "CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id)"},
		{"idx_audit_logs_performed_by", "CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by)"},

		// Feedback indexes
		{"idx_feedback_user_id", "CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id)"},
		{"idx_feedback_type", "CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type)"},
		{"idx_feedback_status", "CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status)"},

		// Visit feedback indexes
		{"idx_visit_feedback_visitor_id", "CREATE INDEX IF NOT EXISTS idx_visit_feedback_visitor_id ON visit_feedbacks(visitor_id)"},
		{"idx_visit_feedback_visit_id", "CREATE INDEX IF NOT EXISTS idx_visit_feedback_visit_id ON visit_feedbacks(visit_id)"},
		{"idx_visit_feedback_help_request_id", "CREATE INDEX IF NOT EXISTS idx_visit_feedback_help_request_id ON visit_feedbacks(help_request_id)"},
		{"idx_visit_feedback_overall_rating", "CREATE INDEX IF NOT EXISTS idx_visit_feedback_overall_rating ON visit_feedbacks(overall_rating)"},
		{"idx_visit_feedback_service_category", "CREATE INDEX IF NOT EXISTS idx_visit_feedback_service_category ON visit_feedbacks(service_category)"},
		{"idx_visit_feedback_status", "CREATE INDEX IF NOT EXISTS idx_visit_feedback_status ON visit_feedbacks(status)"},

		// Volunteer role indexes
		{"idx_volunteer_profiles_role_level", "CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_role_level ON volunteer_profiles(role_level)"},
		{"idx_volunteer_profiles_mentor_id", "CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_mentor_id ON volunteer_profiles(mentor_id)"},
		{"idx_volunteer_teams_lead_id", "CREATE INDEX IF NOT EXISTS idx_volunteer_teams_lead_id ON volunteer_teams(lead_id)"},
		{"idx_volunteer_tasks_assigned_to", "CREATE INDEX IF NOT EXISTS idx_volunteer_tasks_assigned_to ON volunteer_tasks(assigned_to)"},
		{"idx_volunteer_tasks_assigned_by", "CREATE INDEX IF NOT EXISTS idx_volunteer_tasks_assigned_by ON volunteer_tasks(assigned_by)"},
		{"idx_volunteer_tasks_status", "CREATE INDEX IF NOT EXISTS idx_volunteer_tasks_status ON volunteer_tasks(status)"},
		{"idx_volunteer_mentorships_mentor_id", "CREATE INDEX IF NOT EXISTS idx_volunteer_mentorships_mentor_id ON volunteer_mentorships(mentor_id)"},
		{"idx_volunteer_mentorships_mentee_id", "CREATE INDEX IF NOT EXISTS idx_volunteer_mentorships_mentee_id ON volunteer_mentorships(mentee_id)"},
	}

	var failed []string
	for _, index := range indexes {
		if err := db.Exec(index.query).Error; err != nil {
			log.Printf("Warning: Failed to create index %s: %v", index.name, err)
			failed = append(failed, index.name)
		}
	}

	if len(failed) > 0 {
		log.Printf("Failed to create %d indexes: %v", len(failed), failed)
		// Don't return error - indexes are not critical for basic functionality
	} else {
		log.Printf("Successfully created %d database indexes", len(indexes))
	}

	return nil
}
