import { getFromLocalStorage } from '@/lib/hooks/use-local-storage';
import { HelpRequest } from '@/lib/types/visitor';

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

// ================================
// ADMIN HELP REQUEST MANAGEMENT - BULK & ADVANCED OPERATIONS
// ================================

/**
 * Enhanced help request filtering with all backend options
 */
export const getHelpRequestsAdvanced = async (filters?: {
  status?: string;
  category?: string;
  priority?: string;
  page?: number;
  limit?: number;
  date_from?: string;
  date_to?: string;
  search?: string;         // Enhanced search support
  visitor_id?: number;     // Filter by visitor
  assigned_staff_id?: number; // Filter by assigned staff
}): Promise<{ data: HelpRequest[]; pagination: any }> => {
  const params = new URLSearchParams();
  
  // Core filters
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
  if (filters?.priority && filters.priority !== 'all') params.append('priority', filters.priority);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('pageSize', filters.limit.toString());
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  
  // Enhanced filters
  if (filters?.search) params.append('search', filters.search);
  if (filters?.visitor_id) params.append('visitor_id', filters.visitor_id.toString());
  if (filters?.assigned_staff_id) params.append('assigned_staff_id', filters.assigned_staff_id.toString());

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests?${params}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Bulk issue tickets for approved help requests
 */
export const bulkIssueTickets = async (data: {
  visit_day: string;
  category?: string;
  max_tickets?: number;
}): Promise<{
  tickets_issued: number;
  total_processed: number;
  failed_requests: Array<{
    id: number;
    error: string;
  }>;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/bulk-issue-tickets`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse(response);
};

/**
 * Bulk update help request statuses
 */
export const bulkUpdateHelpRequestStatus = async (data: {
  request_ids: number[];
  status: string;
  notes?: string;
}): Promise<{
  updated: number;
  failed: number;
  errors: Array<{
    id: number;
    error: string;
  }>;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/bulk-update-status`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse(response);
};

/**
 * Bulk approve help requests
 */
export const bulkApproveHelpRequests = async (data: {
  request_ids: number[];
  notes?: string;
  issue_tickets?: boolean;
}): Promise<{
  approved: number;
  tickets_issued: number;
  failed: number;
  errors: Array<{
    id: number;
    error: string;
  }>;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/bulk-approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse(response);
};

/**
 * Bulk reject help requests
 */
export const bulkRejectHelpRequests = async (data: {
  request_ids: number[];
  reason: string;
  notes?: string;
}): Promise<{
  rejected: number;
  failed: number;
  errors: Array<{
    id: number;
    error: string;
  }>;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/bulk-reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse(response);
};

/**
 * Update help request with full backend support
 */
export const updateHelpRequestAdvanced = async (
  id: number,
  data: {
    status?: string;
    assigned_datetime?: string;
    assigned_staff_id?: number;
    notes?: string;
    priority?: string;
    category?: string;
    visit_day?: string;
    time_slot?: string;
    household_size?: number;
    special_requirements?: string;
    dietary_requirements?: string;
  }
): Promise<HelpRequest> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/help-requests/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse(response);
};

/**
 * Assign volunteer to help request with notes
 */
export const assignVolunteerToRequestAdvanced = async (
  requestId: number,
  data: {
    volunteer_id: number;
    notes?: string;
    estimated_completion?: string;
    special_instructions?: string;
  }
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/${requestId}/assign`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to assign volunteer');
  }
};

/**
 * Verify visitor documents (integrated with help requests)
 */
export const verifyVisitorDocumentsForRequest = async (
  requestId: number,
  data: {
    document_ids: number[];
    status: 'approved' | 'rejected';
    notes?: string;
    rejection_reason?: string;
  }
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/${requestId}/verify-documents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to verify visitor documents');
  }
};

/**
 * Get help request timeline/activity history
 */
export const getHelpRequestTimeline = async (requestId: number): Promise<Array<{
  id: number;
  action: string;
  description: string;
  performed_by: string;
  performed_by_name: string;
  performed_at: string;
  metadata?: any;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
}>> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/${requestId}/timeline`, {
    headers: getAuthHeaders(),
  });

  const data = await handleResponse(response);
  return data.timeline || [];
};

/**
 * Add internal note to help request
 */
export const addHelpRequestNote = async (
  requestId: number,
  data: {
    note: string;
    is_internal?: boolean;
    is_urgent?: boolean;
    notify_staff?: boolean;
  }
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/${requestId}/notes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to add note');
  }
};

/**
 * Get help request notes and comments
 */
export const getHelpRequestNotes = async (requestId: number): Promise<Array<{
  id: number;
  note: string;
  is_internal: boolean;
  is_urgent: boolean;
  created_by: string;
  created_by_name: string;
  created_at: string;
}>> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/${requestId}/notes`, {
    headers: getAuthHeaders(),
  });

  const data = await handleResponse(response);
  return data.notes || [];
};

/**
 * Issue ticket for help request with custom data
 */
export const issueTicketAdvanced = async (requestId: number, data?: {
  attendees?: number;
  special_instructions?: string;
  access_level?: 'standard' | 'priority' | 'emergency';
  valid_until?: string;
}): Promise<{
  ticket_number: string;
  qr_code: string;
  valid_until: string;
  access_level: string;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/${requestId}/issue-ticket`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data || {}),
  });

  return handleResponse(response);
};

/**
 * Search help requests with advanced filters
 */
export const searchHelpRequests = async (query: string, filters?: {
  status?: string[];
  category?: string[];
  date_from?: string;
  date_to?: string;
  limit?: number;
}): Promise<{
  results: HelpRequest[];
  total: number;
  suggestions: string[];
}> => {
  const params = new URLSearchParams({ q: query });
  if (filters?.status) params.append('status', filters.status.join(','));
  if (filters?.category) params.append('category', filters.category.join(','));
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/search?${params}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Duplicate help request (for recurring requests)
 */
export const duplicateHelpRequest = async (requestId: number, data?: {
  visit_day?: string;
  time_slot?: string;
  notes?: string;
}): Promise<HelpRequest> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/${requestId}/duplicate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data || {}),
  });

  return handleResponse(response);
};
