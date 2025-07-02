import { 
  HelpRequest, 
  VisitorProfile, 
  VisitorDashboardData, 
  EligibilityStatus, 
  Visit,
  QueueStatus,
  VisitorFeedback 
} from '@/lib/types/visitor';
import { getFromLocalStorage } from '@/lib/hooks/use-local-storage';

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
    status: normalizeStatus(request.status),
    // Normalize field names from snake_case to camelCase
    createdAt: request.created_at || request.createdAt,
    updatedAt: request.updated_at || request.updatedAt,
    visitorId: request.visitor_id || request.visitorId,
    visitorName: request.visitor_name || request.visitorName,
    visitDay: request.visit_day || request.visitDay,
    timeSlot: request.time_slot || request.timeSlot,
    rejectionReason: request.rejection_reason || request.rejectionReason,
    ticketNumber: request.ticket_number || request.ticketNumber,
    autoApproved: request.auto_approved || request.autoApproved,
    // Keep original fields for backward compatibility
    created_at: request.created_at,
    updated_at: request.updated_at,
    visitor_id: request.visitor_id,
    visitor_name: request.visitor_name,
    visit_day: request.visit_day,
    time_slot: request.time_slot,
    rejection_reason: request.rejection_reason,
    ticket_number: request.ticket_number,
    auto_approved: request.auto_approved,
  };
};

// Handle API responses and errors
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    // For 401 Unauthorized errors, redirect to login
    if (response.status === 401) {
      console.error('Authentication failed: Invalid or expired token');
      // Clear the invalid token from storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('auth_token');
        
        // Only redirect if we're in browser context and not in an API call
        if (!window.location.pathname.includes('/api/')) {
          window.location.href = '/login?error=session_expired';
        }
      }
      throw new Error('Invalid token - Please log in again');
    }
    
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

/**
 * Get visitor dashboard data with stats and recent activity
 */
export const fetchUserDashboard = async (): Promise<VisitorDashboardData> => {
  try {
    // Get fresh auth token and check if it's available
    const token = getAuthToken();
    if (!token) {
      console.error('No auth token available for dashboard fetch');
      throw new Error('Authentication required - please log in');
    }
    
    console.log('Fetching dashboard with token:', token.substring(0, 10) + '...');
    
    const response = await fetch(`${API_BASE_URL}/api/v1/visitor/dashboard`, {
      headers: getAuthHeaders(),
    });

    const data = await handleResponse(response);
    
    // Map backend response to frontend interface
    return {
      stats: {
        totalVisits: data.stats?.total_visits || 0,
        pendingRequests: data.stats?.pending_requests || 0,
        completedVisits: data.stats?.completed_visits || 0,
        upcomingTickets: data.stats?.upcoming_tickets || 0,
      },
      docStatus: {
        verificationComplete: data.verification_status?.verification_complete || false,
        photoIdApproved: data.verification_status?.photo_id_approved || false,
        proofAddressApproved: data.verification_status?.proof_address_approved || false,
      },
      recentActivity: data.recent_activity || [],
      upcomingVisit: data.upcoming_visit || null,
      pendingRequests: data.pending_requests || [],
      nextSteps: data.next_steps || [],
      quickActions: data.quick_actions || [],
    };
  } catch (error) {
    console.error('Failed to fetch visitor dashboard:', error);
    
    // Return empty data structure instead of throwing
    return {
      stats: {
        totalVisits: 0,
        pendingRequests: 0,
        completedVisits: 0,
        upcomingTickets: 0,
      },
      docStatus: {
        verificationComplete: false,
        photoIdApproved: false,
        proofAddressApproved: false,
      },
      recentActivity: [],
      upcomingVisit: null,  // Explicitly null to match the interface
      pendingRequests: [],
      nextSteps: [],
      quickActions: [],
    };
  }
};

/**
 * Get visitor profile information
 */
export const fetchVisitorProfile = async (): Promise<VisitorProfile> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/visitor/profile`, {
    headers: getAuthHeaders(),
  });

  const data = await handleResponse(response);
  
  // Map backend response to frontend interface
  return {
    id: data.id,
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || '',
    city: data.city || '',
    postcode: data.postcode || '',
    dateOfBirth: data.date_of_birth,
    emergencyContact: data.emergency_contact || '',
    dietaryRequirements: data.dietary_requirements || '',
    householdSize: data.household_size || 1,
    accessibilityNeeds: data.accessibility_needs || '',
    verificationStatus: data.verification_status || 'pending',
    registrationDate: data.registration_date || '',
    lastVisit: data.last_visit,
  };
};

/**
 * Update visitor profile information
 */
export const updateVisitorProfile = async (data: Partial<VisitorProfile>): Promise<VisitorProfile> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/visitor/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      address: data.address,
      city: data.city,
      postcode: data.postcode,
      household_size: data.householdSize,
      dietary_requirements: data.dietaryRequirements,
      accessibility_needs: data.accessibilityNeeds,
      emergency_contact: data.emergencyContact,
    }),
  });

  const result = await handleResponse(response);
  
  // Map backend response to frontend interface
  const profile = result.profile;
  return {
    id: profile.id,
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    address: profile.address || '',
    city: profile.city || '',
    postcode: profile.postcode || '',
    dateOfBirth: profile.date_of_birth,
    emergencyContact: profile.emergency_contact || '',
    dietaryRequirements: profile.dietary_requirements || '',
    householdSize: profile.household_size || 1,
    accessibilityNeeds: profile.accessibility_needs || '',
    verificationStatus: profile.verification_status || 'pending',
    registrationDate: profile.registration_date || '',
    lastVisit: profile.last_visit,
  };
};

/**
 * Get visitor eligibility status for services
 */
export const getVisitorEligibility = async (): Promise<EligibilityStatus> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/visitor/eligibility`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Check eligibility for a specific category (updated to match old working pattern)
 */
export const checkEligibility = async (category: string): Promise<any> => {
  // Map frontend category names to backend expected values
  const categoryMapping: { [key: string]: string } = {
    'Food Support': 'food',
    'General Support': 'general',
    'Food': 'food',
    'General': 'general'
  };
  
  const backendCategory = categoryMapping[category] || category.toLowerCase();
  
  const response = await fetch(`${API_BASE_URL}/api/v1/visitor/eligibility/detailed`, {
    headers: getAuthHeaders(),
  });
  
  return handleResponse(response);
};

/**
 * Get available days for a specific category
 */
export const getAvailableDays = async (category: string): Promise<string[]> => {
  // Map frontend category names to backend expected values
  const categoryMapping: { [key: string]: string } = {
    'Food Support': 'food',
    'General Support': 'general',
    'Food': 'food',
    'General': 'general'
  };
  
  const backendCategory = categoryMapping[category] || category.toLowerCase();
  console.log('🔍 getAvailableDays: mapping', category, '->', backendCategory);
  
  // Use the public endpoint that matches backend routes
  const url = `${API_BASE_URL}/api/v1/help-requests/available-days?category=${encodeURIComponent(backendCategory)}`;
  console.log('🔍 getAvailableDays: calling URL:', url);
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  console.log('🔍 getAvailableDays: response status:', response.status, response.ok);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ getAvailableDays: API error:', errorText);
    throw new Error(`Failed to get available days: ${response.status} ${errorText}`);
  }
  
  const data = await handleResponse(response);
  console.log('✅ getAvailableDays: received data:', data);
  
  const availableDays = data.available_days || [];
  
  // If no days returned, provide fallback operating days for next 14 days
  if (availableDays.length === 0) {
    console.log('⚠️ getAvailableDays: No days from API, generating fallback days');
    const today = new Date();
    const fallbackDays = [];
    for (let i = 0; i < 14; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      // Operating days are Tuesday (2), Wednesday (3), Thursday (4)
      if (checkDate.getDay() >= 2 && checkDate.getDay() <= 4) {
        const year = checkDate.getFullYear();
        const month = String(checkDate.getMonth() + 1).padStart(2, '0');
        const day = String(checkDate.getDate()).padStart(2, '0');
        fallbackDays.push(`${year}-${month}-${day}`);
      }
    }
    console.log('🔄 getAvailableDays: generated fallback days:', fallbackDays);
    return fallbackDays;
  }
  
  return availableDays;
};

/**
 * Get available time slots for a specific category and date
 */
export const getAvailableTimeSlots = async (category: string, date: string): Promise<any[]> => {
  console.log('🔍 visitorService.getAvailableTimeSlots called with:', { category, date });
  
  // Map frontend category names to backend expected values
  const categoryMapping: { [key: string]: string } = {
    'Food Support': 'food',
    'General Support': 'general',
    'Food': 'food',
    'General': 'general'
  };
  
  const backendCategory = categoryMapping[category] || category.toLowerCase();
  console.log('🔍 Mapped category:', category, '->', backendCategory);
  
  // Use the correct backend endpoint for time slots
  const url = `${API_BASE_URL}/api/v1/help-requests/time-slots?category=${encodeURIComponent(backendCategory)}&date=${date}`;
  console.log('🔍 Making request to:', url);
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  console.log('🔍 Response status:', response.status);
  console.log('🔍 Response ok:', response.ok);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ API Error Response:', errorText);
    throw new Error(`Failed to get time slots: ${response.status} ${errorText}`);
  }
  
  const responseText = await response.text();
  console.log('🔍 Raw response text (first 500 chars):', responseText.substring(0, 500));
  
  let data;
  try {
    data = JSON.parse(responseText);
    console.log('✅ Full API Response:', JSON.stringify(data, null, 2));
    console.log('✅ Time slots array:', data.time_slots);
    console.log('✅ Time slots length:', data.time_slots ? data.time_slots.length : 'undefined');
    console.log('✅ Data keys:', Object.keys(data));
  } catch (parseError) {
    console.error('❌ Failed to parse JSON response:', parseError);
    console.error('❌ Response text:', responseText);
    throw new Error('Failed to parse response as JSON');
  }
  
  const timeSlots = data.time_slots || [];
  
  // If no time slots returned, provide fallback based on category
  if (timeSlots.length === 0) {
    console.log('⚠️ getAvailableTimeSlots: No slots from API, generating fallback slots for category:', backendCategory);
    
    if (backendCategory === 'food') {
      return [
        { time: '11:30', available: true, capacity: 2, booked: 0 },
        { time: '12:00', available: true, capacity: 2, booked: 0 },
        { time: '12:30', available: true, capacity: 2, booked: 0 },
        { time: '13:00', available: true, capacity: 2, booked: 0 },
        { time: '13:30', available: true, capacity: 2, booked: 0 },
        { time: '14:00', available: true, capacity: 2, booked: 0 }
      ];
    } else if (backendCategory === 'general') {
      return [
        { time: '10:30', available: true, capacity: 2, booked: 0 },
        { time: '11:00', available: true, capacity: 2, booked: 0 },
        { time: '11:30', available: true, capacity: 2, booked: 0 },
        { time: '12:00', available: true, capacity: 2, booked: 0 },
        { time: '12:30', available: true, capacity: 2, booked: 0 },
        { time: '13:00', available: true, capacity: 2, booked: 0 },
        { time: '13:30', available: true, capacity: 2, booked: 0 },
        { time: '14:00', available: true, capacity: 2, booked: 0 }
      ];
    }
  }
  
  return timeSlots;
};

/**
 * Get all help requests for current visitor
 */
export const getHelpRequests = async (): Promise<HelpRequest[]> => {
  try {
    // Use the correct user endpoint (not visitor-specific)
    const response = await fetch(`${API_BASE_URL}/api/v1/user/help-requests`, {
      headers: getAuthHeaders(),
    });
    
    const data = await handleResponse(response);
    console.log('Help requests response:', data);
    
    // Handle different response formats and normalize status values
    let requests = [];
    if (data.data) {
      requests = data.data;
    } else if (Array.isArray(data)) {
      requests = data;
    } else if (data.help_requests) {
      requests = data.help_requests;
    } else if (data.requests) {
      requests = data.requests;
    }
    
    // Normalize status values for all requests
    return requests.map(normalizeHelpRequest);
  } catch (error: any) {
    console.error('Failed to fetch help requests:', error);
    return [];
  }
};

/**
 * Get details for a specific help request
 */
export const getHelpRequestDetails = async (id: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/help-requests/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error: any) {
    console.error('Failed to fetch help request details:', error);
    throw error;
  }
};

/**
 * Cancel a help request
 */
export const cancelHelpRequest = async (id: number): Promise<void> => {
  try {
    console.log('🔑 Attempting to cancel request with current token:', getAuthToken()?.substring(0, 20) + '...');
    const response = await fetch(`${API_BASE_URL}/api/v1/help-requests/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    // Use handleResponse for consistent error handling (including 401)
    await handleResponse(response);

    console.log('✅ Successfully cancelled help request:', id);
  } catch (error: any) {
    console.error('Failed to cancel help request:', error);
    console.log('🔑 Token after failed request:', getAuthToken()?.substring(0, 20) + '...');
    throw error;
  }
};

/**
 * Get visitor's visit history
 */
export const getVisitorVisits = async (page: number = 1, limit: number = 10): Promise<{ data: Visit[]; pagination: any }> => {
  const params = new URLSearchParams({ 
    page: page.toString(), 
    limit: limit.toString() 
  });
  
  const response = await fetch(`${API_BASE_URL}/api/v1/user/visits?${params}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Get current queue status for visitor
 */
export const getQueueStatus = async (): Promise<QueueStatus> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/queue/status`, {
      headers: getAuthHeaders(),
    });

    const data = await handleResponse(response);
    
    // Transform backend response to match frontend interface
    return {
      position: data.current_position || 0,
      estimatedWaitTime: data.estimated_wait_time || 0,
      totalInQueue: data.total_in_queue || 0,
      currentlyServing: data.current_serving ? `Position ${data.current_serving}` : 'No one currently being served',
      averageServiceTime: 15, // Default average service time
      isActive: data.queue_open || false,
    };
  } catch (error: any) {
    console.error('Failed to fetch queue status:', error);
    // Return default status if API fails
    return {
      position: 0,
      estimatedWaitTime: 0,
      totalInQueue: 0,
      currentlyServing: 'Queue not available',
      averageServiceTime: 15,
      isActive: false,
    };
  }
};

/**
 * Submit visitor feedback for a visit
 */
export const submitVisitorFeedback = async (feedback: Omit<VisitorFeedback, 'id' | 'createdAt'>): Promise<VisitorFeedback> => {
  // Transform frontend feedback format to backend expected format
  const backendPayload = {
    visitId: feedback.visitId,
    overallRating: feedback.overallRating,
    staffHelpfulness: feedback.staffRating,
    waitTimeRating: feedback.waitTimeRating,
    facilityRating: 4, // Default value since not in frontend interface
    serviceSpeedRating: feedback.serviceRating,
    foodQualityRating: feedback.serviceRating, // Optional field
    serviceCategory: "general", // Default category
    positiveComments: feedback.comments,
    areasForImprovement: "", // Default empty
    suggestions: feedback.suggestions || "",
    wouldRecommend: feedback.wouldRecommend,
    feltWelcomed: true, // Default true
    needsWereMet: true, // Default true
  };

  const response = await fetch(`${API_BASE_URL}/api/v1/visits/feedback`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(backendPayload),
  });

  return handleResponse(response);
};

/**
 * Get visitor's feedback history
 */
export const getVisitorFeedbackHistory = async (): Promise<VisitorFeedback[]> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/visitor/feedback/history`, {
    headers: getAuthHeaders(),
  });

  const data = await handleResponse(response);
  return data.feedback || [];
};

/**
 * Submit a help request using modern backend API (aligned with CreateHelpRequest handler)
 */
export const submitHelpRequest = async (data: any): Promise<HelpRequest> => {
  console.log('submitHelpRequest received data:', data);
  
  // Validate required fields (using snake_case field names)
  if (!data.details || !data.visit_day || !data.time_slot) {
    console.error('❌ Missing required help request fields:', {
      details: data.details,
      visit_day: data.visit_day,
      time_slot: data.time_slot
    });
    throw new Error('Missing required fields: details, visit_day, or time_slot');
  }

  // Map frontend category names to backend expected values (PascalCase)
  const categoryMapping: { [key: string]: string } = {
    'Food Support': 'Food',
    'General Support': 'General',
    'Food': 'Food',
    'General': 'General',
    'Emergency': 'Emergency'
  };
  const backendCategory = categoryMapping[data.category] || data.category;
  console.log('🔍 Mapped submission category:', data.category, '->', backendCategory);

  // Transform frontend fields to backend fields (matching HelpRequestRequest struct)
  const payload: any = {
    category: backendCategory,
    details: data.details,
    visit_day: data.visit_day,
    time_slot: data.time_slot,
    urgency_level: data.urgency_level || 'Medium',
    household_size: data.household_size || 1,
    special_needs: data.special_needs || '',
  };

  // Log the payload for debugging
  console.log('🚀 Submitting help request payload:', payload);

  const response = await fetch(`${API_BASE_URL}/api/v1/help-requests`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const result = await handleResponse(response);
  
  // Map backend response to frontend interface
  return {
    id: result.id,
    reference: result.reference_code || result.reference,
    visitorId: result.visitor_id,
    visitorName: result.visitor_name,
    category: payload.category,
    details: payload.details,
    visitDay: payload.visit_day,
    timeSlot: payload.time_slot,
    status: normalizeStatus(result.status),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ticketNumber: result.ticket_number,
    autoApproved: result.auto_approved,
  };
};

/**
 * Submit general visitor feedback (not tied to a specific visit)
 */
export const submitGeneralFeedback = async (feedback: {
  subject: string;
  message: string;
  category?: string;
  rating: number;
  contact_back?: boolean;
  anonymous?: boolean;
}): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/visitor/feedback`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(feedback),
  });

  return handleResponse(response);
};