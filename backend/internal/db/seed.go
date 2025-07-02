package db

import (
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/geoo115/LDH/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedDatabase populates the database with comprehensive test data
func SeedDatabase(db *gorm.DB) error {
	log.Println("Starting comprehensive database seeding...")

	// Initialize admin user first using defaults.go
	if err := createDefaultAdmin(db); err != nil {
		return fmt.Errorf("failed to initialize admin: %w", err)
	}

	// Seed data in order due to foreign key dependencies
	if err := seedUsers(db); err != nil {
		return fmt.Errorf("failed to seed users: %w", err)
	}

	if err := seedVolunteerApplications(db); err != nil {
		return fmt.Errorf("failed to seed volunteer applications: %w", err)
	}

	if err := seedVolunteerProfiles(db); err != nil {
		return fmt.Errorf("failed to seed volunteer profiles: %w", err)
	}

	if err := seedStaffProfiles(db); err != nil {
		return fmt.Errorf("failed to seed staff profiles: %w", err)
	}

	if err := seedHelpRequests(db); err != nil {
		return fmt.Errorf("failed to seed help requests: %w", err)
	}

	if err := seedDonations(db); err != nil {
		return fmt.Errorf("failed to seed donations: %w", err)
	}

	if err := seedFeedback(db); err != nil {
		return fmt.Errorf("failed to seed feedback: %w", err)
	}

	if err := seedVisits(db); err != nil {
		return fmt.Errorf("failed to seed visits: %w", err)
	}

	if err := seedDocuments(db); err != nil {
		return fmt.Errorf("failed to seed documents: %w", err)
	}

	log.Println("Database seeding completed successfully!")
	return nil
}

// seedUsers creates a diverse set of users with different roles
func seedUsers(db *gorm.DB) error {
	// Check if users already exist (excluding admin)
	var count int64
	if err := db.Model(&models.User{}).Where("role != ?", models.RoleAdmin).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		log.Println("Users already exist, skipping user seeding")
		return nil
	}

	users := []models.User{
		// Visitors
		{
			FirstName:     "Sarah",
			LastName:      "Johnson",
			Email:         "sarah.johnson@example.com",
			Phone:         "07123456789",
			Role:          models.RoleVisitor,
			Status:        models.StatusActive,
			Address:       "123 High Street",
			City:          "London",
			Postcode:      "SE13 5AB",
			EmailVerified: true,
		},
		{
			FirstName:     "Michael",
			LastName:      "Brown",
			Email:         "michael.brown@example.com",
			Phone:         "07234567890",
			Role:          models.RoleVisitor,
			Status:        models.StatusActive,
			Address:       "456 Oak Avenue",
			City:          "London",
			Postcode:      "SE14 6CD",
			EmailVerified: true,
		},
		{
			FirstName:     "Emma",
			LastName:      "Wilson",
			Email:         "emma.wilson@example.com",
			Phone:         "07345678901",
			Role:          models.RoleVisitor,
			Status:        models.StatusActive,
			Address:       "789 Pine Road",
			City:          "London",
			Postcode:      "SE4 7EF",
			EmailVerified: true,
		},
		{
			FirstName:     "James",
			LastName:      "Davis",
			Email:         "james.davis@example.com",
			Phone:         "07456789012",
			Role:          models.RoleVisitor,
			Status:        models.StatusActive,
			Address:       "321 Elm Close",
			City:          "London",
			Postcode:      "SE6 8GH",
			EmailVerified: false,
		},
		{
			FirstName:     "Lisa",
			LastName:      "Miller",
			Email:         "lisa.miller@example.com",
			Phone:         "07567890123",
			Role:          models.RoleVisitor,
			Status:        models.StatusActive,
			Address:       "654 Maple Lane",
			City:          "London",
			Postcode:      "SE8 9IJ",
			EmailVerified: true,
		},
		// Volunteers
		{
			FirstName:     "David",
			LastName:      "Thompson",
			Email:         "david.thompson@example.com",
			Phone:         "07678901234",
			Role:          models.RoleVolunteer,
			Status:        models.StatusActive,
			Address:       "987 Birch Street",
			City:          "London",
			Postcode:      "BR1 2KL",
			EmailVerified: true,
		},
		{
			FirstName:     "Amy",
			LastName:      "Garcia",
			Email:         "amy.garcia@example.com",
			Phone:         "07789012345",
			Role:          models.RoleVolunteer,
			Status:        models.StatusActive,
			Address:       "147 Cedar Road",
			City:          "London",
			Postcode:      "BR3 3MN",
			EmailVerified: true,
		},
		{
			FirstName:     "Robert",
			LastName:      "Martinez",
			Email:         "robert.martinez@example.com",
			Phone:         "07890123456",
			Role:          models.RoleVolunteer,
			Status:        models.StatusActive,
			Address:       "258 Willow Avenue",
			City:          "London",
			Postcode:      "SE13 4OP",
			EmailVerified: true,
		},
		// Donors
		{
			FirstName:     "Jennifer",
			LastName:      "Anderson",
			Email:         "jennifer.anderson@example.com",
			Phone:         "07901234567",
			Role:          models.RoleDonor,
			Status:        models.StatusActive,
			Address:       "369 Ash Close",
			City:          "London",
			Postcode:      "SE14 5QR",
			EmailVerified: true,
		},
		{
			FirstName:     "Christopher",
			LastName:      "Taylor",
			Email:         "christopher.taylor@example.com",
			Phone:         "07012345678",
			Role:          models.RoleDonor,
			Status:        models.StatusActive,
			Address:       "741 Beech Lane",
			City:          "London",
			Postcode:      "SE4 6ST",
			EmailVerified: true,
		},
		// Additional Volunteers (pending/inactive for testing)
		{
			FirstName:     "Michelle",
			LastName:      "White",
			Email:         "michelle.white@example.com",
			Phone:         "07123456700",
			Role:          models.RoleVolunteer,
			Status:        models.StatusPending,
			Address:       "852 Spruce Street",
			City:          "London",
			Postcode:      "SE6 7UV",
			EmailVerified: false,
		},
		{
			FirstName:     "Daniel",
			LastName:      "Lee",
			Email:         "daniel.lee@example.com",
			Phone:         "07234567811",
			Role:          models.RoleVolunteer,
			Status:        models.StatusInactive,
			Address:       "963 Holly Road",
			City:          "London",
			Postcode:      "SE8 8WX",
			EmailVerified: true,
		},
	}

	// Hash passwords and create users
	password := "testpass123"
	for i := range users {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return fmt.Errorf("failed to hash password for user %s: %w", users[i].Email, err)
		}
		users[i].Password = string(hashedPassword)
		users[i].CreatedAt = time.Now().AddDate(0, 0, -rand.Intn(60)) // Random date within last 60 days
		users[i].UpdatedAt = users[i].CreatedAt

		if users[i].EmailVerified {
			users[i].EmailVerifiedAt = &users[i].CreatedAt
		}
	}

	if err := db.Create(&users).Error; err != nil {
		return fmt.Errorf("failed to create users: %w", err)
	}

	log.Printf("Created %d users with password '%s'", len(users), password)
	return nil
}

// seedVolunteerApplications creates volunteer applications for testing
func seedVolunteerApplications(db *gorm.DB) error {
	// Check if applications already exist
	var count int64
	if err := db.Model(&models.VolunteerApplication{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		log.Println("Volunteer applications already exist, skipping")
		return nil
	}

	applications := []models.VolunteerApplication{
		{
			FirstName:     "David",
			LastName:      "Thompson",
			Email:         "david.thompson@example.com",
			Phone:         "07678901234",
			Skills:        "Food handling, Customer service, Organization",
			Experience:    "3 years volunteering at local food bank, Retail customer service experience",
			Availability:  "Weekends, Tuesday evenings, Holiday periods",
			Status:        "approved",
			TermsAccepted: true,
			ApprovedAt:    timePtr(time.Now().AddDate(0, 0, -30)),
		},
		{
			FirstName:     "Amy",
			LastName:      "Garcia",
			Email:         "amy.garcia@example.com",
			Phone:         "07789012345",
			Skills:        "Administrative support, Data entry, Communication",
			Experience:    "Office management, Volunteer coordination at community center",
			Availability:  "Monday-Friday mornings, Flexible weekends",
			Status:        "approved",
			TermsAccepted: true,
			ApprovedAt:    timePtr(time.Now().AddDate(0, 0, -25)),
		},
		{
			FirstName:     "Robert",
			LastName:      "Martinez",
			Email:         "robert.martinez@example.com",
			Phone:         "07890123456",
			Skills:        "Manual handling, Logistics, Team leadership",
			Experience:    "Warehouse operations, Community event organization",
			Availability:  "Weekends, Evening shifts available",
			Status:        "approved",
			TermsAccepted: true,
			ApprovedAt:    timePtr(time.Now().AddDate(0, 0, -20)),
		},
		{
			FirstName:     "Michelle",
			LastName:      "White",
			Email:         "michelle.white@example.com",
			Phone:         "07123456700",
			Skills:        "Healthcare background, First aid certified, Empathetic communication",
			Experience:    "Nursing assistant, Volunteer at elderly care facility",
			Availability:  "Weekdays, Some weekend availability",
			Status:        "pending",
			TermsAccepted: true,
		},
		{
			FirstName:       "Daniel",
			LastName:        "Lee",
			Email:           "daniel.lee@example.com",
			Phone:           "07234567811",
			Skills:          "IT support, Database management, Training delivery",
			Experience:      "Software development, Technical training for nonprofits",
			Availability:    "Flexible remote work, Weekend on-site availability",
			Status:          "rejected",
			RejectionReason: "Insufficient availability for current volunteer needs",
			TermsAccepted:   true,
		},
		// Additional pending applications
		{
			FirstName:     "Karen",
			LastName:      "Robinson",
			Email:         "karen.robinson@example.com",
			Phone:         "07345678922",
			Skills:        "Teaching, Child care, Event planning",
			Experience:    "Primary school teacher, Youth group leader",
			Availability:  "After school hours, Weekend mornings",
			Status:        "pending",
			TermsAccepted: true,
		},
		{
			FirstName:     "Paul",
			LastName:      "Clark",
			Email:         "paul.clark@example.com",
			Phone:         "07456789033",
			Skills:        "Cooking, Food safety, Cultural cuisine expertise",
			Experience:    "Professional chef, Community kitchen volunteer",
			Availability:  "Morning shifts, Holiday periods",
			Status:        "pending",
			TermsAccepted: true,
		},
	}

	// Hash passwords and set timestamps
	password := "volunteer123"
	for i := range applications {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return fmt.Errorf("failed to hash password for application %s: %w", applications[i].Email, err)
		}
		applications[i].Password = string(hashedPassword)
		applications[i].CreatedAt = time.Now().AddDate(0, 0, -rand.Intn(90)) // Random date within last 90 days
		applications[i].UpdatedAt = applications[i].CreatedAt
	}

	if err := db.Create(&applications).Error; err != nil {
		return fmt.Errorf("failed to create volunteer applications: %w", err)
	}

	log.Printf("Created %d volunteer applications", len(applications))
	return nil
}

// seedVolunteerProfiles creates volunteer profiles for approved volunteers
func seedVolunteerProfiles(db *gorm.DB) error {
	// Check if profiles already exist
	var count int64
	if err := db.Model(&models.VolunteerProfile{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		log.Println("Volunteer profiles already exist, skipping")
		return nil
	}

	// Get volunteer users and their applications
	var volunteers []models.User
	if err := db.Where("role = ?", models.RoleVolunteer).Find(&volunteers).Error; err != nil {
		return err
	}

	var applications []models.VolunteerApplication
	if err := db.Where("status = ?", "approved").Find(&applications).Error; err != nil {
		return err
	}

	// Create application lookup map
	appMap := make(map[string]*models.VolunteerApplication)
	for _, app := range applications {
		appMap[app.Email] = &app
	}

	var profiles []models.VolunteerProfile
	for _, volunteer := range volunteers {
		if volunteer.Status == models.StatusActive {
			app := appMap[volunteer.Email]
			var appID *uint
			if app != nil {
				appID = &app.ID
			}

			profile := models.VolunteerProfile{
				UserID:         volunteer.ID,
				ApplicationID:  appID,
				Experience:     getVolunteerExperience(volunteer.Email),
				Skills:         getVolunteerSkills(volunteer.Email),
				Availability:   getVolunteerAvailability(volunteer.Email),
				Status:         "active",
				PreferredRoles: getPreferredRoles(volunteer.Email),
				TotalHours:     float64(rand.Intn(200) + 50), // Random hours between 50-250
				LastShiftDate:  timePtr(time.Now().AddDate(0, 0, -rand.Intn(30))),
				CreatedAt:      volunteer.CreatedAt,
				UpdatedAt:      time.Now(),
			}
			profiles = append(profiles, profile)
		}
	}

	if len(profiles) > 0 {
		if err := db.Create(&profiles).Error; err != nil {
			return fmt.Errorf("failed to create volunteer profiles: %w", err)
		}
		log.Printf("Created %d volunteer profiles", len(profiles))
	}

	return nil
}

// seedStaffProfiles creates staff profiles with different roles and departments
func seedStaffProfiles(db *gorm.DB) error {
	// Check if staff profiles already exist
	var count int64
	if err := db.Model(&models.StaffProfile{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		log.Println("Staff profiles already exist, skipping")
		return nil
	}

	// First, create some staff users
	staffUsers := []models.User{
		{
			FirstName:     "Alice",
			LastName:      "Johnson",
			Email:         "alice.johnson@ldh.org",
			Phone:         "07123456789",
			Role:          models.RoleStaff,
			Status:        models.StatusActive,
			Address:       "123 Staff Road",
			City:          "London",
			Postcode:      "SE1 1AA",
			EmailVerified: true,
		},
		{
			FirstName:     "Bob",
			LastName:      "Smith",
			Email:         "bob.smith@ldh.org",
			Phone:         "07234567890",
			Role:          models.RoleStaff,
			Status:        models.StatusActive,
			Address:       "456 Admin Street",
			City:          "London",
			Postcode:      "SE2 2BB",
			EmailVerified: true,
		},
		{
			FirstName:     "Carol",
			LastName:      "Williams",
			Email:         "carol.williams@ldh.org",
			Phone:         "07345678901",
			Role:          models.RoleStaff,
			Status:        models.StatusActive,
			Address:       "789 Support Avenue",
			City:          "London",
			Postcode:      "SE3 3CC",
			EmailVerified: true,
		},
		{
			FirstName:     "David",
			LastName:      "Brown",
			Email:         "david.brown@ldh.org",
			Phone:         "07456789012",
			Role:          models.RoleStaff,
			Status:        models.StatusActive,
			Address:       "321 Manager Lane",
			City:          "London",
			Postcode:      "SE4 4DD",
			EmailVerified: true,
		},
		{
			FirstName:     "Emma",
			LastName:      "Davis",
			Email:         "emma.davis@ldh.org",
			Phone:         "07567890123",
			Role:          models.RoleStaff,
			Status:        models.StatusActive,
			Address:       "654 Coordinator Close",
			City:          "London",
			Postcode:      "SE5 5EE",
			EmailVerified: true,
		},
	}

	// Hash password for staff users
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("staff123"), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	for i := range staffUsers {
		staffUsers[i].Password = string(hashedPassword)
		staffUsers[i].CreatedAt = time.Now()
		staffUsers[i].UpdatedAt = time.Now()
	}

	// Create staff users
	if err := db.Create(&staffUsers).Error; err != nil {
		return fmt.Errorf("failed to create staff users: %w", err)
	}

	// Create staff profiles
	departments := []string{"general", "food", "emergency", "admin", "support"}
	positions := []string{"coordinator", "specialist", "supervisor", "manager", "assistant"}
	statuses := []string{models.StaffStatusActive, models.StaffStatusTraining}

	var staffProfiles []models.StaffProfile
	for i, user := range staffUsers {
		department := departments[i%len(departments)]
		position := positions[i%len(positions)]
		status := statuses[i%len(statuses)]

		// Set supervisor relationship (managers don't have supervisors)
		var supervisorID *uint
		if position != "manager" && i > 0 {
			// Assign previous staff member as supervisor
			supervisorID = &staffUsers[i-1].ID
		}

		profile := models.StaffProfile{
			UserID:           user.ID,
			EmployeeID:       fmt.Sprintf("EMP%03d", i+1),
			Department:       department,
			Position:         position,
			HireDate:         time.Now().AddDate(0, 0, -rand.Intn(365*2)), // Hired within last 2 years
			SupervisorID:     supervisorID,
			Status:           status,
			Skills:           getStaffSkills(position),
			Certifications:   getStaffCertifications(position),
			WorkSchedule:     getStaffWorkSchedule(),
			ContactInfo:      fmt.Sprintf(`{"office_extension": "%d", "emergency_contact": "HR Department"}`, 1000+i),
			EmergencyContact: fmt.Sprintf(`{"name": "Emergency Contact %d", "phone": "07%09d", "relationship": "spouse"}`, i+1, 100000000+i),
			Notes:            fmt.Sprintf("Staff member in %s department, %s position", department, position),
			CreatedAt:        time.Now(),
			UpdatedAt:        time.Now(),
		}

		staffProfiles = append(staffProfiles, profile)
	}

	if err := db.Create(&staffProfiles).Error; err != nil {
		return fmt.Errorf("failed to create staff profiles: %w", err)
	}

	// Create some staff schedules
	var staffSchedules []models.StaffSchedule
	for i, profile := range staffProfiles {
		// Create schedule for next 7 days
		for day := 0; day < 7; day++ {
			scheduleDate := time.Now().AddDate(0, 0, day)

			// Skip weekends for most staff
			if scheduleDate.Weekday() == time.Saturday || scheduleDate.Weekday() == time.Sunday {
				continue
			}

			startTime := time.Date(scheduleDate.Year(), scheduleDate.Month(), scheduleDate.Day(), 9, 0, 0, 0, time.UTC)
			endTime := time.Date(scheduleDate.Year(), scheduleDate.Month(), scheduleDate.Day(), 17, 0, 0, 0, time.UTC)

			// Vary schedule slightly
			if i%2 == 0 {
				startTime = startTime.Add(time.Hour) // 10 AM start
				endTime = endTime.Add(time.Hour)     // 6 PM end
			}

			schedule := models.StaffSchedule{
				StaffID:    profile.ID,
				Date:       scheduleDate,
				StartTime:  startTime,
				EndTime:    endTime,
				Department: profile.Department,
				BreakTimes: `["12:00-13:00"]`,
				Status:     "scheduled",
				Notes:      fmt.Sprintf("Regular shift in %s", profile.Department),
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			}

			staffSchedules = append(staffSchedules, schedule)
		}
	}

	if err := db.Create(&staffSchedules).Error; err != nil {
		return fmt.Errorf("failed to create staff schedules: %w", err)
	}

	// Create some performance metrics
	var performanceMetrics []models.StaffPerformanceMetric
	for _, profile := range staffProfiles {
		// Create metrics for last 3 months
		for month := 0; month < 3; month++ {
			metricDate := time.Now().AddDate(0, -month, 0)

			metric := models.StaffPerformanceMetric{
				StaffID:               profile.ID,
				Date:                  metricDate,
				VisitorsServed:        rand.Intn(50) + 20,               // 20-70 visitors
				AverageServiceTime:    rand.Intn(10) + 8,                // 8-18 minutes
				SatisfactionRating:    float64(rand.Intn(20)+80) / 10.0, // 8.0-10.0 score
				TasksCompleted:        rand.Intn(20) + 10,               // 10-30 tasks
				HoursWorked:           float64(rand.Intn(4)+6) + 0.5,    // 6.5-10.5 hours
				OvertimeHours:         float64(rand.Intn(3)),            // 0-3 hours
				BreakCompliance:       rand.Float32() > 0.1,             // 90% compliance
				PunctualityScore:      float64(rand.Intn(15) + 85),      // 85-100%
				CustomerFeedbackScore: float64(rand.Intn(20)+80) / 10.0, // 8.0-10.0 score
				EfficiencyRating:      getRandomEfficiencyRating(),
				Notes:                 fmt.Sprintf("Monthly performance metrics for %s", metricDate.Format("January 2006")),
				CreatedAt:             time.Now(),
				UpdatedAt:             time.Now(),
			}

			performanceMetrics = append(performanceMetrics, metric)
		}
	}

	if err := db.Create(&performanceMetrics).Error; err != nil {
		return fmt.Errorf("failed to create performance metrics: %w", err)
	}

	log.Printf("Created %d staff profiles with schedules and performance metrics", len(staffProfiles))
	return nil
}

// Helper functions for staff seeding
func getStaffSkills(position string) string {
	skillsMap := map[string]string{
		"coordinator": "project management,communication,organization,problem solving",
		"specialist":  "technical expertise,analysis,documentation,training",
		"supervisor":  "leadership,team management,conflict resolution,mentoring",
		"manager":     "strategic planning,budget management,staff development,operations",
		"assistant":   "administrative support,data entry,customer service,filing",
	}
	if skills, exists := skillsMap[position]; exists {
		return skills
	}
	return "communication,teamwork,reliability,adaptability"
}

func getStaffCertifications(position string) string {
	certMap := map[string]string{
		"coordinator": "Project Management Professional,First Aid",
		"specialist":  "Technical Certification,Safety Training",
		"supervisor":  "Leadership Certificate,Health & Safety",
		"manager":     "Management Diploma,Strategic Planning",
		"assistant":   "Administrative Certificate,Customer Service",
	}
	if certs, exists := certMap[position]; exists {
		return certs
	}
	return "Basic Training,Health & Safety"
}

func getStaffWorkSchedule() string {
	return `{
		"monday": {"start": "09:00", "end": "17:00"},
		"tuesday": {"start": "09:00", "end": "17:00"},
		"wednesday": {"start": "09:00", "end": "17:00"},
		"thursday": {"start": "09:00", "end": "17:00"},
		"friday": {"start": "09:00", "end": "17:00"},
		"weekend": false,
		"break_times": ["12:00-13:00"]
	}`
}

func getRandomEfficiencyRating() string {
	ratings := []string{"A+", "A", "B+", "B", "C+", "C", "D", "F"}
	weights := []int{10, 20, 25, 20, 15, 7, 2, 1} // Higher probability for better ratings

	totalWeight := 0
	for _, weight := range weights {
		totalWeight += weight
	}

	randNum := rand.Intn(totalWeight)
	currentWeight := 0

	for i, weight := range weights {
		currentWeight += weight
		if randNum < currentWeight {
			return ratings[i]
		}
	}

	return "B" // fallback
}

// seedHelpRequests creates diverse help requests with different statuses
func seedHelpRequests(db *gorm.DB) error {
	// Check if help requests already exist
	var count int64
	if err := db.Model(&models.HelpRequest{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		log.Println("Help requests already exist, skipping")
		return nil
	}

	// Get visitor users
	var visitors []models.User
	if err := db.Where("role = ?", models.RoleVisitor).Find(&visitors).Error; err != nil {
		return err
	}

	if len(visitors) == 0 {
		log.Println("No visitors found, skipping help request seeding")
		return nil
	}

	// Get volunteer users
	var volunteers []models.User
	if err := db.Where("role = ? AND status = ?", models.RoleVolunteer, models.StatusActive).Find(&volunteers).Error; err != nil {
		return err
	}

	var requests []models.HelpRequest
	statuses := []string{
		models.HelpRequestStatusPending,
		models.HelpRequestStatusApproved,
		models.HelpRequestStatusTicketIssued,
		models.HelpRequestStatusCompleted,
		models.HelpRequestStatusCancelled,
	}
	categories := []string{models.CategoryFood, models.CategoryGeneral}

	for i := 0; i < 25; i++ { // Create 25 help requests
		visitor := visitors[rand.Intn(len(visitors))]
		status := statuses[rand.Intn(len(statuses))]
		category := categories[rand.Intn(len(categories))]

		createdAt := time.Now().AddDate(0, 0, -rand.Intn(60)) // Last 60 days

		request := models.HelpRequest{
			VisitorID:     visitor.ID,
			VisitorName:   visitor.FirstName + " " + visitor.LastName,
			Email:         visitor.Email,
			Phone:         visitor.Phone,
			Postcode:      visitor.Postcode,
			Category:      category,
			Details:       getHelpRequestDetails(category),
			SpecialNeeds:  getRandomSpecialNeeds(),
			HouseholdSize: rand.Intn(6) + 1, // 1-6 people
			Status:        status,
			RequestDate:   createdAt,
			Reference:     fmt.Sprintf("REQ%d%03d", time.Now().Year(), i+1),
			VisitDay:      getRandomVisitDay(),
			TimeSlot:      getRandomTimeSlot(),
			Priority:      getRandomPriority(),
			CreatedAt:     createdAt,
			UpdatedAt:     createdAt,
		}

		// Set status-specific fields
		if status == models.HelpRequestStatusApproved || status == models.HelpRequestStatusTicketIssued || status == models.HelpRequestStatusCompleted {
			request.ApprovedAt = timePtr(createdAt.Add(time.Duration(rand.Intn(24)) * time.Hour))
		}

		if status == models.HelpRequestStatusTicketIssued || status == models.HelpRequestStatusCompleted {
			request.TicketNumber = fmt.Sprintf("TKT%d%03d", time.Now().Year(), i+1)
		}

		if status == models.HelpRequestStatusCompleted && len(volunteers) > 0 {
			volunteer := volunteers[rand.Intn(len(volunteers))]
			request.AssignedStaffID = &volunteer.ID
		}

		requests = append(requests, request)
	}

	if err := db.Create(&requests).Error; err != nil {
		return fmt.Errorf("failed to create help requests: %w", err)
	}

	log.Printf("Created %d help requests", len(requests))
	return nil
}

// seedDonations creates various types of donations
func seedDonations(db *gorm.DB) error {
	// Check if donations already exist
	var count int64
	if err := db.Model(&models.Donation{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		log.Println("Donations already exist, skipping")
		return nil
	}

	// Get donor users
	var donors []models.User
	if err := db.Where("role = ?", models.RoleDonor).Find(&donors).Error; err != nil {
		return err
	}

	var donations []models.Donation
	donationTypes := []string{
		models.DonationTypeMoney,
		models.DonationTypeGoods,
	}

	// Add some anonymous donations
	donations = append(donations, []models.Donation{
		{
			Name:          "Anonymous Donor",
			ContactEmail:  "anonymous@example.com",
			Type:          models.DonationTypeMoney,
			Amount:        250.00,
			Currency:      "GBP",
			PaymentMethod: "bank_transfer",
			Status:        models.DonationStatusReceived,
			IsAnonymous:   true,
			Description:   "Monthly donation for food support",
			CreatedAt:     time.Now().AddDate(0, 0, -15),
		},
		{
			Name:         "Community Group",
			ContactEmail: "community@example.com",
			ContactPhone: "020 8555 0123",
			Type:         models.DonationTypeGoods,
			Goods:        "Food items: Rice, pasta, canned goods, baby formula",
			GoodsValue:   180.00,
			Quantity:     45,
			Status:       models.DonationStatusProcessed,
			Description:  "Weekly food collection from local community group",
			CreatedAt:    time.Now().AddDate(0, 0, -7),
		},
	}...)

	// Create donations from registered donors
	for _, donor := range donors {
		for i := 0; i < rand.Intn(3)+1; i++ { // 1-3 donations per donor
			donationType := donationTypes[rand.Intn(len(donationTypes))]
			createdAt := time.Now().AddDate(0, 0, -rand.Intn(90)) // Last 90 days

			donation := models.Donation{
				DonorID:      &donor.ID,
				Name:         donor.FirstName + " " + donor.LastName,
				ContactEmail: donor.Email,
				ContactPhone: donor.Phone,
				Type:         donationType,
				Status:       getRandomDonationStatus(),
				CreatedAt:    createdAt,
				UpdatedAt:    createdAt,
			}

			if donationType == models.DonationTypeMoney {
				donation.Amount = float64(rand.Intn(500) + 25) // £25-£525
				donation.Currency = "GBP"
				donation.PaymentMethod = getRandomPaymentMethod()
				donation.Description = "Financial contribution for community support"
			} else {
				donation.Goods = getRandomGoodsDescription()
				donation.GoodsValue = float64(rand.Intn(200) + 20) // £20-£220
				donation.Quantity = rand.Intn(20) + 5              // 5-25 items
				donation.Description = "Goods donation for distribution"
			}

			donations = append(donations, donation)
		}
	}

	if err := db.Create(&donations).Error; err != nil {
		return fmt.Errorf("failed to create donations: %w", err)
	}

	log.Printf("Created %d donations", len(donations))
	return nil
}

// seedFeedback creates feedback entries for testing
func seedFeedback(db *gorm.DB) error {
	// Check if feedback already exists
	var count int64
	if err := db.Model(&models.Feedback{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		log.Println("Feedback already exists, skipping")
		return nil
	}

	// Get users
	var users []models.User
	if err := db.Where("role IN ?", []string{models.RoleVisitor, models.RoleVolunteer}).Find(&users).Error; err != nil {
		return err
	}

	if len(users) == 0 {
		log.Println("No users found for feedback, skipping")
		return nil
	}

	var feedback []models.Feedback
	feedbackTypes := []string{
		models.FeedbackTypeVisit,
		models.FeedbackTypeSystem,
		models.FeedbackTypeGeneral,
		models.FeedbackTypeSuggestion,
	}

	for i := 0; i < 15; i++ { // Create 15 feedback entries
		user := users[rand.Intn(len(users))]
		feedbackType := feedbackTypes[rand.Intn(len(feedbackTypes))]
		createdAt := time.Now().AddDate(0, 0, -rand.Intn(45)) // Last 45 days

		entry := models.Feedback{
			UserID:      user.ID,
			Type:        feedbackType,
			Rating:      rand.Intn(5) + 1, // 1-5 stars
			Subject:     getFeedbackSubject(feedbackType),
			Message:     getFeedbackMessage(feedbackType),
			Category:    getFeedbackCategory(feedbackType),
			IsAnonymous: rand.Float32() < 0.3, // 30% anonymous
			IsPublic:    rand.Float32() < 0.6, // 60% public
			Status:      getRandomFeedbackStatus(),
			CreatedAt:   createdAt,
			UpdatedAt:   createdAt,
		}

		feedback = append(feedback, entry)
	}

	if err := db.Create(&feedback).Error; err != nil {
		return fmt.Errorf("failed to create feedback: %w", err)
	}

	log.Printf("Created %d feedback entries", len(feedback))
	return nil
}

func getVolunteerExperience(email string) string {
	experiences := map[string]string{
		"david.thompson@example.com":  "3 years volunteering at local food bank, Retail customer service experience",
		"amy.garcia@example.com":      "Office management, Volunteer coordination at community center",
		"robert.martinez@example.com": "Warehouse operations, Community event organization",
	}
	if exp, ok := experiences[email]; ok {
		return exp
	}
	return "General volunteering experience"
}

func getVolunteerSkills(email string) string {
	skills := map[string]string{
		"david.thompson@example.com":  "Food handling, Customer service, Organization",
		"amy.garcia@example.com":      "Administrative support, Data entry, Communication",
		"robert.martinez@example.com": "Manual handling, Logistics, Team leadership",
	}
	if skill, ok := skills[email]; ok {
		return skill
	}
	return "General skills"
}

func getVolunteerAvailability(email string) string {
	availability := map[string]string{
		"david.thompson@example.com":  "Weekends, Tuesday evenings, Holiday periods",
		"amy.garcia@example.com":      "Monday-Friday mornings, Flexible weekends",
		"robert.martinez@example.com": "Weekends, Evening shifts available",
	}
	if avail, ok := availability[email]; ok {
		return avail
	}
	return "Flexible availability"
}

func getPreferredRoles(email string) string {
	roles := map[string]string{
		"david.thompson@example.com":  "Food distribution",
		"amy.garcia@example.com":      "Administrative support",
		"robert.martinez@example.com": "Volunteer coordination",
	}
	if role, ok := roles[email]; ok {
		return role
	}

	// Default roles for other volunteers
	defaultRoles := []string{
		"Food distribution",
		"Reception and check-in",
		"Administrative support",
		"Volunteer coordination",
		"Event organization",
	}
	return defaultRoles[rand.Intn(len(defaultRoles))]
}

func getHelpRequestDetails(category string) string {
	if category == models.CategoryFood {
		details := []string{
			"Family of 4 needs weekly food support. No dietary restrictions.",
			"Single parent with 2 children. Need fresh vegetables and baby food.",
			"Elderly couple requiring easy-to-prepare meals and basics.",
			"Student struggling financially. Need basics and tinned goods.",
			"Family with diabetic member. Need sugar-free and healthy options.",
		}
		return details[rand.Intn(len(details))]
	}

	details := []string{
		"Need help with housing benefit application and debt advice.",
		"Seeking support with job search and CV writing assistance.",
		"Require information about local services and healthcare registration.",
		"Need help with utility bills and energy assistance programs.",
		"Looking for mental health support and counseling services.",
	}
	return details[rand.Intn(len(details))]
}

func getRandomSpecialNeeds() string {
	needs := []string{
		"",
		"Wheelchair accessible",
		"Interpreter needed (Bengali)",
		"Dietary requirements: Halal",
		"Child-friendly environment needed",
		"Anxiety support required",
	}
	return needs[rand.Intn(len(needs))]
}

func getRandomVisitDay() string {
	days := []string{"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}
	return days[rand.Intn(len(days))]
}

func getRandomTimeSlot() string {
	slots := []string{"9:00-10:00", "10:00-11:00", "11:00-12:00", "14:00-15:00", "15:00-16:00"}
	return slots[rand.Intn(len(slots))]
}

func getRandomPriority() string {
	priorities := []string{"normal", "high", "urgent"}
	weights := []int{70, 25, 5} // 70% normal, 25% high, 5% urgent

	total := 0
	for _, w := range weights {
		total += w
	}

	r := rand.Intn(total)
	for i, w := range weights {
		r -= w
		if r < 0 {
			return priorities[i]
		}
	}
	return priorities[0]
}

func getRandomDonationStatus() string {
	statuses := []string{
		models.DonationStatusPending,
		models.DonationStatusReceived,
		models.DonationStatusProcessed,
	}
	weights := []int{10, 40, 50} // 10% pending, 40% received, 50% processed

	total := 0
	for _, w := range weights {
		total += w
	}

	r := rand.Intn(total)
	for i, w := range weights {
		r -= w
		if r < 0 {
			return statuses[i]
		}
	}
	return statuses[0]
}

func getRandomPaymentMethod() string {
	methods := []string{"card", "bank_transfer", "cash", "paypal"}
	return methods[rand.Intn(len(methods))]
}

func getRandomGoodsDescription() string {
	goods := []string{
		"Canned goods, pasta, rice, cooking oil",
		"Fresh vegetables, bread, milk, eggs",
		"Baby formula, diapers, children's clothing",
		"Toiletries, cleaning supplies, household items",
		"Winter clothing, blankets, warm accessories",
		"Books, toys, educational materials",
	}
	return goods[rand.Intn(len(goods))]
}

func getFeedbackSubject(feedbackType string) string {
	subjects := map[string][]string{
		models.FeedbackTypeVisit: {
			"Excellent service today",
			"Wait time feedback",
			"Staff were very helpful",
			"Suggestions for improvement",
		},
		models.FeedbackTypeSystem: {
			"Website feedback",
			"Booking system issues",
			"Mobile app suggestions",
			"Online form problems",
		},
		models.FeedbackTypeGeneral: {
			"Overall experience",
			"Service quality feedback",
			"Accessibility concerns",
			"General suggestions",
		},
		models.FeedbackTypeSuggestion: {
			"Extended opening hours",
			"Additional services needed",
			"Process improvements",
			"Community outreach ideas",
		},
	}

	if subjects, ok := subjects[feedbackType]; ok {
		return subjects[rand.Intn(len(subjects))]
	}
	return "General feedback"
}

func getFeedbackMessage(feedbackType string) string {
	messages := map[string][]string{
		models.FeedbackTypeVisit: {
			"The staff were incredibly helpful and patient. The whole process was smooth and dignified.",
			"Had to wait a bit longer than expected, but the service was worth it. Very professional team.",
			"Amazing support provided. Really felt welcomed and supported throughout the visit.",
		},
		models.FeedbackTypeSystem: {
			"The online booking system is easy to use, but could benefit from mobile optimization.",
			"Website loads slowly sometimes. Otherwise, very informative and helpful.",
			"Love the new features, but the appointment confirmation emails could be clearer.",
		},
		models.FeedbackTypeGeneral: {
			"Overall very satisfied with the service. The team goes above and beyond to help.",
			"Great community resource. The location is convenient and the facilities are clean.",
			"Wonderful organization doing important work. Staff are compassionate and professional.",
		},
		models.FeedbackTypeSuggestion: {
			"Would be helpful to have evening appointments for working parents.",
			"Could you consider adding a children's play area for families with young kids?",
			"More multilingual support would help reach more community members.",
		},
	}

	if msgs, ok := messages[feedbackType]; ok {
		return msgs[rand.Intn(len(msgs))]
	}
	return "Thank you for the service provided."
}

func getFeedbackCategory(feedbackType string) string {
	categories := map[string][]string{
		models.FeedbackTypeVisit:      {"Service Quality", "Staff", "Wait Time", "Facilities"},
		models.FeedbackTypeSystem:     {"Website", "Booking", "Mobile App", "Technical"},
		models.FeedbackTypeGeneral:    {"Overall Experience", "Accessibility", "Communication"},
		models.FeedbackTypeSuggestion: {"Service Enhancement", "Accessibility", "Community Outreach"},
	}

	if cats, ok := categories[feedbackType]; ok {
		return cats[rand.Intn(len(cats))]
	}
	return "General"
}

func getRandomFeedbackStatus() string {
	statuses := []string{"pending", "reviewed", "resolved"}
	weights := []int{30, 40, 30} // 30% pending, 40% reviewed, 30% resolved

	total := 0
	for _, w := range weights {
		total += w
	}

	r := rand.Intn(total)
	for i, w := range weights {
		r -= w
		if r < 0 {
			return statuses[i]
		}
	}
	return statuses[0]
}

// seedVisits creates visit records for testing visitor dashboard
func seedVisits(db *gorm.DB) error {
	// Check if visits already exist
	var count int64
	if err := db.Model(&models.Visit{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		log.Println("Visits already exist, skipping")
		return nil
	}

	// Get completed help requests that should have visits
	var helpRequests []models.HelpRequest
	if err := db.Where("status IN ?", []string{
		models.HelpRequestStatusCompleted,
		models.HelpRequestStatusTicketIssued,
	}).Find(&helpRequests).Error; err != nil {
		return err
	}

	if len(helpRequests) == 0 {
		log.Println("No completed help requests found, skipping visit seeding")
		return nil
	}

	var visits []models.Visit

	// Create visits for completed help requests
	for i, hr := range helpRequests {
		if hr.Status == models.HelpRequestStatusCompleted {
			// Create completed visit
			checkInTime := hr.CreatedAt.Add(time.Duration(rand.Intn(7)+1) * 24 * time.Hour) // 1-7 days after request
			checkOutTime := checkInTime.Add(time.Duration(rand.Intn(90)+30) * time.Minute)  // 30-120 minutes visit
			duration := int(checkOutTime.Sub(checkInTime).Minutes())

			visit := models.Visit{
				VisitorID:    hr.VisitorID,
				TicketID:     uint(i + 1), // Simple ticket ID assignment
				CheckInTime:  checkInTime,
				CheckOutTime: &checkOutTime,
				Status:       "completed",
				Duration:     &duration,
				Notes:        "Successful visit - assistance provided",
				CreatedAt:    checkInTime,
				UpdatedAt:    checkOutTime,
			}
			visits = append(visits, visit)
		} else if hr.Status == models.HelpRequestStatusTicketIssued && rand.Float32() < 0.3 {
			// 30% chance of having an active visit for ticket issued requests
			checkInTime := time.Now().Add(-time.Duration(rand.Intn(180)+10) * time.Minute) // Started 10-180 minutes ago

			visit := models.Visit{
				VisitorID:   hr.VisitorID,
				TicketID:    uint(i + 1),
				CheckInTime: checkInTime,
				Status:      "in_service",
				Notes:       "Currently being served",
				CreatedAt:   checkInTime,
				UpdatedAt:   checkInTime,
			}
			visits = append(visits, visit)
		}
	}

	// Add some additional historical visits for the first few visitors
	var visitors []models.User
	if err := db.Where("role = ?", models.RoleVisitor).Limit(3).Find(&visitors).Error; err == nil {
		for _, visitor := range visitors {
			// Add 2-5 historical visits per visitor
			numVisits := rand.Intn(4) + 2
			for j := 0; j < numVisits; j++ {
				daysAgo := rand.Intn(90) + 7                                                                     // 7-97 days ago
				checkInTime := time.Now().AddDate(0, 0, -daysAgo).Add(time.Duration(rand.Intn(8)+9) * time.Hour) // 9am-5pm
				checkOutTime := checkInTime.Add(time.Duration(rand.Intn(90)+30) * time.Minute)
				duration := int(checkOutTime.Sub(checkInTime).Minutes())

				visit := models.Visit{
					VisitorID:    visitor.ID,
					TicketID:     uint(len(visits) + j + 100), // Avoid ID conflicts
					CheckInTime:  checkInTime,
					CheckOutTime: &checkOutTime,
					Status:       "completed",
					Duration:     &duration,
					Notes:        "Historical visit record",
					CreatedAt:    checkInTime,
					UpdatedAt:    checkOutTime,
				}
				visits = append(visits, visit)
			}
		}
	}

	if len(visits) > 0 {
		if err := db.Create(&visits).Error; err != nil {
			return fmt.Errorf("failed to create visits: %w", err)
		}
		log.Printf("Created %d visits", len(visits))
	}

	return nil
}

// seedDocuments creates document verification records for testing
func seedDocuments(db *gorm.DB) error {
	// Check if documents already exist
	var count int64
	if err := db.Model(&models.Document{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		log.Println("Documents already exist, skipping")
		return nil
	}

	// Get visitor users
	var visitors []models.User
	if err := db.Where("role = ?", models.RoleVisitor).Find(&visitors).Error; err != nil {
		return err
	}

	if len(visitors) == 0 {
		log.Println("No visitors found, skipping document seeding")
		return nil
	}

	var documents []models.Document

	for i, visitor := range visitors {
		// Create photo ID document for each visitor
		photoIDStatus := models.DocumentStatusApproved
		if i%3 == 0 { // Every 3rd visitor has pending documents
			photoIDStatus = models.DocumentStatusPending
		}

		uploadedAt := visitor.CreatedAt.Add(time.Duration(rand.Intn(48)) * time.Hour) // Uploaded within 48 hours of registration

		photoID := models.Document{
			UserID:     visitor.ID,
			Type:       models.DocumentTypeID,
			Name:       fmt.Sprintf("photo_id_%d.jpg", visitor.ID),
			Title:      "Photo ID",
			FilePath:   fmt.Sprintf("/uploads/documents/photo_id_%d.jpg", visitor.ID),
			FileType:   "image/jpeg",
			FileSize:   1024000 + int64(rand.Intn(500000)), // 1-1.5MB
			Status:     photoIDStatus,
			UploadedAt: uploadedAt,
			CreatedAt:  uploadedAt,
			UpdatedAt:  uploadedAt,
		}

		if photoIDStatus == models.DocumentStatusApproved {
			verifiedAt := uploadedAt.Add(time.Duration(rand.Intn(72)+24) * time.Hour) // Verified 24-96 hours after upload
			photoID.VerifiedAt = &verifiedAt
			photoID.VerifiedBy = uintPtr(1) // Admin user ID
			photoID.UpdatedAt = verifiedAt
		}

		documents = append(documents, photoID)

		// Create proof of address document for each visitor
		proofAddressStatus := models.DocumentStatusApproved
		if i%4 == 0 { // Every 4th visitor has pending proof of address
			proofAddressStatus = models.DocumentStatusPending
		}

		proofAddress := models.Document{
			UserID:     visitor.ID,
			Type:       models.DocumentTypeProofAddress,
			Name:       fmt.Sprintf("proof_address_%d.pdf", visitor.ID),
			Title:      "Proof of Address",
			FilePath:   fmt.Sprintf("/uploads/documents/proof_address_%d.pdf", visitor.ID),
			FileType:   "application/pdf",
			FileSize:   512000 + int64(rand.Intn(300000)), // 512KB-812KB
			Status:     proofAddressStatus,
			UploadedAt: uploadedAt.Add(time.Duration(rand.Intn(24)) * time.Hour), // Uploaded within 24 hours of photo ID
			CreatedAt:  uploadedAt,
			UpdatedAt:  uploadedAt,
		}

		if proofAddressStatus == models.DocumentStatusApproved {
			verifiedAt := proofAddress.UploadedAt.Add(time.Duration(rand.Intn(72)+24) * time.Hour)
			proofAddress.VerifiedAt = &verifiedAt
			proofAddress.VerifiedBy = uintPtr(1) // Admin user ID
			proofAddress.UpdatedAt = verifiedAt
		}

		documents = append(documents, proofAddress)
	}

	if err := db.Create(&documents).Error; err != nil {
		return fmt.Errorf("failed to create documents: %w", err)
	}

	log.Printf("Created %d documents", len(documents))
	return nil
}

// Helper function for creating uint pointers
func uintPtr(i uint) *uint {
	return &i
}
