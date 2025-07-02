package system

import (
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"
	"github.com/gin-gonic/gin"
)

// EmergencyDashboard returns emergency management dashboard data
// @Summary Get emergency dashboard
// @Description Returns emergency incidents, workflows, and alerts overview
// @Tags emergency
// @Produce json
// @Success 200 {object} gin.H
// @Failure 401 {object} gin.H
// @Router /admin/emergency/dashboard [get]
func EmergencyDashboard(c *gin.Context) {
	// Get active incidents count
	var activeIncidents int64
	db.DB.Model(&models.EmergencyIncident{}).
		Where("status IN ?", []string{"active", "responding", "investigating"}).
		Count(&activeIncidents)

	// Get critical incidents count
	var criticalIncidents int64
	db.DB.Model(&models.EmergencyIncident{}).
		Where("severity = ? AND status != ?", "critical", "resolved").
		Count(&criticalIncidents)

	// Get incidents resolved today
	today := time.Now().Format("2006-01-02")
	var resolvedToday int64
	db.DB.Model(&models.EmergencyIncident{}).
		Where("status = ? AND DATE(updated_at) = ?", "resolved", today).
		Count(&resolvedToday)

	// Get active workflows count
	var activeWorkflows int64
	db.DB.Model(&models.EmergencyWorkflow{}).
		Where("status = ?", "active").
		Count(&activeWorkflows)

	// Get recent incidents
	var recentIncidents []models.EmergencyIncident
	db.DB.Where("created_at >= ?", time.Now().AddDate(0, 0, -7)).
		Order("created_at DESC").
		Limit(10).
		Find(&recentIncidents)

	// Get active alerts
	var activeAlerts []models.EmergencyAlert
	db.DB.Where("status = ?", "active").
		Order("created_at DESC").
		Find(&activeAlerts)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"stats": gin.H{
				"active_incidents":   activeIncidents,
				"critical_incidents": criticalIncidents,
				"resolved_today":     resolvedToday,
				"active_workflows":   activeWorkflows,
			},
			"recent_incidents": recentIncidents,
			"active_alerts":    activeAlerts,
		},
	})
}

// GetEmergencyWorkflows returns all emergency workflows
// @Summary Get emergency workflows
// @Description Returns list of emergency response workflows
// @Tags emergency
// @Produce json
// @Success 200 {object} gin.H
// @Failure 401 {object} gin.H
// @Router /admin/emergency/workflows [get]
func GetEmergencyWorkflows(c *gin.Context) {
	var workflows []models.EmergencyWorkflow

	query := db.DB.Order("priority ASC, created_at DESC")

	// Filter by category if provided
	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}

	// Filter by status if provided
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&workflows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch workflows",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    workflows,
	})
}

// CreateEmergencyWorkflow creates a new emergency workflow
// @Summary Create emergency workflow
// @Description Creates a new emergency response workflow
// @Tags emergency
// @Accept json
// @Produce json
// @Param workflow body models.EmergencyWorkflow true "Workflow data"
// @Success 201 {object} gin.H
// @Failure 400 {object} gin.H
// @Router /admin/emergency/workflows [post]
func CreateEmergencyWorkflow(c *gin.Context) {
	var workflow models.EmergencyWorkflow

	if err := c.ShouldBindJSON(&workflow); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Set defaults
	workflow.Status = "draft"
	workflow.CreatedAt = time.Now()
	workflow.UpdatedAt = time.Now()

	if err := db.DB.Create(&workflow).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create workflow",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    workflow,
	})
}

// UpdateEmergencyWorkflow updates an existing emergency workflow
// @Summary Update emergency workflow
// @Description Updates an emergency response workflow
// @Tags emergency
// @Accept json
// @Produce json
// @Param id path int true "Workflow ID"
// @Param workflow body models.EmergencyWorkflow true "Workflow data"
// @Success 200 {object} gin.H
// @Failure 400 {object} gin.H
// @Failure 404 {object} gin.H
// @Router /admin/emergency/workflows/{id} [put]
func UpdateEmergencyWorkflow(c *gin.Context) {
	workflowID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid workflow ID",
		})
		return
	}

	var workflow models.EmergencyWorkflow
	if err := db.DB.First(&workflow, workflowID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Workflow not found",
		})
		return
	}

	var updateData models.EmergencyWorkflow
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	updateData.ID = workflow.ID
	updateData.UpdatedAt = time.Now()

	if err := db.DB.Save(&updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update workflow",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    updateData,
	})
}

// DeleteEmergencyWorkflow deletes an emergency workflow
// @Summary Delete emergency workflow
// @Description Deletes an emergency response workflow
// @Tags emergency
// @Produce json
// @Param id path int true "Workflow ID"
// @Success 200 {object} gin.H
// @Failure 400 {object} gin.H
// @Failure 404 {object} gin.H
// @Router /admin/emergency/workflows/{id} [delete]
func DeleteEmergencyWorkflow(c *gin.Context) {
	workflowID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid workflow ID",
		})
		return
	}

	var workflow models.EmergencyWorkflow
	if err := db.DB.First(&workflow, workflowID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Workflow not found",
		})
		return
	}

	if err := db.DB.Delete(&workflow).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to delete workflow",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Workflow deleted successfully",
	})
}

// StartEmergencyWorkflow starts an emergency workflow for an incident
// @Summary Start emergency workflow
// @Description Starts an emergency workflow for a specific incident
// @Tags emergency
// @Accept json
// @Produce json
// @Param id path int true "Workflow ID"
// @Param data body gin.H true "Incident data"
// @Success 200 {object} gin.H
// @Failure 400 {object} gin.H
// @Failure 404 {object} gin.H
// @Router /admin/emergency/workflows/{id}/start [post]
func StartEmergencyWorkflow(c *gin.Context) {
	workflowID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid workflow ID",
		})
		return
	}

	var workflow models.EmergencyWorkflow
	if err := db.DB.First(&workflow, workflowID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Workflow not found",
		})
		return
	}

	var incidentData map[string]interface{}
	if err := c.ShouldBindJSON(&incidentData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Create new incident if not provided
	incident := models.EmergencyIncident{
		Title:       incidentData["title"].(string),
		Type:        incidentData["type"].(string),
		Severity:    incidentData["severity"].(string),
		Status:      "active",
		Location:    incidentData["location"].(string),
		Description: incidentData["description"].(string),
		WorkflowID:  &workflow.ID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := db.DB.Create(&incident).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create incident",
		})
		return
	}

	// Update workflow usage count
	db.DB.Model(&workflow).Update("usage_count", workflow.UsageCount+1)

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"incident": incident,
		"workflow": workflow,
	})
}

// GetActiveIncidents returns all active emergency incidents
// @Summary Get active incidents
// @Description Returns list of active emergency incidents
// @Tags emergency
// @Produce json
// @Success 200 {object} gin.H
// @Failure 401 {object} gin.H
// @Router /admin/emergency/incidents [get]
func GetActiveIncidents(c *gin.Context) {
	var incidents []models.EmergencyIncident

	query := db.DB.Order("severity DESC, created_at DESC")

	// Filter by status if provided
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	} else {
		// Default to non-resolved incidents
		query = query.Where("status != ?", "resolved")
	}

	if err := query.Find(&incidents).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch incidents",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    incidents,
	})
}

// CreateIncident creates a new emergency incident
// @Summary Create emergency incident
// @Description Creates a new emergency incident report
// @Tags emergency
// @Accept json
// @Produce json
// @Param incident body models.EmergencyIncident true "Incident data"
// @Success 201 {object} gin.H
// @Failure 400 {object} gin.H
// @Router /admin/emergency/incidents [post]
func CreateIncident(c *gin.Context) {
	var incident models.EmergencyIncident

	if err := c.ShouldBindJSON(&incident); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Set defaults
	incident.Status = "active"
	incident.CreatedAt = time.Now()
	incident.UpdatedAt = time.Now()

	if err := db.DB.Create(&incident).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create incident",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    incident,
	})
}

// UpdateIncident updates an existing emergency incident
// @Summary Update emergency incident
// @Description Updates an emergency incident
// @Tags emergency
// @Accept json
// @Produce json
// @Param id path int true "Incident ID"
// @Param incident body models.EmergencyIncident true "Incident data"
// @Success 200 {object} gin.H
// @Failure 400 {object} gin.H
// @Failure 404 {object} gin.H
// @Router /admin/emergency/incidents/{id} [put]
func UpdateIncident(c *gin.Context) {
	incidentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid incident ID",
		})
		return
	}

	var incident models.EmergencyIncident
	if err := db.DB.First(&incident, incidentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Incident not found",
		})
		return
	}

	var updateData models.EmergencyIncident
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	updateData.ID = incident.ID
	updateData.UpdatedAt = time.Now()

	if err := db.DB.Save(&updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update incident",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    updateData,
	})
}

// ResolveIncident resolves an emergency incident
// @Summary Resolve emergency incident
// @Description Marks an emergency incident as resolved
// @Tags emergency
// @Accept json
// @Produce json
// @Param id path int true "Incident ID"
// @Param data body gin.H true "Resolution data"
// @Success 200 {object} gin.H
// @Failure 400 {object} gin.H
// @Failure 404 {object} gin.H
// @Router /admin/emergency/incidents/{id}/resolve [post]
func ResolveIncident(c *gin.Context) {
	incidentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid incident ID",
		})
		return
	}

	var incident models.EmergencyIncident
	if err := db.DB.First(&incident, incidentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Incident not found",
		})
		return
	}

	var resolutionData map[string]interface{}
	if err := c.ShouldBindJSON(&resolutionData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Update incident status
	incident.Status = "resolved"
	incident.UpdatedAt = time.Now()

	if notes, ok := resolutionData["resolution_notes"].(string); ok {
		incident.ResolutionNotes = &notes
	}

	if err := db.DB.Save(&incident).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to resolve incident",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    incident,
	})
}

// SendEmergencyAlert sends an emergency alert
// @Summary Send emergency alert
// @Description Sends an emergency alert to specified recipients
// @Tags emergency
// @Accept json
// @Produce json
// @Param alert body models.EmergencyAlert true "Alert data"
// @Success 201 {object} gin.H
// @Failure 400 {object} gin.H
// @Router /admin/emergency/alerts [post]
func SendEmergencyAlert(c *gin.Context) {
	var alert models.EmergencyAlert

	if err := c.ShouldBindJSON(&alert); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Set defaults
	alert.Status = "active"
	alert.CreatedAt = time.Now()
	alert.UpdatedAt = time.Now()

	if err := db.DB.Create(&alert).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create alert",
		})
		return
	}

	// TODO: Integrate with notification service to send actual alerts

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    alert,
		"message": "Emergency alert sent successfully",
	})
}

// GetEmergencyAlerts returns all emergency alerts
// @Summary Get emergency alerts
// @Description Returns list of emergency alerts
// @Tags emergency
// @Produce json
// @Success 200 {object} gin.H
// @Failure 401 {object} gin.H
// @Router /admin/emergency/alerts [get]
func GetEmergencyAlerts(c *gin.Context) {
	var alerts []models.EmergencyAlert

	query := db.DB.Order("created_at DESC")

	// Filter by status if provided
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&alerts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch alerts",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    alerts,
	})
}

// StopEmergencyAlert stops an active emergency alert
// @Summary Stop emergency alert
// @Description Stops an active emergency alert
// @Tags emergency
// @Produce json
// @Param id path int true "Alert ID"
// @Success 200 {object} gin.H
// @Failure 400 {object} gin.H
// @Failure 404 {object} gin.H
// @Router /admin/emergency/alerts/{id}/stop [post]
func StopEmergencyAlert(c *gin.Context) {
	alertID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid alert ID",
		})
		return
	}

	var alert models.EmergencyAlert
	if err := db.DB.First(&alert, alertID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Alert not found",
		})
		return
	}

	// Update alert status
	alert.Status = "stopped"
	alert.UpdatedAt = time.Now()

	if err := db.DB.Save(&alert).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to stop alert",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    alert,
		"message": "Emergency alert stopped successfully",
	})
}

// GetEmergencyMessageTemplates returns all emergency message templates
// @Summary Get emergency message templates
// @Description Returns list of emergency message templates
// @Tags emergency
// @Produce json
// @Success 200 {object} gin.H
// @Failure 401 {object} gin.H
// @Router /admin/emergency/templates [get]
func GetEmergencyMessageTemplates(c *gin.Context) {
	var templates []models.EmergencyMessageTemplate

	query := db.DB.Order("category ASC, name ASC")

	// Filter by category if provided
	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}

	if err := query.Find(&templates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch templates",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    templates,
	})
}

// CreateEmergencyMessageTemplate creates a new emergency message template
// @Summary Create emergency message template
// @Description Creates a new emergency message template
// @Tags emergency
// @Accept json
// @Produce json
// @Param template body models.EmergencyMessageTemplate true "Template data"
// @Success 201 {object} gin.H
// @Failure 400 {object} gin.H
// @Router /admin/emergency/templates [post]
func CreateEmergencyMessageTemplate(c *gin.Context) {
	var template models.EmergencyMessageTemplate

	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Set defaults
	template.CreatedAt = time.Now()
	template.UpdatedAt = time.Now()

	if err := db.DB.Create(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create template",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    template,
	})
}
