// Payment processing without external dependencies for now
// This can be replaced with actual Stripe integration later

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'paypal';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface DonationPayment {
  amount: number;
  currency: string;
  paymentMethodId?: string;
  recurring?: {
    frequency: 'monthly' | 'quarterly' | 'yearly';
    startDate: string;
  };
  metadata?: {
    donorId: string;
    category: string;
    giftAid: boolean;
    isAnonymous: boolean;
  };
}

// Create payment intent for one-time donation
export const createPaymentIntent = async (donation: DonationPayment): Promise<PaymentIntent> => {
  try {
    const response = await fetch('/api/v1/payments/create-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(donation),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }

    return response.json();
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    throw error;
  }
};

// Create recurring subscription
export const createSubscription = async (donation: DonationPayment): Promise<any> => {
  try {
    const response = await fetch('/api/v1/payments/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(donation),
    });

    if (!response.ok) {
      throw new Error('Failed to create subscription');
    }

    return response.json();
  } catch (error) {
    console.error('Subscription creation failed:', error);
    throw error;
  }
};

// Confirm payment (mock implementation)
export const confirmPayment = async (
  clientSecret: string,
  paymentMethod: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Mock payment confirmation
    // In real implementation, this would integrate with Stripe or other payment processor
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    
    // Mock success response
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Save payment method for future use
export const savePaymentMethod = async (paymentMethodId: string): Promise<PaymentMethod> => {
  try {
    const response = await fetch('/api/v1/payments/save-method', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ paymentMethodId }),
    });

    if (!response.ok) {
      throw new Error('Failed to save payment method');
    }

    return response.json();
  } catch (error) {
    console.error('Save payment method failed:', error);
    throw error;
  }
};

// Get saved payment methods
export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  try {
    const response = await fetch('/api/v1/payments/methods', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment methods');
    }

    return response.json();
  } catch (error) {
    console.error('Fetch payment methods failed:', error);
    return [];
  }
};

// Delete payment method
export const deletePaymentMethod = async (paymentMethodId: string): Promise<void> => {
  try {
    const response = await fetch(`/api/v1/payments/methods/${paymentMethodId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete payment method');
    }
  } catch (error) {
    console.error('Delete payment method failed:', error);
    throw error;
  }
};

// Process refund (admin only)
export const processRefund = async (paymentIntentId: string, amount?: number): Promise<any> => {
  try {
    const response = await fetch('/api/v1/payments/refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ paymentIntentId, amount }),
    });

    if (!response.ok) {
      throw new Error('Failed to process refund');
    }

    return response.json();
  } catch (error) {
    console.error('Refund processing failed:', error);
    throw error;
  }
};

// Get payment history
export const getPaymentHistory = async (): Promise<any[]> => {
  try {
    const response = await fetch('/api/v1/payments/history', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment history');
    }

    return response.json();
  } catch (error) {
    console.error('Fetch payment history failed:', error);
    return [];
  }
};

// Webhook verification utility
export const verifyWebhookSignature = (payload: string, signature: string, secret: string): boolean => {
  // This would typically be done on the server side
  // Implementation depends on payment provider
  return true;
};

export default {
  createPaymentIntent,
  createSubscription,
  confirmPayment,
  savePaymentMethod,
  getPaymentMethods,
  deletePaymentMethod,
  processRefund,
  getPaymentHistory,
  verifyWebhookSignature,
}; 