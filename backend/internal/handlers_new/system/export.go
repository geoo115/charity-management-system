package system

import (
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/utils"

	"github.com/gin-gonic/gin"
)

// ExportShiftsToCSV exports shifts to a CSV file
func ExportShiftsToCSV(c *gin.Context) {
	// Get query parameters for filtering with validation
	startDate := c.Query("startDate")
	endDate := c.Query("endDate")
	location := c.Query("location")

	// Validate date formats if provided
	if startDate != "" {
		if _, err := time.Parse("2006-01-02", startDate); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start date format, use YYYY-MM-DD"})
			return
		}
	}

	if endDate != "" {
		if _, err := time.Parse("2006-01-02", endDate); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end date format, use YYYY-MM-DD"})
			return
		}
	}

	// Build query with proper error handling
	query := db.DB.Model(&models.Shift{})

	// Apply filters
	if startDate != "" {
		query = query.Where("date >= ?", startDate)
	}

	if endDate != "" {
		query = query.Where("date <= ?", endDate)
	}

	if location != "" {
		query = query.Where("location ILIKE ?", "%"+location+"%")
	}

	// Execute query with preloading
	var shifts []models.Shift
	if err := query.Order("date DESC, start_time ASC").Find(&shifts).Error; err != nil {
		log.Printf("Error retrieving shifts for export: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to retrieve shifts",
			"details": err.Error(),
		})
		return
	}

	// Check if we have data to export
	if len(shifts) == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "No shifts found matching the criteria",
		})
		return
	}

	// Set up response headers for CSV download
	filename := fmt.Sprintf("shifts_export_%s.csv", time.Now().Format("2006-01-02_15-04-05"))
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "text/csv")

	// Create CSV writer
	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	// Write header row
	header := []string{"ID", "Date", "Start Time", "End Time", "Location", "Role", "Description", "Max Volunteers", "Assigned Volunteer ID", "Type", "Required Skills"}
	if err := writer.Write(header); err != nil {
		log.Printf("Error writing CSV header: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to write CSV header",
			"details": err.Error(),
		})
		return
	}

	// Write data rows
	for _, shift := range shifts {
		var assignedVolunteerID string
		if shift.AssignedVolunteerID != nil {
			assignedVolunteerID = strconv.FormatUint(uint64(*shift.AssignedVolunteerID), 10)
		}

		row := []string{
			strconv.FormatUint(uint64(shift.ID), 10),
			shift.Date.Format("2006-01-02"),
			shift.StartTime.Format("15:04"),
			shift.EndTime.Format("15:04"),
			shift.Location,
			shift.Role,
			shift.Description,
			strconv.Itoa(shift.MaxVolunteers),
			assignedVolunteerID,
			shift.Type,
			shift.RequiredSkills,
		}

		if err := writer.Write(row); err != nil {
			log.Printf("Error writing CSV row: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "failed to write CSV row",
				"details": err.Error(),
			})
			return
		}
	}

	// Flush writer and check for errors
	writer.Flush()
	if err := writer.Error(); err != nil {
		log.Printf("Error flushing CSV writer: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to complete CSV export",
			"details": err.Error(),
		})
		return
	}

	// Create audit log
	utils.CreateAuditLog(c, "Export", "Shifts", 0, fmt.Sprintf("Exported %d shifts to CSV", len(shifts)))
}

// ExportVolunteersToCSV exports volunteers to a CSV file
func ExportVolunteersToCSV(c *gin.Context) {
	// Get query parameters for filtering
	status := c.Query("status")

	// Build query
	query := db.DB.Model(&models.User{}).Where("role = ?", "volunteer")

	// Apply filters
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Execute query
	var volunteers []models.User
	if err := query.Find(&volunteers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to retrieve volunteers",
			"details": err.Error(),
		})
		return
	}

	// Set up response headers for CSV download
	filename := fmt.Sprintf("volunteers_export_%s.csv", time.Now().Format("2006-01-02"))
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "text/csv")

	// Create CSV writer
	writer := csv.NewWriter(c.Writer)

	// Write header row
	header := []string{"ID", "Name", "Email", "Phone", "Status", "Created At"}
	if err := writer.Write(header); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to write CSV header",
			"details": err.Error(),
		})
		return
	}

	// Write data rows
	for _, volunteer := range volunteers {
		// Replace volunteer.Name
		volunteerName := volunteer.FirstName + " " + volunteer.LastName

		row := []string{
			strconv.FormatUint(uint64(volunteer.ID), 10),
			volunteerName,
			volunteer.Email,
			volunteer.Phone,
			"active", // Assuming all retrieved users are active
			volunteer.CreatedAt.Format("2006-01-02 15:04:05"),
		}

		if err := writer.Write(row); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "failed to write CSV row",
				"details": err.Error(),
			})
			return
		}
	}

	// Flush writer
	writer.Flush()

	if err := writer.Error(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to flush CSV writer",
			"details": err.Error(),
		})
		return
	}
}

// ExportDonationsToCSV exports donations to a CSV file
func ExportDonationsToCSV(c *gin.Context) {
	// Get query parameters for filtering
	startDate := c.Query("startDate")
	endDate := c.Query("endDate")
	donationType := c.Query("type") // "monetary", "item"
	status := c.Query("status")

	// Build query
	query := db.DB.Model(&models.Donation{})

	// Apply filters
	if startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}

	if endDate != "" {
		query = query.Where("created_at <= ?", endDate)
	}

	if donationType != "" {
		query = query.Where("type = ?", donationType)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Execute query
	var donations []models.Donation
	if err := query.Find(&donations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to retrieve donations",
			"details": err.Error(),
		})
		return
	}

	// Set up response headers for CSV download
	filename := fmt.Sprintf("donations_export_%s.csv", time.Now().Format("2006-01-02"))
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "text/csv")

	// Create CSV writer
	writer := csv.NewWriter(c.Writer)

	// Write header row
	header := []string{"ID", "Donor Name", "Email", "Phone", "Type", "Amount", "Currency", "Goods", "Status", "Date", "Receipt Sent", "Notes"}
	if err := writer.Write(header); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to write CSV header",
			"details": err.Error(),
		})
		return
	}

	// Write data rows
	for _, donation := range donations {
		// For each donation, add a row with their details
		record := []string{
			fmt.Sprintf("%d", donation.ID),
			donation.Name,
			donation.ContactEmail,
			donation.ContactPhone,
			donation.Type,
			fmt.Sprintf("%.2f", donation.Amount),
			donation.Currency,
			donation.Goods, // Use consistent field name
			donation.Status,
			donation.CreatedAt.Format("2006-01-02 15:04:05"),
			fmt.Sprintf("%t", donation.ReceiptSent),
			donation.Notes,
		}
		if err := writer.Write(record); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write record to CSV"})
			return
		}
	}

	// Flush writer
	writer.Flush()
	if err := writer.Error(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to flush CSV writer",
			"details": err.Error(),
		})
		return
	}
}

// ExportHelpRequestsToCSV exports help requests to a CSV file
func ExportHelpRequestsToCSV(c *gin.Context) {
	// Get query parameters for filtering
	startDate := c.Query("startDate")
	endDate := c.Query("endDate")
	status := c.Query("status")
	category := c.Query("category")

	// Build query
	query := db.DB.Model(&models.HelpRequest{})

	// Apply filters
	if startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}

	if endDate != "" {
		query = query.Where("created_at <= ?", endDate)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if category != "" {
		query = query.Where("category = ?", category)
	}

	// Execute query
	var requests []models.HelpRequest
	if err := query.Find(&requests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to retrieve help requests",
			"details": err.Error(),
		})
		return
	}

	// Set up response headers for CSV download
	filename := fmt.Sprintf("help_requests_export_%s.csv", time.Now().Format("2006-01-02"))
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "text/csv")

	// Create CSV writer
	writer := csv.NewWriter(c.Writer)

	// Write header row
	header := []string{"ID", "Reference", "Visitor Name", "Email", "Phone", "Postcode", "Category", "Status", "Visit Day", "Time Slot", "Created At", "Details"}
	if err := writer.Write(header); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to write CSV header",
			"details": err.Error(),
		})
		return
	}

	// Write data rows
	for _, request := range requests {
		row := []string{
			strconv.FormatUint(uint64(request.ID), 10),
			request.Reference,
			request.VisitorName,
			request.Email,
			request.Phone,
			request.Postcode,
			request.Category,
			request.Status,
			request.VisitDay,
			request.TimeSlot,
			request.CreatedAt.Format("2006-01-02 15:04:05"),
			request.Details,
		}

		if err := writer.Write(row); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "failed to write CSV row",
				"details": err.Error(),
			})
			return
		}
	}

	// Flush writer
	writer.Flush()
	if err := writer.Error(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to flush CSV writer",
			"details": err.Error(),
		})
		return
	}
}

// ExportUsersToCSV exports users to a CSV file
func ExportUsersToCSV(c *gin.Context) {
	// Get query parameters for filtering
	role := c.Query("role")
	status := c.Query("status") // "active", "inactive"

	// Build query
	query := db.DB.Model(&models.User{})

	// Apply filters
	if role != "" {
		query = query.Where("role = ?", role)
	}

	if status == "active" {
		query = query.Where("status = ?", "Active")
	} else if status == "inactive" {
		query = query.Where("status = ?", "Inactive")
	}

	// Execute query
	var users []models.User
	if err := query.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to retrieve users",
			"details": err.Error(),
		})
		return
	}

	// Set up response headers for CSV download
	filename := fmt.Sprintf("users_export_%s.csv", time.Now().Format("2006-01-02"))
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "text/csv")

	// Create CSV writer
	writer := csv.NewWriter(c.Writer)

	// Write header row - exclude password field
	header := []string{"ID", "Name", "Email", "Phone", "Role", "Status", "Created At"}
	if err := writer.Write(header); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to write CSV header",
			"details": err.Error(),
		})
		return
	}

	// Write data rows
	for _, user := range users {
		// Replace user.Name
		userName := user.FirstName + " " + user.LastName

		row := []string{
			strconv.FormatUint(uint64(user.ID), 10),
			userName,
			user.Email,
			user.Phone,
			user.Role,
			user.Status,
			user.CreatedAt.Format("2006-01-02 15:04:05"),
		}

		if err := writer.Write(row); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "failed to write CSV row",
				"details": err.Error(),
			})
			return
		}
	}

	// Flush writer
	writer.Flush()
	if err := writer.Error(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to flush CSV writer",
			"details": err.Error(),
		})
		return
	}
}
