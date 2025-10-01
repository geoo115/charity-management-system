package system

import (
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"

	"github.com/geoo115/charity-management-system/internal/handlers_new/shared"
	"github.com/gin-gonic/gin"
)

// ValidationError represents an error in CSV validation
type ValidationError struct {
	Row    int    `json:"row"`
	Field  string `json:"field"`
	Reason string `json:"reason"`
	Value  string `json:"value,omitempty"`
}

// ImportResponse represents the response format for import operations
type ImportResponse struct {
	Success      bool              `json:"success"`
	RowsImported int               `json:"rowsImported"`
	RowsFailed   int               `json:"rowsFailed"`
	Errors       []ValidationError `json:"errors,omitempty"`
	Message      string            `json:"message,omitempty"`
}

// ImportUsersFromCSV imports users from a CSV file
func ImportUsersFromCSV(c *gin.Context) {
	// Get file from form
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to get file",
			"details": err.Error(),
		})
		return
	}
	defer file.Close()

	// Read CSV
	reader := csv.NewReader(file)

	// Read header row
	header, err := reader.Read()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to read CSV header",
			"details": err.Error(),
		})
		return
	}

	// Verify required columns
	requiredColumns := []string{"FirstName", "LastName", "Email", "Role"}
	columnIndices := make(map[string]int)

	for _, col := range requiredColumns {
		found := false
		for i, h := range header {
			if h == col {
				columnIndices[col] = i
				found = true
				break
			}
		}
		if !found {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("Required column '%s' not found in CSV", col),
			})
			return
		}
	}

	// Map other optional column indices
	for i, h := range header {
		if _, exists := columnIndices[h]; !exists {
			columnIndices[h] = i
		}
	}

	// Process rows
	var users []models.User
	var validationErrors []ValidationError
	rowsProcessed := 0
	rowsFailed := 0

	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			validationErrors = append(validationErrors, ValidationError{
				Row:    rowsProcessed + 2,
				Field:  "row",
				Reason: "Failed to read row",
				Value:  err.Error(),
			})
			rowsFailed++
			continue
		}
		rowsProcessed++

		// Extract and validate data
		user := models.User{
			FirstName: row[columnIndices["FirstName"]],
			LastName:  row[columnIndices["LastName"]],
			Email:     row[columnIndices["Email"]],
			Phone:     getColumnValue(row, columnIndices, "Phone"),
			Role:      row[columnIndices["Role"]],
		}

		// Validate row data
		rowErrors := validateUserRow(row, columnIndices, rowsProcessed+1)
		if len(rowErrors) > 0 {
			validationErrors = append(validationErrors, rowErrors...)
			rowsFailed++
			continue
		}

		// Handle optional fields
		if idx, exists := columnIndices["Status"]; exists && idx < len(row) && row[idx] != "" {
			user.Status = row[idx]
		} else {
			user.Status = "Active"
		}

		// Generate random password for new users
		user.Password = generateTemporaryPassword()

		users = append(users, user)
	}

	// Process validation results
	if len(validationErrors) > 0 && len(users) == 0 {
		c.JSON(http.StatusBadRequest, ImportResponse{
			Success:      false,
			RowsImported: 0,
			RowsFailed:   rowsFailed,
			Errors:       validationErrors,
		})
		return
	}

	// Save valid users to database
	for _, user := range users {
		if err := db.DB.Create(&user).Error; err != nil {
			log.Printf("Error saving user: %v", err)
			rowsFailed++
		}
	}

	// Return results
	c.JSON(http.StatusOK, ImportResponse{
		Success:      true,
		RowsImported: len(users),
		RowsFailed:   rowsFailed,
		Errors:       validationErrors,
	})
}

// validateUserRow validates a row of user data
func validateUserRow(row []string, columnIndices map[string]int, rowNum int) []ValidationError {
	var errors []ValidationError

	// Check required fields
	if idx, exists := columnIndices["FirstName"]; !exists || idx >= len(row) || row[idx] == "" {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "FirstName",
			Reason: "First name is required",
		})
	}

	if idx, exists := columnIndices["LastName"]; !exists || idx >= len(row) || row[idx] == "" {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "LastName",
			Reason: "Last name is required",
		})
	}

	if idx, exists := columnIndices["Email"]; !exists || idx >= len(row) || row[idx] == "" {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Email",
			Reason: "Email is required",
		})
	} else if shared.ValidateEmail(row[idx]) != nil {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Email",
			Reason: "Invalid email format",
			Value:  row[idx],
		})
	} else {
		// Check if email already exists
		var count int64
		if err := db.DB.Model(&models.User{}).Where("email = ?", row[idx]).Count(&count).Error; err == nil && count > 0 {
			errors = append(errors, ValidationError{
				Row:    rowNum,
				Field:  "Email",
				Reason: "Email already exists",
				Value:  row[idx],
			})
		}
	}

	if idx, exists := columnIndices["Role"]; !exists || idx >= len(row) || row[idx] == "" {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Role",
			Reason: "Role is required",
		})
	} else if !validateRole(row[idx]) {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Role",
			Reason: "Invalid role",
			Value:  row[idx],
		})
	}

	return errors
}

// validateRole checks if a role is valid
func validateRole(role string) bool {
	validRoles := map[string]bool{
		"admin":     true,
		"volunteer": true,
		"donor":     true,
		"visitor":   true,
	}
	return validRoles[role]
}

// generateTemporaryPassword generates a random password for new users
func generateTemporaryPassword() string {
	// Simple implementation - should be improved in production
	return "temp123456"
}

// ImportDonationsFromCSV imports donations from a CSV file
func ImportDonationsFromCSV(c *gin.Context) {
	// Get file from form
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to get file",
			"details": err.Error(),
		})
		return
	}
	defer file.Close()

	// Read CSV
	reader := csv.NewReader(file)

	// Read header row
	header, err := reader.Read()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to read CSV header",
			"details": err.Error(),
		})
		return
	}

	// Verify required columns
	requiredColumns := []string{"Donor Name", "Email", "Type", "Status"}
	columnIndices := make(map[string]int)

	for _, col := range requiredColumns {
		found := false
		for i, h := range header {
			if h == col {
				columnIndices[col] = i
				found = true
				break
			}
		}
		if !found {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("Required column '%s' not found in CSV", col),
			})
			return
		}
	}

	// Map other optional column indices
	for i, h := range header {
		if _, exists := columnIndices[h]; !exists {
			columnIndices[h] = i
		}
	}

	// Process rows
	var donations []models.Donation
	var validationErrors []ValidationError
	rowsProcessed := 0
	rowsFailed := 0

	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			validationErrors = append(validationErrors, ValidationError{
				Row:    rowsProcessed + 2,
				Field:  "row",
				Reason: "Failed to read row",
				Value:  err.Error(),
			})
			rowsFailed++
			continue
		}
		rowsProcessed++

		// Extract data from columns
		donation := models.Donation{
			Name:         row[columnIndices["Donor Name"]],
			ContactEmail: row[columnIndices["Email"]],
			Type:         row[columnIndices["Type"]],
			Status:       row[columnIndices["Status"]],
		}

		// Validate row data
		rowErrors := validateDonationRow(row, columnIndices, rowsProcessed+1)
		if len(rowErrors) > 0 {
			validationErrors = append(validationErrors, rowErrors...)
			rowsFailed++
			continue
		}

		// Parse amount if provided
		if idx, exists := columnIndices["Amount"]; exists && idx < len(row) && row[idx] != "" {
			amount, err := strconv.ParseFloat(row[idx], 64)
			if err == nil {
				donation.Amount = amount
			}
		}

		// Handle optional fields
		if idx, exists := columnIndices["Phone"]; exists && idx < len(row) {
			donation.ContactPhone = row[idx]
		}

		if idx, exists := columnIndices["Notes"]; exists && idx < len(row) {
			donation.Notes = row[idx]
		}

		donations = append(donations, donation)
	}

	// Process validation results
	if len(validationErrors) > 0 && len(donations) == 0 {
		c.JSON(http.StatusBadRequest, ImportResponse{
			Success:      false,
			RowsImported: 0,
			RowsFailed:   rowsFailed,
			Errors:       validationErrors,
		})
		return
	}

	// Save valid donations to database
	for _, donation := range donations {
		if err := db.DB.Create(&donation).Error; err != nil {
			log.Printf("Error saving donation: %v", err)
			rowsFailed++
		}
	}

	// Return results
	c.JSON(http.StatusOK, ImportResponse{
		Success:      true,
		RowsImported: len(donations),
		RowsFailed:   rowsFailed,
		Errors:       validationErrors,
	})
}

// validateDonationRow validates a row of donation data
func validateDonationRow(row []string, columnIndices map[string]int, rowNum int) []ValidationError {
	var errors []ValidationError

	// Check required fields
	if idx, exists := columnIndices["Donor Name"]; !exists || idx >= len(row) || row[idx] == "" {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Donor Name",
			Reason: "Donor Name is required",
		})
	}

	if idx, exists := columnIndices["Email"]; !exists || idx >= len(row) || row[idx] == "" {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Email",
			Reason: "Email is required",
		})
	} else if shared.ValidateEmail(row[idx]) != nil {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Email",
			Reason: "Invalid email format",
			Value:  row[idx],
		})
	}

	if idx, exists := columnIndices["Type"]; !exists || idx >= len(row) || row[idx] == "" {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Type",
			Reason: "Type is required",
		})
	} else if !validateDonationType(row[idx]) {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Type",
			Reason: "Invalid type. Must be monetary or goods",
			Value:  row[idx],
		})
	}

	if idx, exists := columnIndices["Status"]; !exists || idx >= len(row) || row[idx] == "" {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Status",
			Reason: "Status is required",
		})
	}

	// Validate amount if provided
	if idx, exists := columnIndices["Amount"]; exists && idx < len(row) && row[idx] != "" {
		if _, err := strconv.ParseFloat(row[idx], 64); err != nil {
			errors = append(errors, ValidationError{
				Row:    rowNum,
				Field:  "Amount",
				Reason: "Amount must be a valid number",
				Value:  row[idx],
			})
		}
	}

	return errors
}

// validateDonationType checks if a donation type is valid
func validateDonationType(donationType string) bool {
	return donationType == "monetary" || donationType == "goods" // Changed "item" to "goods"
}

// ImportHelpRequestsFromCSV imports help requests from a CSV file
func ImportHelpRequestsFromCSV(c *gin.Context) {
	// Get file from form
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to get file",
			"details": err.Error(),
		})
		return
	}
	defer file.Close()

	// Read CSV
	reader := csv.NewReader(file)

	// Read header row
	header, err := reader.Read()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to read CSV header",
			"details": err.Error(),
		})
		return
	}

	// Verify required columns
	requiredColumns := []string{"Visitor Name", "Email", "Phone", "Postcode", "Category", "Status"}
	columnIndices := make(map[string]int)

	for _, col := range requiredColumns {
		found := false
		for i, h := range header {
			if h == col {
				columnIndices[col] = i
				found = true
				break
			}
		}
		if !found {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("Required column '%s' not found in CSV", col),
			})
			return
		}
	}

	// Map other optional column indices
	for i, h := range header {
		if _, exists := columnIndices[h]; !exists {
			columnIndices[h] = i
		}
	}

	// Process rows
	var requests []models.HelpRequest
	var validationErrors []ValidationError
	rowsProcessed := 0
	rowsFailed := 0
	rowsImported := 0 // Add this declaration

	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			validationErrors = append(validationErrors, ValidationError{
				Row:    rowsProcessed + 2,
				Field:  "row",
				Reason: "Failed to read row",
				Value:  err.Error(),
			})
			rowsFailed++
			continue
		}
		rowsProcessed++

		// Extract data from columns
		request := models.HelpRequest{
			VisitorName: row[columnIndices["Visitor Name"]],
			Email:       row[columnIndices["Email"]],
			Phone:       row[columnIndices["Phone"]],
			Postcode:    row[columnIndices["Postcode"]],
			Category:    row[columnIndices["Category"]],
			Status:      row[columnIndices["Status"]],
		}

		// Validate row data
		rowErrors := validateHelpRequestRow(row, columnIndices, rowsProcessed+1)
		if len(rowErrors) > 0 {
			validationErrors = append(validationErrors, rowErrors...)
			rowsFailed++
			continue
		}

		// Handle optional fields
		if idx, exists := columnIndices["Details"]; exists && idx < len(row) {
			request.Details = row[idx]
		}

		if idx, exists := columnIndices["Visit Day"]; exists && idx < len(row) {
			request.VisitDay = row[idx]
		}

		if idx, exists := columnIndices["Time Slot"]; exists && idx < len(row) {
			request.TimeSlot = row[idx]
		}

		if idx, exists := columnIndices["Reference"]; exists && idx < len(row) && row[idx] != "" {
			request.Reference = row[idx]
		} else {
			// Generate a reference code
			request.Reference = fmt.Sprintf("HR-%s-IMP", request.Category[:1])
		}

		// New field: Assigned Staff ID
		if idx, exists := columnIndices["Assigned Staff ID"]; exists && idx < len(row) && row[idx] != "" {
			staffID, err := strconv.ParseUint(row[idx], 10, 32)
			if err == nil {
				request.AssignedStaffID = uintPtr(uint(staffID))
			}
		}

		requests = append(requests, request)
	}

	// Process validation results
	if len(validationErrors) > 0 && len(requests) == 0 {
		c.JSON(http.StatusBadRequest, ImportResponse{
			Success:      false,
			RowsImported: 0,
			RowsFailed:   rowsFailed,
			Errors:       validationErrors,
		})
		return
	}

	// Save valid help requests to database
	for i := range requests {
		if err := db.DB.Create(&requests[i]).Error; err != nil {
			log.Printf("Error saving help request: %v", err)
			rowsFailed++
		} else {
			// Update the reference code if it was auto-generated
			if strings.Contains(requests[i].Reference, "IMP") {
				updatedRef := fmt.Sprintf("HR-%s-%d", strings.ToUpper(requests[i].Category[:1]), requests[i].ID)
				if err := db.DB.Model(&requests[i]).Update("reference", updatedRef).Error; err != nil {
					log.Printf("Failed to update reference code: %v", err)
				}
			}
			rowsImported++
		}
	}

	// Return results
	c.JSON(http.StatusOK, ImportResponse{
		Success:      rowsImported > 0,
		RowsImported: rowsImported,
		RowsFailed:   rowsFailed,
		Errors:       validationErrors,
		Message:      fmt.Sprintf("Import completed: %d successful, %d failed", rowsImported, rowsFailed),
	})
}

// validateHelpRequestRow validates a row of help request data
func validateHelpRequestRow(row []string, columnIndices map[string]int, rowNum int) []ValidationError {
	var errors []ValidationError

	// Check required fields
	if idx, exists := columnIndices["Visitor Name"]; !exists || idx >= len(row) || row[idx] == "" {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Visitor Name",
			Reason: "Visitor Name is required",
		})
	}

	if idx, exists := columnIndices["Email"]; !exists || idx >= len(row) || row[idx] == "" {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Email",
			Reason: "Email is required",
		})
	} else if shared.ValidateEmail(row[idx]) != nil {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Email",
			Reason: "Invalid email format",
			Value:  row[idx],
		})
	}

	if idx, exists := columnIndices["Phone"]; !exists || idx >= len(row) || row[idx] == "" {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Phone",
			Reason: "Phone is required",
		})
	}

	if idx, exists := columnIndices["Postcode"]; !exists || idx >= len(row) || row[idx] == "" {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Postcode",
			Reason: "Postcode is required",
		})
	}

	if idx, exists := columnIndices["Category"]; !exists || idx >= len(row) || row[idx] == "" {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Category",
			Reason: "Category is required",
		})
	}

	if idx, exists := columnIndices["Status"]; !exists || idx >= len(row) || row[idx] == "" {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Status",
			Reason: "Status is required",
		})
	} else if !validateHelpRequestStatus(row[idx]) {
		errors = append(errors, ValidationError{
			Row:    rowNum,
			Field:  "Status",
			Reason: "Invalid status. Must be New, InProgress, Assigned, Fulfilled, or Closed",
			Value:  row[idx],
		})
	}

	return errors
}

// validateHelpRequestStatus checks if a help request status is valid
func validateHelpRequestStatus(status string) bool {
	validStatuses := []string{"New", "Pending", "Approved", "Rejected", "Completed", "Cancelled"}
	for _, valid := range validStatuses {
		if status == valid {
			return true
		}
	}
	return false
}

// PortHelpRequestsFromCSV updates existing help requests from a CSV file (does not create new records)
func PortHelpRequestsFromCSV(c *gin.Context) {
	// Get file from form
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to get file",
			"details": err.Error(),
		})
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	header, err := reader.Read()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to read CSV header",
			"details": err.Error(),
		})
		return
	}

	// Accept either "Reference" or "ID" as unique identifier
	var idCol, refCol int = -1, -1
	for i, h := range header {
		if h == "ID" {
			idCol = i
		}
		if h == "Reference" {
			refCol = i
		}
	}
	if idCol == -1 && refCol == -1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "CSV must contain either 'ID' or 'Reference' column",
		})
		return
	}

	// Map other columns
	colIdx := make(map[string]int)
	for i, h := range header {
		colIdx[h] = i
	}

	var updated, failed int
	var errors []ValidationError
	rowNum := 1

	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		rowNum++
		if err != nil {
			errors = append(errors, ValidationError{
				Row:    rowNum,
				Field:  "row",
				Reason: "Failed to read row",
				Value:  err.Error(),
			})
			failed++
			continue
		}

		var helpRequest models.HelpRequest
		var lookupErr error

		// Lookup by ID or Reference
		if idCol != -1 && colIdx["ID"] < len(row) && row[idCol] != "" {
			id, err := strconv.Atoi(row[idCol])
			if err == nil {
				lookupErr = db.DB.First(&helpRequest, id).Error
			} else {
				lookupErr = fmt.Errorf("invalid ID: %s", row[idCol])
			}
		} else if refCol != -1 && colIdx["Reference"] < len(row) && row[refCol] != "" {
			lookupErr = db.DB.Where("reference = ?", row[refCol]).First(&helpRequest).Error
		} else {
			lookupErr = fmt.Errorf("missing identifier")
		}

		if lookupErr != nil {
			errors = append(errors, ValidationError{
				Row:    rowNum,
				Field:  "ID/Reference",
				Reason: "Help request not found",
			})
			failed++
			continue
		}

		// Update fields if present in CSV
		updates := make(map[string]interface{})
		for field, idx := range colIdx {
			if idx >= len(row) {
				continue
			}
			val := row[idx]
			switch field {
			case "Visitor Name":
				updates["visitor_name"] = val
			case "Email":
				updates["email"] = val
			case "Phone":
				updates["phone"] = val
			case "Postcode":
				updates["postcode"] = val
			case "Category":
				updates["category"] = val
			case "Status":
				updates["status"] = val
			case "Details":
				updates["details"] = val
			case "Visit Day":
				updates["visit_day"] = val
			case "Time Slot":
				updates["time_slot"] = val
			case "Assigned Staff ID":
				if staffID, err := strconv.ParseUint(val, 10, 32); err == nil && staffID > 0 {
					updates["assigned_staff_id"] = uint(staffID)
				}
			case "Notes":
				updates["notes"] = val
			case "Priority":
				updates["priority"] = val
			}
		}

		// Update timestamp
		updates["updated_at"] = time.Now()

		if len(updates) <= 1 { // Only updated_at
			errors = append(errors, ValidationError{
				Row:    rowNum,
				Field:  "row",
				Reason: "No updatable fields found",
			})
			failed++
			continue
		}

		if err := db.DB.Model(&helpRequest).Updates(updates).Error; err != nil {
			errors = append(errors, ValidationError{
				Row:    rowNum,
				Field:  "update",
				Reason: "Failed to update help request",
				Value:  err.Error(),
			})
			failed++
			continue
		}
		updated++
	}

	c.JSON(http.StatusOK, ImportResponse{
		Success:      failed == 0,
		RowsImported: updated,
		RowsFailed:   failed,
		Errors:       errors,
		Message:      fmt.Sprintf("Updated %d help requests, %d failed", updated, failed),
	})
}

// Helper function to safely get column value
func getColumnValue(row []string, columnIndices map[string]int, columnName string) string {
	if idx, exists := columnIndices[columnName]; exists && idx < len(row) {
		return row[idx]
	}
	return ""
}

func uintPtr(u uint) *uint { return &u }
