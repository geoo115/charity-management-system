import { HelpRequest, EligibilityStatus, TimeSlot } from '@/lib/types/visitor';
import { getFromLocalStorage } from '@/lib/hooks/use-local-storage';

// Normalize status values from backend to frontend format
const normalizeStatus = (status: string): 'Pending' | 'Approved' | 'TicketIssued' | 'Rejected' | 'Completed' | 'Cancelled' | 'CheckedIn' => {
  const statusMap: { [key: string]: string } = {
    'pending': 'Pending',
    'approved': 'Approved', 
    'ticket_issued': 'TicketIssued',
    'rejected': 'Rejected',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'checked_in': 'CheckedIn',
    // Also handle PascalCase (in case backend already returns them)
    'Pending': 'Pending',
    'Approved': 'Approved',
    'TicketIssued': 'TicketIssued', 
    'Rejected': 'Rejected',
    'Completed': 'Completed',
    'Cancelled': 'Cancelled',
    'CheckedIn': 'CheckedIn'
  };
  return (statusMap[status] || 'Pending') as 'Pending' | 'Approved' | 'TicketIssued' | 'Rejected' | 'Completed' | 'Cancelled' | 'CheckedIn';
};

// Normalize help request data from backend
const normalizeHelpRequest = (request: any): any => {
  return {
    ...request,
    status: normalizeStatus(request.status)
  };
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Get auth token for API requests
const getAuthToken = () => {
  return getFromLocalStorage('auth_token') || getFromLocalStorage('token');
};

// Create API headers with authentication
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Handle API responses and errors
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

/**
 * Create a new help request (updated to use visitor API)
 */
export const createHelpRequest = async (data: any): Promise<HelpRequest> => {
  // Import the visitor API functions dynamically to avoid circular imports
  const { submitHelpRequest } = await import('@/lib/api/visitor');
  
  // Use the visitor API which has the correct endpoint and field mapping
  return submitHelpRequest(data);
};

/**
 * Legacy help request creation (backward compatibility)
 */
export const createLegacyHelpRequest = async (data: {
  visitor_name: string;
  contact_email: string;
  contact_phone: string;
  postcode: string;
  category?: string;
  details: string;
}): Promise<HelpRequest> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/help-requests/legacy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse(response);
};

/**
 * Get user's help requests with optional filtering (updated to use visitor API)
 */
export const getUserHelpRequests = async (filters?: {
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: HelpRequest[]; pagination?: any }> => {
  // Import the visitor API functions dynamically to avoid circular imports
  const { getHelpRequests } = await import('@/lib/api/visitor');
  
  // Use the visitor API which has the correct endpoint
  const requests = await getHelpRequests();
  
  // Normalize status values and apply client-side filtering
  let filteredRequests = requests.map(normalizeHelpRequest);
  if (filters?.status) {
    filteredRequests = filteredRequests.filter(req => req.status === filters.status);
  }
  if (filters?.category) {
    filteredRequests = filteredRequests.filter(req => req.category === filters.category);
  }
  
  // Apply pagination if needed
  const page = filters?.page || 1;
  const limit = filters?.limit || 10;
  const startIndex = (page - 1) * limit;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + limit);
  
  return {
    data: paginatedRequests,
    pagination: {
      page,
      limit,
      total: filteredRequests.length,
      pages: Math.ceil(filteredRequests.length / limit)
    }
  };
};

/**
 * Enhanced user help requests with advanced filtering
 */
export const getUserHelpRequestsAdvanced = async (filters?: {
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
  date_from?: string;
  date_to?: string;
}): Promise<{ data: HelpRequest[]; pagination?: any }> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);

  const response = await fetch(`${API_BASE_URL}/api/v1/user/help-requests?${params}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Cancel a help request (updated to use visitor API)
 */
export const cancelHelpRequest = async (id: number): Promise<void> => {
  // Import the visitor API functions dynamically to avoid circular imports
  const { cancelHelpRequest: visitorCancelHelpRequest } = await import('@/lib/api/visitor');
  
  // Use the visitor API which has the correct endpoint
  return visitorCancelHelpRequest(id);
};

/**
 * Cancel help request with reason
 */
export const cancelHelpRequestWithReason = async (id: number, reason?: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/help-requests/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to cancel help request');
  }
};

/**
 * Check visitor eligibility and recent request history
 */
export const checkVisitorEligibility = async (email: string, phone: string) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/help-requests/check-visitor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone }),
  });

  return handleResponse(response);
};

/**
 * Get visitor eligibility with detailed history
 */
export const checkVisitorEligibilityAdvanced = async (email: string, phone: string) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/help-requests/check-visitor-advanced`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone }),
  });

  return handleResponse(response);
};

/**
 * Get available days for help requests (updated to use visitor API)
 */
export const getAvailableDays = async (category: string = 'Food'): Promise<string[]> => {
  // Import the visitor API functions dynamically to avoid circular imports
  const { getAvailableDays: visitorGetAvailableDays } = await import('@/lib/api/visitor');
  
  // Use the visitor API which has the correct endpoint and field mapping
  return visitorGetAvailableDays(category);
};

/**
 * Get available time slots for a specific date and category (updated to use visitor API)
 */
export const getTimeSlots = async (date: string, category?: string): Promise<TimeSlot[]> => {
  // Import the visitor API functions dynamically to avoid circular imports
  const { getAvailableTimeSlots } = await import('@/lib/api/visitor');
  
  // Use the visitor API which has the correct endpoint and field mapping
  return getAvailableTimeSlots(category || 'Food', date);
};

/**
 * Get available time slots with enhanced information
 */
export const getTimeSlotsAdvanced = async (date: string, category?: string): Promise<Array<{
  time: string;
  available: boolean;
  booked_count: number;
  max_capacity: number;
  estimated_wait_time?: number;
}>> => {
  const params = new URLSearchParams({ date });
  if (category) params.append('category', category);

  const response = await fetch(`${API_BASE_URL}/api/v1/help-requests/time-slots-advanced?${params}`);
  const data = await handleResponse(response);
  return data.time_slots || [];
};

/**
 * Get detailed help request information
 */
export const getHelpRequestDetails = async (id: number): Promise<HelpRequest> => {
  try {
    // Get all user help requests and find the specific one
    // This is the only way visitors can access their help request details
    const { getHelpRequests } = await import('@/lib/api/visitor');
    const requests = await getHelpRequests();
    
    // Find the specific request by ID
    const helpRequest = requests.find((req: any) => req.id === id);
    
    if (!helpRequest) {
      throw new Error(`Help request with ID ${id} not found or you don't have access to it`);
    }
    
    return helpRequest;
  } catch (error: any) {
    console.error('Error fetching help request details:', error);
    throw new Error(error.message || 'Failed to load help request details');
  }
};

/**
 * Get help request ticket information
 */
export const getHelpRequestTicket = async (id: number) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/help-requests/${id}/ticket`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Get help request ticket validation information
 */
export const validateHelpRequestTicket = async (ticketNumber: string) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/tickets/${ticketNumber}/validate`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Get help request with visitor information
 */
export const getHelpRequestWithVisitor = async (id: number): Promise<HelpRequest & {
  visitor: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    postcode: string;
  };
}> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/help-requests/${id}/with-visitor`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Update help request details (if allowed)
 */
export const updateHelpRequest = async (id: number, data: Partial<HelpRequest>): Promise<HelpRequest> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/help-requests/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse(response);
};

/**
 * Update help request with full data support
 */
export const updateHelpRequestFull = async (id: number, data: {
  category?: string;
  details?: string;
  visit_day?: string;
  time_slot?: string;
  household_size?: number;
  special_requirements?: string;
  dietary_requirements?: string;
  priority?: string;
}): Promise<HelpRequest> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/help-requests/${id}/full`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse(response);
};

/**
 * Submit help request with document attachments
 */
export const createHelpRequestWithDocuments = async (data: {
  category: string;
  details: string;
  visitDay: string;
  timeSlot: string;
  householdSize?: number;
  specialRequirements?: string;
  dietaryRequirements?: string;
  documentIds?: number[];
}): Promise<HelpRequest> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/help-requests/with-documents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse(response);
};

/**
 * Check if user has any pending or incomplete help requests
 */
export const checkForPendingRequests = async (): Promise<{
  hasPendingRequests: boolean;
  pendingRequests: HelpRequest[];
}> => {
  try {
    const response = await getUserHelpRequests({
      // Don't pass status filter to get all requests
      limit: 50 // Get recent requests
    });

    const allRequests = response.data || [];
    
    // Filter for incomplete/pending requests
    const pendingRequests = allRequests.filter(request => 
      ['pending', 'approved', 'Pending', 'Approved'].includes(request.status)
    );

    return {
      hasPendingRequests: pendingRequests.length > 0,
      pendingRequests
    };
  } catch (error) {
    console.error('Error checking pending requests:', error);
    // If we can't check, allow the request to proceed (fail-safe approach)
    return {
      hasPendingRequests: false,
      pendingRequests: []
    };
  }
};

/**
 * Check if user can create a new help request for a specific category
 */
export const canCreateNewHelpRequest = async (category?: 'Food' | 'General'): Promise<{
  canCreate: boolean;
  reason?: string;
  pendingRequests?: HelpRequest[];
  eligibilityData?: any;
}> => {
  try {
    // Import the visitor API dynamically to avoid circular imports
    const { getVisitorEligibility } = await import('@/lib/api/visitor');
    
    // Get comprehensive eligibility data instead of just checking pending requests
    const eligibilityData = await getVisitorEligibility();
    
    // Get pending requests for display purposes
    const { pendingRequests } = await checkForPendingRequests();
    
    // If no category specified, check overall eligibility
    if (!category) {
      if (!eligibilityData.eligible) {
        return {
          canCreate: false,
          reason: 'You are not currently eligible for services. Please complete document verification.',
          pendingRequests,
          eligibilityData
        };
      }
      
      // Check if any category is available
      const foodEligible = eligibilityData.categories?.food?.eligible || false;
      const generalEligible = eligibilityData.categories?.general?.eligible || false;
      
      if (!foodEligible && !generalEligible) {
        return {
          canCreate: false,
          reason: 'No service categories are currently available. Please check your eligibility status.',
          pendingRequests,
          eligibilityData
        };
      }
      
      return {
        canCreate: true,
        pendingRequests,
        eligibilityData
      };
    }
    
    // Category-specific eligibility checking
    if (category === 'Food') {
      const foodEligible = eligibilityData.categories?.food?.eligible || false;
      const foodReason = eligibilityData.categories?.food?.reason || '';
      
      if (!foodEligible) {
        return {
          canCreate: false,
          reason: foodReason || 'You are not currently eligible for food support.',
          pendingRequests,
          eligibilityData
        };
      }
    } else if (category === 'General') {
      const generalEligible = eligibilityData.categories?.general?.eligible || false;
      const generalReason = eligibilityData.categories?.general?.reason || '';
      
      if (!generalEligible) {
        return {
          canCreate: false,
          reason: generalReason || 'You are not currently eligible for general support.',
          pendingRequests,
          eligibilityData
        };
      }
    }
    
    return {
      canCreate: true,
      pendingRequests,
      eligibilityData
    };
    
  } catch (error) {
    console.error('Error checking eligibility for new request:', error);
    
    // Fallback to simple pending request check
    const { hasPendingRequests, pendingRequests } = await checkForPendingRequests();
    
    if (hasPendingRequests) {
      return {
        canCreate: false,
        reason: 'You have pending requests that must be completed first.',
        pendingRequests
      };
    }
    
    // If eligibility check fails, allow the request (fail-safe approach)
    return {
      canCreate: true,
      pendingRequests
    };
  }
};
