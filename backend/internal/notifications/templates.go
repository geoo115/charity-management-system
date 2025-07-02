package notifications

// GetTemplateFilename returns the HTML template filename for a given template type
func (t TemplateType) GetTemplateFilename() string {
	switch t {
	case ShiftReminder:
		return "shift_reminder.html"
	case ShiftSignup:
		return "shift_signup.html"
	case ShiftCancellation:
		return "shift_cancellation.html"
	case UrgentCallout:
		return "urgent_callout.html"
	case HelpRequestSubmitted:
		return "help_request_submitted.html"
	case HelpRequestInProgress:
		return "help_request_in_progress.html"
	case DonationReceived:
		return "donation_received.html"
	case DropoffScheduled:
		return "dropoff_scheduled.html"
	case PasswordReset:
		return "password_reset.html"
	case AccountCreated:
		return "account_creation.html"
	case VolunteerApplication:
		return "volunteer_application.html"
	case VolunteerApproval:
		return "volunteer_approval.html"
	case VolunteerRejection:
		return "volunteer_rejection.html"
	case ApplicationSubmitted:
		return "application_submitted.html"
	case ApplicationUpdate:
		return "application_update.html"
	case SystemMaintenance:
		return "system_maintenance.html"
	case EmergencyAlert:
		return "emergency_alert.html"
	case ScheduleChange:
		return "schedule_change.html"
	default:
		return "default.html"
	}
}
