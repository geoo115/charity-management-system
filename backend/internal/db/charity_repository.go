package db

import (
	"time"

	"github.com/geoo115/charity-management-system/internal/models"
	"gorm.io/gorm"
)

// CharityRepository provides simplified database operations for charity models
type CharityRepository struct {
	db *gorm.DB
}

// NewCharityRepository creates a new charity repository
func NewCharityRepository(db *gorm.DB) *CharityRepository {
	return &CharityRepository{db: db}
}

// User Operations
func (cr *CharityRepository) CreateUser(user *models.CharityUser) error {
	return cr.db.Create(user).Error
}

func (cr *CharityRepository) GetUserByID(id uint) (*models.CharityUser, error) {
	var user models.CharityUser
	err := cr.db.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (cr *CharityRepository) GetUserByEmail(email string) (*models.CharityUser, error) {
	var user models.CharityUser
	err := cr.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (cr *CharityRepository) GetUsersByRole(role string) ([]models.CharityUser, error) {
	var users []models.CharityUser
	err := cr.db.Where("role = ?", role).Find(&users).Error
	return users, err
}

func (cr *CharityRepository) UpdateUser(user *models.CharityUser) error {
	return cr.db.Save(user).Error
}

func (cr *CharityRepository) DeleteUser(id uint) error {
	return cr.db.Delete(&models.CharityUser{}, id).Error
}

// Help Request Operations
func (cr *CharityRepository) CreateHelpRequest(request *models.CharityHelpRequest) error {
	return cr.db.Create(request).Error
}

func (cr *CharityRepository) GetHelpRequestByID(id uint) (*models.CharityHelpRequest, error) {
	var request models.CharityHelpRequest
	err := cr.db.Preload("User").First(&request, id).Error
	if err != nil {
		return nil, err
	}
	return &request, nil
}

func (cr *CharityRepository) GetHelpRequestsByStatus(status string) ([]models.CharityHelpRequest, error) {
	var requests []models.CharityHelpRequest
	err := cr.db.Preload("User").Where("status = ?", status).Find(&requests).Error
	return requests, err
}

func (cr *CharityRepository) GetHelpRequestsByUser(userID uint) ([]models.CharityHelpRequest, error) {
	var requests []models.CharityHelpRequest
	err := cr.db.Preload("User").Where("user_id = ?", userID).Find(&requests).Error
	return requests, err
}

func (cr *CharityRepository) UpdateHelpRequest(request *models.CharityHelpRequest) error {
	return cr.db.Save(request).Error
}

func (cr *CharityRepository) DeleteHelpRequest(id uint) error {
	return cr.db.Delete(&models.CharityHelpRequest{}, id).Error
}

// Donation Operations
func (cr *CharityRepository) CreateDonation(donation *models.CharityDonation) error {
	return cr.db.Create(donation).Error
}

func (cr *CharityRepository) GetDonationByID(id uint) (*models.CharityDonation, error) {
	var donation models.CharityDonation
	err := cr.db.Preload("Donor").First(&donation, id).Error
	if err != nil {
		return nil, err
	}
	return &donation, nil
}

func (cr *CharityRepository) GetDonationsByDonor(donorID uint) ([]models.CharityDonation, error) {
	var donations []models.CharityDonation
	err := cr.db.Preload("Donor").Where("donor_id = ?", donorID).Find(&donations).Error
	return donations, err
}

func (cr *CharityRepository) GetTotalDonations() (float64, error) {
	var total float64
	err := cr.db.Model(&models.CharityDonation{}).Select("COALESCE(SUM(amount), 0)").Scan(&total).Error
	return total, err
}

func (cr *CharityRepository) UpdateDonation(donation *models.CharityDonation) error {
	return cr.db.Save(donation).Error
}

func (cr *CharityRepository) DeleteDonation(id uint) error {
	return cr.db.Delete(&models.CharityDonation{}, id).Error
}

// Shift Operations
func (cr *CharityRepository) CreateShift(shift *models.CharityShift) error {
	return cr.db.Create(shift).Error
}

func (cr *CharityRepository) GetShiftByID(id uint) (*models.CharityShift, error) {
	var shift models.CharityShift
	err := cr.db.First(&shift, id).Error
	if err != nil {
		return nil, err
	}
	return &shift, nil
}

func (cr *CharityRepository) GetShiftsByDate(date time.Time) ([]models.CharityShift, error) {
	var shifts []models.CharityShift
	err := cr.db.Where("DATE(date) = ?", date.Format("2006-01-02")).Find(&shifts).Error
	return shifts, err
}

func (cr *CharityRepository) GetAvailableShifts() ([]models.CharityShift, error) {
	var shifts []models.CharityShift
	err := cr.db.Where("status = ? AND date >= ?", "open", time.Now()).Find(&shifts).Error
	return shifts, err
}

func (cr *CharityRepository) UpdateShift(shift *models.CharityShift) error {
	return cr.db.Save(shift).Error
}

func (cr *CharityRepository) DeleteShift(id uint) error {
	return cr.db.Delete(&models.CharityShift{}, id).Error
}

// Shift Assignment Operations
func (cr *CharityRepository) CreateShiftAssignment(assignment *models.CharityShiftAssignment) error {
	return cr.db.Create(assignment).Error
}

func (cr *CharityRepository) GetShiftAssignmentByID(id uint) (*models.CharityShiftAssignment, error) {
	var assignment models.CharityShiftAssignment
	err := cr.db.Preload("Shift").Preload("Volunteer").First(&assignment, id).Error
	if err != nil {
		return nil, err
	}
	return &assignment, nil
}

func (cr *CharityRepository) GetShiftAssignmentsByVolunteer(volunteerID uint) ([]models.CharityShiftAssignment, error) {
	var assignments []models.CharityShiftAssignment
	err := cr.db.Preload("Shift").Where("volunteer_id = ?", volunteerID).Find(&assignments).Error
	return assignments, err
}

func (cr *CharityRepository) GetShiftAssignmentsByShift(shiftID uint) ([]models.CharityShiftAssignment, error) {
	var assignments []models.CharityShiftAssignment
	err := cr.db.Preload("Volunteer").Where("shift_id = ?", shiftID).Find(&assignments).Error
	return assignments, err
}

func (cr *CharityRepository) UpdateShiftAssignment(assignment *models.CharityShiftAssignment) error {
	return cr.db.Save(assignment).Error
}

func (cr *CharityRepository) DeleteShiftAssignment(id uint) error {
	return cr.db.Delete(&models.CharityShiftAssignment{}, id).Error
}

// Document Operations
func (cr *CharityRepository) CreateDocument(document *models.CharityDocument) error {
	return cr.db.Create(document).Error
}

func (cr *CharityRepository) GetDocumentByID(id uint) (*models.CharityDocument, error) {
	var document models.CharityDocument
	err := cr.db.Preload("User").First(&document, id).Error
	if err != nil {
		return nil, err
	}
	return &document, nil
}

func (cr *CharityRepository) GetDocumentsByUser(userID uint) ([]models.CharityDocument, error) {
	var documents []models.CharityDocument
	err := cr.db.Preload("User").Where("user_id = ?", userID).Find(&documents).Error
	return documents, err
}

func (cr *CharityRepository) GetDocumentsByStatus(status string) ([]models.CharityDocument, error) {
	var documents []models.CharityDocument
	err := cr.db.Preload("User").Where("status = ?", status).Find(&documents).Error
	return documents, err
}

func (cr *CharityRepository) UpdateDocument(document *models.CharityDocument) error {
	return cr.db.Save(document).Error
}

func (cr *CharityRepository) DeleteDocument(id uint) error {
	return cr.db.Delete(&models.CharityDocument{}, id).Error
}

// Notification Operations
func (cr *CharityRepository) CreateNotification(notification *models.CharityNotification) error {
	return cr.db.Create(notification).Error
}

func (cr *CharityRepository) GetNotificationByID(id uint) (*models.CharityNotification, error) {
	var notification models.CharityNotification
	err := cr.db.Preload("User").First(&notification, id).Error
	if err != nil {
		return nil, err
	}
	return &notification, nil
}

func (cr *CharityRepository) GetNotificationsByUser(userID uint) ([]models.CharityNotification, error) {
	var notifications []models.CharityNotification
	err := cr.db.Preload("User").Where("user_id = ?", userID).Order("created_at DESC").Find(&notifications).Error
	return notifications, err
}

func (cr *CharityRepository) GetUnreadNotificationsByUser(userID uint) ([]models.CharityNotification, error) {
	var notifications []models.CharityNotification
	err := cr.db.Preload("User").Where("user_id = ? AND read_at IS NULL", userID).Find(&notifications).Error
	return notifications, err
}

func (cr *CharityRepository) UpdateNotification(notification *models.CharityNotification) error {
	return cr.db.Save(notification).Error
}

func (cr *CharityRepository) DeleteNotification(id uint) error {
	return cr.db.Delete(&models.CharityNotification{}, id).Error
}

// Feedback Operations
func (cr *CharityRepository) CreateFeedback(feedback *models.CharityFeedback) error {
	return cr.db.Create(feedback).Error
}

func (cr *CharityRepository) GetFeedbackByID(id uint) (*models.CharityFeedback, error) {
	var feedback models.CharityFeedback
	err := cr.db.Preload("User").First(&feedback, id).Error
	if err != nil {
		return nil, err
	}
	return &feedback, nil
}

func (cr *CharityRepository) GetFeedbackByType(feedbackType string) ([]models.CharityFeedback, error) {
	var feedbacks []models.CharityFeedback
	err := cr.db.Preload("User").Where("type = ?", feedbackType).Find(&feedbacks).Error
	return feedbacks, err
}

func (cr *CharityRepository) UpdateFeedback(feedback *models.CharityFeedback) error {
	return cr.db.Save(feedback).Error
}

func (cr *CharityRepository) DeleteFeedback(id uint) error {
	return cr.db.Delete(&models.CharityFeedback{}, id).Error
}

// Visit Operations
func (cr *CharityRepository) CreateVisit(visit *models.CharityVisit) error {
	return cr.db.Create(visit).Error
}

func (cr *CharityRepository) GetVisitByID(id uint) (*models.CharityVisit, error) {
	var visit models.CharityVisit
	err := cr.db.Preload("User").First(&visit, id).Error
	if err != nil {
		return nil, err
	}
	return &visit, nil
}

func (cr *CharityRepository) GetVisitsByUser(userID uint) ([]models.CharityVisit, error) {
	var visits []models.CharityVisit
	err := cr.db.Preload("User").Where("user_id = ?", userID).Order("check_in_time DESC").Find(&visits).Error
	return visits, err
}

func (cr *CharityRepository) UpdateVisit(visit *models.CharityVisit) error {
	return cr.db.Save(visit).Error
}

func (cr *CharityRepository) DeleteVisit(id uint) error {
	return cr.db.Delete(&models.CharityVisit{}, id).Error
}

// System Config Operations
func (cr *CharityRepository) GetSystemConfig(key string) (*models.CharitySystemConfig, error) {
	var config models.CharitySystemConfig
	err := cr.db.Where("key = ?", key).First(&config).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}

func (cr *CharityRepository) UpdateSystemConfig(config *models.CharitySystemConfig) error {
	return cr.db.Save(config).Error
}

// Dashboard Statistics
func (cr *CharityRepository) GetDashboardStats() (map[string]interface{}, error) {
	var userCount, volunteerCount, helpRequestCount, donationCount int64
	var totalDonations float64

	// Count users
	cr.db.Model(&models.CharityUser{}).Count(&userCount)

	// Count volunteers
	cr.db.Model(&models.CharityUser{}).Where("role = ?", "volunteer").Count(&volunteerCount)

	// Count help requests
	cr.db.Model(&models.CharityHelpRequest{}).Count(&helpRequestCount)

	// Count donations and total amount
	cr.db.Model(&models.CharityDonation{}).Count(&donationCount)
	cr.db.Model(&models.CharityDonation{}).Select("COALESCE(SUM(amount), 0)").Scan(&totalDonations)

	return map[string]interface{}{
		"total_users":         userCount,
		"total_volunteers":    volunteerCount,
		"total_help_requests": helpRequestCount,
		"total_donations":     donationCount,
		"total_amount":        totalDonations,
	}, nil
}
