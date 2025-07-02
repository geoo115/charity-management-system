import { apiClient } from './api-client';

// Handle API responses and errors
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

// Queue Management API Functions
export interface QueueEntry {
  id: number;
  position: number;
  visitor_id: number;
  visitor_name: string;
  ticket_number: string;
  reference: string;
  category: string;
  check_in_time: string;
  estimated_wait_minutes: number;
  status: 'waiting' | 'called' | 'in_service' | 'completed' | 'no_show';
  special_needs?: string[];
  priority: number;
}

export interface QueueStats {
  total_in_queue: number;
  average_wait_time: number;
  service_rate: number;
  categories: Record<string, number>;
  desk_status: {
    total_desks: number;
    active_desks: number;
    available_desks: number;
  };
  real_time_stats: {
    checked_in_today: number;
    completed_today: number;
    no_shows_today: number;
    current_serving: number;
  };
}

export interface CheckInResponse {
  success: boolean;
  message: string;
  visit: {
    id: number;
    ticket_number: string;
    check_in_time: string;
    status: string;
  };
  queue: {
    position: number;
    estimated_wait_time: string;
    category: string;
    status: string;
  };
  next_steps: string[];
  visitor?: {
    id: number;
    name: string;
    email: string;
    category: string;
  };
}

export interface VisitorSearchResult {
  id: number;
  name: string;
  email: string;
  phone: string;
  postcode: string;
  last_visit?: string;
  status: 'verified' | 'pending' | 'rejected';
  has_ticket: boolean;
  ticket_number?: string;
  visit_date?: string;
  category?: string;
}

// Queue Status and Management
export const getQueueStatus = async (): Promise<{ queue: QueueEntry[]; stats: QueueStats }> => {
  try {
    const response = await apiClient.get('/api/v1/queue/status');
    return await handleResponse(response);
  } catch (error) {
    console.error('Failed to get queue status:', error);
    throw error;
  }
};

export const getQueuePosition = async (visitorId?: number, ticketNumber?: string): Promise<QueueEntry | null> => {
  try {
    const params = new URLSearchParams();
    if (visitorId) params.append('visitor_id', visitorId.toString());
    if (ticketNumber) params.append('ticket_number', ticketNumber);
    
    const response = await apiClient.get(`/api/v1/queue/position?${params.toString()}`);
    return await handleResponse(response);
  } catch (error) {
    console.error('Failed to get queue position:', error);
    return null;
  }
};

// Check-in Functions
export const checkInVisitor = async (data: {
  ticket_number: string;
  staff_id?: number;
  volunteer_id?: number;
  check_in_method?: 'self' | 'staff_assisted' | 'volunteer_assisted';
}): Promise<CheckInResponse> => {
  try {
    const response = await apiClient.post('/api/v1/visitors/checkin', JSON.stringify({
      ...data,
      check_in_method: data.check_in_method || 'self',
    }));
    return await handleResponse(response);
  } catch (error) {
    console.error('Check-in failed:', error);
    throw error;
  }
};

export const advancedCheckIn = async (data: {
  ticket_number: string;
  id_document?: string; // base64 photo
  proof_of_address?: string; // base64 photo
  staff_member_id?: number;
  check_in_method?: string;
  notes?: string;
}): Promise<CheckInResponse> => {
  try {
    const response = await apiClient.post('/api/v1/visitors/checkin/advanced', JSON.stringify(data));
    return await handleResponse(response);
  } catch (error) {
    console.error('Advanced check-in failed:', error);
    throw error;
  }
};

// Visitor Search
export const searchVisitors = async (searchTerm: string, searchType: 'name' | 'email' | 'phone' | 'postcode'): Promise<VisitorSearchResult[]> => {
  try {
    const params = new URLSearchParams({
      q: searchTerm,
      type: searchType,
    });
    const response = await apiClient.get(`/api/v1/visitors/search?${params.toString()}`);
    const data = await handleResponse(response);
    return data.visitors || [];
  } catch (error) {
    console.error('Visitor search failed:', error);
    return [];
  }
};

// Queue Management (Staff/Volunteer Functions)
export const callNextVisitor = async (queueEntryId: number, staffId?: number, volunteerId?: number): Promise<void> => {
  try {
    await apiClient.post('/api/v1/queue/call-next', JSON.stringify({
      queue_entry_id: queueEntryId,
      staff_id: staffId,
      volunteer_id: volunteerId,
    }));
  } catch (error) {
    console.error('Failed to call next visitor:', error);
    throw error;
  }
};

export const markVisitorNoShow = async (queueEntryId: number, reason?: string): Promise<void> => {
  try {
    await apiClient.post('/api/v1/queue/no-show', JSON.stringify({
      queue_entry_id: queueEntryId,
      reason: reason || 'Visitor did not respond when called',
    }));
  } catch (error) {
    console.error('Failed to mark visitor as no-show:', error);
    throw error;
  }
};

export const completeVisit = async (visitId: number, staffId?: number, notes?: string): Promise<void> => {
  try {
    await apiClient.post(`/api/v1/visits/${visitId}/complete`, JSON.stringify({
      staff_id: staffId,
      notes: notes,
    }));
  } catch (error) {
    console.error('Failed to complete visit:', error);
    throw error;
  }
};

export const updateQueuePosition = async (queueEntryId: number, newPosition: number): Promise<void> => {
  try {
    await apiClient.put(`/api/v1/queue/${queueEntryId}/position`, JSON.stringify({
      position: newPosition,
    }));
  } catch (error) {
    console.error('Failed to update queue position:', error);
    throw error;
  }
};

// Queue Analytics
export const getQueueAnalytics = async (dateRange?: { start: string; end: string }): Promise<{
  daily_stats: Array<{
    date: string;
    total_visitors: number;
    average_wait_time: number;
    service_rate: number;
    no_show_rate: number;
  }>;
  category_breakdown: Record<string, number>;
  peak_hours: Array<{
    hour: number;
    visitor_count: number;
  }>;
  performance_metrics: {
    total_served: number;
    average_service_time: number;
    customer_satisfaction: number;
  };
}> => {
  try {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('start_date', dateRange.start);
      params.append('end_date', dateRange.end);
    }
    
    const response = await apiClient.get(`/api/v1/queue/analytics?${params.toString()}`);
    return await handleResponse(response);
  } catch (error) {
    console.error('Failed to get queue analytics:', error);
    throw error;
  }
};

// Real-time Queue Updates (WebSocket simulation)
export const subscribeToQueueUpdates = (callback: (update: {
  type: 'position_change' | 'visitor_called' | 'queue_update' | 'wait_time_update';
  data: any;
}) => void): (() => void) => {
  // Simulate WebSocket connection
  let updateCounter = 0;
  const interval = setInterval(() => {
    // Cycle through update types deterministically
    const updateTypes = ['position_change', 'visitor_called', 'queue_update', 'wait_time_update'];
    const updateType = updateTypes[updateCounter % updateTypes.length];
    updateCounter++;
    
    callback({
      type: updateType as any,
      data: {
        timestamp: new Date().toISOString(),
        message: `Simulated ${updateType} update`,
      }
    });
  }, 30000); // Update every 30 seconds

  // Return cleanup function
  return () => clearInterval(interval);
};

// Ticket Validation
export const validateTicket = async (ticketNumber: string): Promise<{
  valid: boolean;
  ticket?: {
    id: number;
    ticket_number: string;
    visitor_name: string;
    visit_date: string;
    category: string;
    status: string;
    can_be_used: boolean;
  };
  error?: string;
}> => {
  try {
    const response = await apiClient.get(`/api/v1/tickets/${ticketNumber}/validate`);
    return await handleResponse(response);
  } catch (error) {
    console.error('Ticket validation failed:', error);
    return {
      valid: false,
      error: 'Failed to validate ticket',
    };
  }
};

// Queue Position Notifications
export const requestQueueNotifications = async (visitorId: number, preferences: {
  email: boolean;
  sms: boolean;
  push: boolean;
}): Promise<void> => {
  try {
    await apiClient.post('/api/v1/queue/notifications/subscribe', JSON.stringify({
      visitor_id: visitorId,
      preferences,
    }));
  } catch (error) {
    console.error('Failed to subscribe to notifications:', error);
    throw error;
  }
};

export const leaveQueue = async (visitorId: number, reason?: string): Promise<void> => {
  try {
    await apiClient.delete('/api/v1/queue/leave', {
      body: JSON.stringify({
        visitor_id: visitorId,
        reason: reason || 'Visitor chose to leave',
      })
    });
  } catch (error) {
    console.error('Failed to leave queue:', error);
    throw error;
  }
};

// Emergency Queue Functions
export const addToEmergencyQueue = async (ticketNumber: string, reason: string, staffId: number): Promise<void> => {
  try {
    await apiClient.post('/api/v1/queue/emergency', JSON.stringify({
      ticket_number: ticketNumber,
      reason,
      staff_id: staffId,
    }));
  } catch (error) {
    console.error('Failed to add to emergency queue:', error);
    throw error;
  }
};

export const getEmergencyQueue = async (): Promise<QueueEntry[]> => {
  try {
    const response = await apiClient.get('/api/v1/queue/emergency');
    const data = await handleResponse(response);
    return data.queue || [];
  } catch (error) {
    console.error('Failed to get emergency queue:', error);
    return [];
  }
};

// Volunteer-specific Queue Functions
export const getVolunteerQueueAssignments = async (volunteerId: number): Promise<QueueEntry[]> => {
  try {
    const response = await apiClient.get(`/api/v1/volunteers/${volunteerId}/queue-assignments`);
    const data = await handleResponse(response);
    return data.assignments || [];
  } catch (error) {
    console.error('Failed to get volunteer queue assignments:', error);
    return [];
  }
};

export const assignVolunteerToQueue = async (volunteerId: number, category: string): Promise<void> => {
  try {
    await apiClient.post('/api/v1/volunteers/queue-assignment', JSON.stringify({
      volunteer_id: volunteerId,
      category,
    }));
  } catch (error) {
    console.error('Failed to assign volunteer to queue:', error);
    throw error;
  }
};

// Export all functions
export default {
  // Queue Status
  getQueueStatus,
  getQueuePosition,
  
  // Check-in
  checkInVisitor,
  advancedCheckIn,
  
  // Search
  searchVisitors,
  
  // Queue Management
  callNextVisitor,
  markVisitorNoShow,
  completeVisit,
  updateQueuePosition,
  
  // Analytics
  getQueueAnalytics,
  
  // Real-time
  subscribeToQueueUpdates,
  
  // Validation
  validateTicket,
  
  // Notifications
  requestQueueNotifications,
  leaveQueue,
  
  // Emergency
  addToEmergencyQueue,
  getEmergencyQueue,
  
  // Volunteer Functions
  getVolunteerQueueAssignments,
  assignVolunteerToQueue,
};
