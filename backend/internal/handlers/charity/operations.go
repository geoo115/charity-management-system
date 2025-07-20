package charity

import (
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/gin-gonic/gin"
)

// CharityHandler provides simplified handlers for charity operations
type CharityHandler struct {
	repo *db.CharityRepository
}

// NewCharityHandler creates a new charity handler
func NewCharityHandler(repo *db.CharityRepository) *CharityHandler {
	return &CharityHandler{repo: repo}
}

// GetCharityDashboard returns simplified dashboard data
func (ch *CharityHandler) GetCharityDashboard(c *gin.Context) {
	stats, err := ch.repo.GetDashboardStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get dashboard stats",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"stats": stats,
		},
	})
}

// GetCharityUsers returns users by role
func (ch *CharityHandler) GetCharityUsers(c *gin.Context) {
	role := c.Query("role")

	var users []models.CharityUser
	var err error

	if role != "" {
		users, err = ch.repo.GetUsersByRole(role)
	} else {
		// Get all users if no role specified
		users, err = ch.repo.GetUsersByRole("")
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get users",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    users,
	})
}

// GetCharityUser returns a specific user
func (ch *CharityHandler) GetCharityUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid user ID",
		})
		return
	}

	user, err := ch.repo.GetUserByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}

// CreateCharityUser creates a new user
func (ch *CharityHandler) CreateCharityUser(c *gin.Context) {
	var user models.CharityUser
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request data",
		})
		return
	}

	if err := ch.repo.CreateUser(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create user",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    user,
	})
}

// UpdateCharityUser updates a user
func (ch *CharityHandler) UpdateCharityUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid user ID",
		})
		return
	}

	var user models.CharityUser
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request data",
		})
		return
	}

	user.ID = uint(id)
	if err := ch.repo.UpdateUser(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}

// GetCharityHelpRequests returns help requests
func (ch *CharityHandler) GetCharityHelpRequests(c *gin.Context) {
	status := c.Query("status")

	var requests []models.CharityHelpRequest
	var err error

	if status != "" {
		requests, err = ch.repo.GetHelpRequestsByStatus(status)
	} else {
		// Get all requests if no status specified
		requests, err = ch.repo.GetHelpRequestsByStatus("")
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get help requests",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    requests,
	})
}

// GetCharityHelpRequest returns a specific help request
func (ch *CharityHandler) GetCharityHelpRequest(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid help request ID",
		})
		return
	}

	request, err := ch.repo.GetHelpRequestByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Help request not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    request,
	})
}

// CreateCharityHelpRequest creates a new help request
func (ch *CharityHandler) CreateCharityHelpRequest(c *gin.Context) {
	var request models.CharityHelpRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request data",
		})
		return
	}

	if err := ch.repo.CreateHelpRequest(&request); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create help request",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    request,
	})
}

// UpdateCharityHelpRequest updates a help request
func (ch *CharityHandler) UpdateCharityHelpRequest(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid help request ID",
		})
		return
	}

	var request models.CharityHelpRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request data",
		})
		return
	}

	request.ID = uint(id)
	if err := ch.repo.UpdateHelpRequest(&request); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update help request",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    request,
	})
}

// GetCharityDonations returns donations
func (ch *CharityHandler) GetCharityDonations(c *gin.Context) {
	donorID := c.Query("donor_id")

	var donations []models.CharityDonation
	var err error

	if donorID != "" {
		id, err := strconv.ParseUint(donorID, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid donor ID",
			})
			return
		}
		donations, err = ch.repo.GetDonationsByDonor(uint(id))
	} else {
		// Get all donations if no donor specified
		donations, err = ch.repo.GetDonationsByDonor(0)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get donations",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    donations,
	})
}

// CreateCharityDonation creates a new donation
func (ch *CharityHandler) CreateCharityDonation(c *gin.Context) {
	var donation models.CharityDonation
	if err := c.ShouldBindJSON(&donation); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request data",
		})
		return
	}

	if err := ch.repo.CreateDonation(&donation); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create donation",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    donation,
	})
}

// GetCharityShifts returns shifts
func (ch *CharityHandler) GetCharityShifts(c *gin.Context) {
	dateStr := c.Query("date")

	var shifts []models.CharityShift
	var err error

	if dateStr != "" {
		date, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid date format",
			})
			return
		}
		shifts, err = ch.repo.GetShiftsByDate(date)
	} else {
		// Get available shifts if no date specified
		shifts, err = ch.repo.GetAvailableShifts()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get shifts",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    shifts,
	})
}

// CreateCharityShift creates a new shift
func (ch *CharityHandler) CreateCharityShift(c *gin.Context) {
	var shift models.CharityShift
	if err := c.ShouldBindJSON(&shift); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request data",
		})
		return
	}

	if err := ch.repo.CreateShift(&shift); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create shift",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    shift,
	})
}

// GetCharityShiftAssignments returns shift assignments
func (ch *CharityHandler) GetCharityShiftAssignments(c *gin.Context) {
	volunteerID := c.Query("volunteer_id")
	shiftID := c.Query("shift_id")

	var assignments []models.CharityShiftAssignment
	var err error

	if volunteerID != "" {
		id, err := strconv.ParseUint(volunteerID, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid volunteer ID",
			})
			return
		}
		assignments, err = ch.repo.GetShiftAssignmentsByVolunteer(uint(id))
	} else if shiftID != "" {
		id, err := strconv.ParseUint(shiftID, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid shift ID",
			})
			return
		}
		assignments, err = ch.repo.GetShiftAssignmentsByShift(uint(id))
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Must specify volunteer_id or shift_id",
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get shift assignments",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    assignments,
	})
}

// CreateCharityShiftAssignment creates a new shift assignment
func (ch *CharityHandler) CreateCharityShiftAssignment(c *gin.Context) {
	var assignment models.CharityShiftAssignment
	if err := c.ShouldBindJSON(&assignment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request data",
		})
		return
	}

	assignment.AssignedAt = time.Now()
	if err := ch.repo.CreateShiftAssignment(&assignment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create shift assignment",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    assignment,
	})
}
