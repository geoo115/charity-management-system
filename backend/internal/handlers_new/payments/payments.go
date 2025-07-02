package payments

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v74"
	"github.com/stripe/stripe-go/v74/customer"
	"github.com/stripe/stripe-go/v74/paymentmethod"
	"github.com/stripe/stripe-go/v74/refund"
	"github.com/stripe/stripe-go/v74/webhook"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"
	"github.com/geoo115/LDH/internal/utils"
)

// PaymentIntentRequest represents the request for creating a payment intent
type PaymentIntentRequest struct {
	Amount          int64             `json:"amount" binding:"required,min=100"` // Amount in pence
	Currency        string            `json:"currency" binding:"required"`
	PaymentMethodID string            `json:"paymentMethodId,omitempty"`
	Recurring       *RecurringConfig  `json:"recurring,omitempty"`
	Metadata        map[string]string `json:"metadata,omitempty"`
}

// RecurringConfig represents recurring payment configuration
type RecurringConfig struct {
	Frequency string `json:"frequency" binding:"required,oneof=monthly quarterly yearly"`
	StartDate string `json:"startDate" binding:"required"`
}

// PaymentMethodResponse represents a saved payment method
type PaymentMethodResponse struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Last4       string `json:"last4,omitempty"`
	Brand       string `json:"brand,omitempty"`
	ExpiryMonth int64  `json:"expiryMonth,omitempty"`
	ExpiryYear  int64  `json:"expiryYear,omitempty"`
	IsDefault   bool   `json:"isDefault"`
}

// RefundRequest represents a refund request
type RefundRequest struct {
	PaymentIntentID string `json:"paymentIntentId" binding:"required"`
	Amount          int64  `json:"amount,omitempty"` // Partial refund amount
	Reason          string `json:"reason,omitempty"`
}

// Initialize Stripe
func init() {
	// Set Stripe API key from environment variable
	stripe.Key = "sk_test_..." // This should come from environment variables
}

// CreatePaymentIntent creates a new payment intent for donations
func CreatePaymentIntent(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var req PaymentIntentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate amount (minimum £1.00)
	if req.Amount < 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Minimum donation amount is £1.00"})
		return
	}

	// Mock payment intent creation
	paymentIntentID := fmt.Sprintf("pi_%d_%d", userID, time.Now().Unix())
	clientSecret := fmt.Sprintf("%s_secret_%d", paymentIntentID, time.Now().Unix())

	c.JSON(http.StatusOK, gin.H{
		"id":           paymentIntentID,
		"clientSecret": clientSecret,
		"amount":       req.Amount,
		"currency":     req.Currency,
		"status":       "requires_payment_method",
	})
}

// CreateSubscription creates a recurring donation subscription
func CreateSubscription(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var req PaymentIntentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Recurring == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Recurring configuration required"})
		return
	}

	// Mock subscription creation
	subscriptionID := fmt.Sprintf("sub_%d_%d", userID, time.Now().Unix())

	c.JSON(http.StatusOK, gin.H{
		"id":     subscriptionID,
		"status": "active",
	})
}

// SavePaymentMethod saves a payment method for future use
func SavePaymentMethod(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var req struct {
		PaymentMethodID string `json:"paymentMethodId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user
	var user models.User
	if err := db.GetDB().First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	customerID, err := getOrCreateStripeCustomer(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save payment method"})
		return
	}

	// Attach payment method to customer
	params := &stripe.PaymentMethodAttachParams{
		Customer: stripe.String(customerID),
	}

	pm, err := paymentmethod.Attach(req.PaymentMethodID, params)
	if err != nil {
		utils.CreateAuditLog(c, "SavePaymentMethod", "PaymentMethod", 0, fmt.Sprintf("Stripe error: %v", err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save payment method"})
		return
	}

	response := PaymentMethodResponse{
		ID:   pm.ID,
		Type: string(pm.Type),
	}

	if pm.Card != nil {
		response.Last4 = pm.Card.Last4
		response.Brand = string(pm.Card.Brand)
		response.ExpiryMonth = pm.Card.ExpMonth
		response.ExpiryYear = pm.Card.ExpYear
	}

	utils.CreateAuditLog(c, "SavePaymentMethod", "PaymentMethod", 0, "Payment method saved successfully")

	c.JSON(http.StatusOK, response)
}

// GetPaymentMethods retrieves saved payment methods
func GetPaymentMethods(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Get user
	var user models.User
	if err := db.GetDB().First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.StripeCustomerID == "" {
		c.JSON(http.StatusOK, []PaymentMethodResponse{})
		return
	}

	// Get payment methods from Stripe
	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(user.StripeCustomerID),
		Type:     stripe.String("card"),
	}

	iter := paymentmethod.List(params)
	var methods []PaymentMethodResponse

	for iter.Next() {
		pm := iter.PaymentMethod()
		method := PaymentMethodResponse{
			ID:   pm.ID,
			Type: string(pm.Type),
		}

		if pm.Card != nil {
			method.Last4 = pm.Card.Last4
			method.Brand = string(pm.Card.Brand)
			method.ExpiryMonth = pm.Card.ExpMonth
			method.ExpiryYear = pm.Card.ExpYear
		}

		methods = append(methods, method)
	}

	c.JSON(http.StatusOK, methods)
}

// DeletePaymentMethod removes a saved payment method
func DeletePaymentMethod(c *gin.Context) {
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	paymentMethodID := c.Param("id")
	if paymentMethodID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payment method ID required"})
		return
	}

	// Detach payment method
	_, err := paymentmethod.Detach(paymentMethodID, nil)
	if err != nil {
		utils.CreateAuditLog(c, "DeletePaymentMethod", "PaymentMethod", 0, fmt.Sprintf("Stripe error: %v", err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete payment method"})
		return
	}

	utils.CreateAuditLog(c, "DeletePaymentMethod", "PaymentMethod", 0, "Payment method deleted successfully")

	c.JSON(http.StatusOK, gin.H{"message": "Payment method deleted successfully"})
}

// ProcessRefund processes a refund for a payment
func ProcessRefund(c *gin.Context) {
	// Check admin role
	userRole, exists := c.Get("userRole")
	if !exists || userRole != "Admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	var req RefundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create refund parameters
	params := &stripe.RefundParams{
		PaymentIntent: stripe.String(req.PaymentIntentID),
	}

	if req.Amount > 0 {
		params.Amount = stripe.Int64(req.Amount)
	}

	if req.Reason != "" {
		params.Reason = stripe.String(req.Reason)
	}

	// Process refund
	r, err := refund.New(params)
	if err != nil {
		utils.CreateAuditLog(c, "ProcessRefund", "Refund", 0, fmt.Sprintf("Stripe error: %v", err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process refund"})
		return
	}

	// Update payment record
	var payment models.Payment
	if err := db.GetDB().Where("stripe_payment_id = ?", req.PaymentIntentID).First(&payment).Error; err == nil {
		payment.Status = "refunded"
		payment.RefundAmount = float64(r.Amount) / 100
		payment.RefundedAt = &time.Time{}
		*payment.RefundedAt = time.Now()
		db.GetDB().Save(&payment)
	}

	utils.CreateAuditLog(c, "ProcessRefund", "Refund", 0, fmt.Sprintf("Refund processed: %s", r.ID))

	c.JSON(http.StatusOK, gin.H{
		"id":     r.ID,
		"amount": r.Amount,
		"status": r.Status,
	})
}

// GetPaymentHistory retrieves payment history for a user
func GetPaymentHistory(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var payments []models.Payment
	if err := db.GetDB().Where("user_id = ?", userID).Order("created_at DESC").Find(&payments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payment history"})
		return
	}

	var history []gin.H
	for _, payment := range payments {
		item := gin.H{
			"id":        payment.ID,
			"amount":    payment.Amount,
			"currency":  payment.Currency,
			"status":    payment.Status,
			"type":      payment.Type,
			"createdAt": payment.CreatedAt,
		}

		if payment.RefundedAt != nil {
			item["refundedAt"] = payment.RefundedAt
			item["refundAmount"] = payment.RefundAmount
		}

		history = append(history, item)
	}

	c.JSON(http.StatusOK, history)
}

// WebhookHandler handles Stripe webhooks
func WebhookHandler(c *gin.Context) {
	payload, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	// Verify webhook signature
	endpointSecret := "whsec_..." // This should come from environment variables
	event, err := webhook.ConstructEvent(payload, c.GetHeader("Stripe-Signature"), endpointSecret)
	if err != nil {
		log.Printf("Webhook signature verification failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid signature"})
		return
	}

	// Handle the event
	switch event.Type {
	case "payment_intent.succeeded":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
			log.Printf("Failed to parse payment intent: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event data"})
			return
		}
		handlePaymentIntentSucceeded(pi)

	case "payment_intent.payment_failed":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
			log.Printf("Failed to parse payment intent: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event data"})
			return
		}
		handlePaymentIntentFailed(pi)

	case "invoice.payment_succeeded":
		var invoice stripe.Invoice
		if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
			log.Printf("Failed to parse invoice: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event data"})
			return
		}
		handleInvoicePaymentSucceeded(invoice)

	default:
		log.Printf("Unhandled event type: %s", event.Type)
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}

// Helper functions

func getOrCreateStripeCustomer(user models.User) (string, error) {
	if user.StripeCustomerID != "" {
		return user.StripeCustomerID, nil
	}

	// Create new customer
	params := &stripe.CustomerParams{
		Email: stripe.String(user.Email),
		Name:  stripe.String(user.FirstName + " " + user.LastName),
	}

	customer, err := customer.New(params)
	if err != nil {
		return "", err
	}

	// Update user record
	user.StripeCustomerID = customer.ID
	db.GetDB().Save(&user)

	return customer.ID, nil
}

func handlePaymentIntentSucceeded(pi stripe.PaymentIntent) {
	// Update payment record
	var payment models.Payment
	if err := db.GetDB().Where("stripe_payment_id = ?", pi.ID).First(&payment).Error; err == nil {
		payment.Status = "succeeded"
		payment.CompletedAt = &time.Time{}
		*payment.CompletedAt = time.Now()
		db.GetDB().Save(&payment)

		// Create donation record
		userID := payment.UserID
		donation := models.Donation{
			UserID:    &userID,
			Amount:    payment.Amount,
			Type:      "monetary",
			Status:    "completed",
			CreatedAt: time.Now(),
		}
		db.GetDB().Create(&donation)
	}
}

func handlePaymentIntentFailed(pi stripe.PaymentIntent) {
	// Update payment record
	var payment models.Payment
	if err := db.GetDB().Where("stripe_payment_id = ?", pi.ID).First(&payment).Error; err == nil {
		payment.Status = "failed"
		db.GetDB().Save(&payment)
	}
}

func handleInvoicePaymentSucceeded(invoice stripe.Invoice) {
	// Handle recurring payment success
	if invoice.Subscription != nil {
		var sub models.Subscription
		if err := db.GetDB().Where("stripe_subscription_id = ?", *invoice.Subscription).First(&sub).Error; err == nil {
			// Create donation record for recurring payment
			userID := sub.UserID
			subscriptionID := fmt.Sprintf("%d", sub.ID)
			donation := models.Donation{
				UserID:         &userID,
				Amount:         float64(invoice.AmountPaid) / 100,
				Type:           "monetary",
				Status:         "completed",
				IsRecurring:    true,
				SubscriptionID: subscriptionID,
				CreatedAt:      time.Now(),
			}
			db.GetDB().Create(&donation)

			// Update next payment date
			sub.NextPayment = time.Unix(invoice.PeriodEnd, 0)
			db.GetDB().Save(&sub)
		}
	}
}
