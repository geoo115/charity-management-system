import { getFromLocalStorage } from '@/lib/hooks/use-local-storage';
import { apiClient } from './api-client';

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
// TYPE DEFINITIONS
// ================================

// Minimal types used by communications APIs
export interface CommunicationMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'maintenance';
  recipients: string[];
  channels: string[];
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  estimatedReach: number;
  actualReach?: number;
  deliveryRate?: number;
  createdBy: string;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  content: string;
  variables: string[];
  isActive: boolean;
  usageCount: number;
  lastUsed?: string;
  createdAt: string;
}


export interface AdminDashboard {
  kpis: {
    today_requests: number;
    today_tickets: number;
    pending_requests: number;
    pending_verifications: number;
    volunteer_coverage: number;
    urgent_needs: number;
  };
  alerts: SystemAlert[];
  recent_activity: HelpRequest[];
  urgent_needs: UrgentNeed[];
  visitor_metrics: {
    total_active: number;
    pending_verifications: number;
    pending_requests: number;
    recent_requests: HelpRequest[];
    pending_documents: PendingDocument[];
    trends: MetricTrend[];
  };
  volunteer_metrics: {
    total_volunteers: number;
    active_volunteers: number;
    pending_applications: number;
    shift_coverage: number;
    reliability_stats: ReliabilityStats;
  };
}

export interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  action?: {
    label: string;
    url: string;
  };
}

export interface HelpRequest {
  id: number;
  visitor_id: number;
  visitor_name: string;
  category: string;
  reference: string;
  status: 'pending' | 'approved' | 'rejected' | 'ticket_issued' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  details: string;
  visit_day: string;
  time_slot: string;
  household_size?: number;
  special_requirements?: string;
  dietary_requirements?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  approved_by?: number;
  ticket_number?: string;
  qr_code?: string;
  eligibility_notes?: string;
  visitor: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: 'Visitor' | 'Volunteer' | 'Donor' | 'Admin';
  status: 'active' | 'pending' | 'suspended' | 'pending_verification';
  email_verified: boolean;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  address?: string;
  emergency_contact?: string;
  dietary_requirements?: string;
  household_size?: number;
}

export interface Document {
  id: number;
  user_id: number;
  type: string;
  name: string;
  title?: string;
  file_path: string;
  status: 'pending' | 'approved' | 'rejected';
  description?: string;
  verified_by?: number;
  verified_at?: string;
  uploaded_at: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface PendingDocument {
  id: number;
  visitor_name: string;
  document_type: string;
  uploaded_date: string;
}

export interface UrgentNeed {
  id: number;
  category: string;
  item: string;
  description: string;
  priority: string;
}

export interface MetricTrend {
  date: string;
  requests: number;
  visits: number;
}

export interface ReliabilityStats {
  average_rating: number;
  completion_rate: number;
  no_show_rate: number;
}

export interface Volunteer {
  id: number;
  user_id: number;
  application_id?: number; // Application ID for approval/rejection
  skills: string[];
  availability: string[];
  background_check: boolean;
  references: string[];
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  user: User;
}

export interface Feedback {
  id: number;
  visitor_id: number;
  visit_id: number;
  overall_rating: number;
  staff_rating: number;
  facility_rating: number;
  wait_time_rating: number;
  service_quality_rating: number;
  comments: string;
  suggestions: string;
  review_status: 'pending' | 'reviewed' | 'responded' | 'escalated' | 'resolved';
  admin_response?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  visitor: User;
}

export interface AdminDonation {
  id: string;
  donor_name: string;
  donor_email: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  donation_date: string;
  campaign?: string;
  payment_method: string;
  is_anonymous: boolean;
  receipt_sent: boolean;
  notes?: string;
  type: 'monetary' | 'goods';
  goods?: string;
  created_at: string;
  updated_at: string;
}

// ================================
// DASHBOARD APIs
// ================================

/**
 * Get admin dashboard data
 */
export const getAdminDashboard = async (): Promise<AdminDashboard> => {
  const response = await apiClient.get('/api/v1/admin/dashboard');

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Get system alerts
 */
export const getSystemAlerts = async (): Promise<SystemAlert[]> => {
  const response = await apiClient.get('/api/v1/admin/alerts');

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

// ================================
// USER MANAGEMENT APIs
// ================================

/**
 * Get all users with filters
 */
export const getUsers = async (filters?: {
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ data: User[]; pagination: any }> => {
  const params = new URLSearchParams();
  if (filters?.role && filters.role !== 'all') params.append('role', filters.role);
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('pageSize', filters.limit.toString());
  if (filters?.search) params.append('search', filters.search);

  const response = await apiClient.get(`/api/v1/admin/users?${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Get user by ID
 */
export const getUser = async (id: number): Promise<User> => {
  const response = await apiClient.get(`/api/v1/admin/users/${id}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Update user status
 */
export const updateUserStatus = async (
  id: number, 
  status: string, 
  notes?: string
): Promise<void> => {
  const response = await apiClient.put(`/api/v1/admin/users/${id}/status`, {
    status, 
    notes,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update user status');
  }
};

/**
 * Update user profile
 */
export const updateUser = async (id: number, userData: Partial<User>): Promise<User> => {
  const response = await apiClient.put(`/api/v1/admin/users/${id}`, userData);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Create user
 */
export const createUser = async (userData: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  status?: string;
  address?: string;
  emergency_contact?: string;
  dietary_requirements?: string;
  household_size?: number;
}): Promise<User> => {
  const response = await apiClient.post('/api/v1/admin/users', userData);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Delete user
 */
export const deleteUser = async (id: number): Promise<void> => {
  const response = await apiClient.delete(`/api/v1/admin/users/${id}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete user');
  }
};

// ================================
// HELP REQUEST MANAGEMENT APIs
// ================================

/**
 * Get help requests with filters
 */
export const getHelpRequests = async (filters?: {
  status?: string;
  category?: string;
  priority?: string;
  page?: number;
  limit?: number;
  date_from?: string;
  date_to?: string;
}): Promise<{ data: HelpRequest[]; pagination: any }> => {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
  if (filters?.priority && filters.priority !== 'all') params.append('priority', filters.priority);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('pageSize', filters.limit.toString());
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);

  const response = await apiClient.get(`/api/v1/admin/help-requests?${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Get help request by ID
 */
export const getHelpRequest = async (id: number): Promise<HelpRequest> => {
  const response = await apiClient.get(`/api/v1/admin/help-requests/${id}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Approve help request
 */
export const approveHelpRequest = async (
  id: number,
  data: { notes?: string; issue_ticket?: boolean }
): Promise<any> => {
  const response = await apiClient.post(`/api/v1/admin/help-requests/${id}/approve`, data);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Reject help request
 */
export const rejectHelpRequest = async (
  id: number,
  data: { reason: string; notes?: string }
): Promise<void> => {
  const response = await apiClient.post(`/api/v1/admin/help-requests/${id}/reject`, data);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to reject help request');
  }
};

/**
 * Update help request status
 */
export const updateHelpRequestStatus = async (
  id: number,
  status: string,
  notes?: string
): Promise<void> => {
  const response = await apiClient.put(`/api/v1/admin/help-requests/${id}/status`, {
    status,
    notes,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update help request status');
  }
};

/**
 * Get help request statistics
 */
export const getHelpRequestStats = async (): Promise<{
  total_requests: number;
  completed_requests: number;
  pending_requests: number;
  today_requests: number;
  this_week_requests: number;
  this_month_requests: number;
}> => {
  const response = await apiClient.get('/api/v1/admin/help-requests/stats');

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch help request statistics');
  }

  return await response.json();
};

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

  const response = await apiClient.get(`/api/v1/admin/help-requests?${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
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
  failed_requests: any[];
}> => {
  const response = await apiClient.post('/api/v1/admin/help-requests/bulk-issue-tickets', data);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to bulk issue tickets');
  }

  return await response.json();
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
  }
): Promise<HelpRequest> => {
  const response = await apiClient.put(`/api/v1/help-requests/${id}`, data);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update help request');
  }

  return await response.json();
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
  const response = await apiClient.post(`/api/v1/admin/help-requests/${requestId}/verify-documents`, data);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to verify visitor documents');
  }
};

/**
 * Get help request capacity information
 */
export const getHelpRequestCapacity = async (date: string, category?: string): Promise<{
  date: string;
  category: string;
  max_capacity: number;
  current_bookings: number;
  available_slots: number;
  time_slots: Array<{
    time: string;
    available: boolean;
    booked_count: number;
    max_capacity: number;
  }>;
}> => {
  const params = new URLSearchParams({ date });
  if (category) params.append('category', category);

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/capacity?${params}`, {
    headers: getAuthHeaders(),
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
  errors: any[];
}> => {
  const response = await apiClient.post('/api/v1/admin/help-requests/bulk-update-status', data);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to bulk update help request statuses');
  }

  return await response.json();
};

// ================================
// DOCUMENT MANAGEMENT APIs
// ================================

/**
 * Get pending documents for verification
 */
export const getPendingDocuments = async (): Promise<Document[]> => {
  const response = await apiClient.get('/api/v1/admin/documents/pending');

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  // Backend returns { documents: [...], total: X, timestamp: Y }
  return data.documents || [];
};

/**
 * Get document statistics
 */
export const getDocumentStats = async (): Promise<any> => {
  const response = await apiClient.get('/api/v1/admin/documents/stats');

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Verify document
 */
export const verifyDocument = async (
  id: number,
  data: {
    status: 'approved' | 'rejected';
    notes?: string;
    rejection_reason?: string;
  }
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/documents/verify/${id}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse(response);
};

/**
 * Verify visitor documents (bulk)
 */
export const verifyVisitorDocuments = async (
  userId: number,
  data: {
    photo_id_approved: boolean;
    proof_address_approved: boolean;
    notes?: string;
    rejection_reason?: string;
  }
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/documents/verify`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to verify documents');
  }
};

// ================================
// VOLUNTEER MANAGEMENT APIs
// ================================

/**
 * Get volunteers with filters
 */
export const getVolunteers = async (filters?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Volunteer[]; pagination: any }> => {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('page_size', filters.limit.toString());

  const response = await apiClient.get(`/api/v1/admin/volunteers?${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  
  // Transform the backend response to match frontend Volunteer interface
  const transformedVolunteers = (result.volunteers || []).map((v: any) => ({
    id: v.application_id || v.id, // Use application ID for approval, fallback to user ID
    user_id: v.id, // User ID
    application_id: v.application_id, // Application ID for approval/rejection
    skills: Array.isArray(v.skills) ? v.skills : [],
    availability: Array.isArray(v.availability) ? v.availability : [],
    background_check: v.background_check || false,
    references: Array.isArray(v.references) ? v.references : [],
    status: v.status || v.profile_status || 'pending',
    created_at: v.created_at,
    updated_at: v.updated_at,
    user: {
      id: v.id,
      first_name: v.first_name || '',
      last_name: v.last_name || '',
      email: v.email || '',
      phone: v.phone || '',
      role: 'Volunteer' as const,
      status: v.status || 'pending',
      email_verified: true,
      created_at: v.created_at,
      updated_at: v.updated_at,
    }
  }));
  
  return {
    data: transformedVolunteers,
    pagination: result.pagination || {}
  };
};

/**
 * Approve volunteer
 */
export const approveVolunteer = async (id: number, notes?: string): Promise<void> => {
  const response = await apiClient.post(`/api/v1/admin/volunteers/${id}/approve`, {
    notes,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to approve volunteer');
  }
};

/**
 * Reject volunteer
 */
export const rejectVolunteer = async (id: number, reason: string): Promise<void> => {
  const response = await apiClient.post(`/api/v1/admin/volunteers/${id}/reject`, {
    reason,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to reject volunteer');
  }
};

// ================================
// FEEDBACK MANAGEMENT APIs
// ================================

/**
 * Get all feedback with filtering and pagination
 */
export const getAllFeedback = async (params: {
  status?: string;
  type?: string;
  page?: number;
  per_page?: number;
} = {}): Promise<{
  feedback: Feedback[];
  total: number;
  page: number;
  per_page: number;
}> => {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.append('status', params.status);
  if (params.type) searchParams.append('type', params.type);
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.per_page) searchParams.append('per_page', params.per_page.toString());

  const response = await apiClient.get(`/api/v1/admin/feedback?${searchParams}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch feedback');
  }

  return await response.json();
};

/**
 * Get feedback (alias for getAllFeedback for backward compatibility)
 */
export const getFeedback = getAllFeedback;

/**
 * Get feedback analytics
 */
export const getFeedbackAnalytics = async (): Promise<{
  total_feedback: number;
  pending_count: number;
  resolved_count: number;
  average_rating: number;
  sentiment_analysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
  monthly_trends: Array<{
    month: string;
    count: number;
    average_rating: number;
  }>;
  category_breakdown: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}> => {
  const response = await apiClient.get('/api/v1/admin/feedback/analytics');

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch feedback analytics');
  }

  return await response.json();
};

/**
 * Update feedback status and add admin response
 */
export const updateFeedbackStatus = async (
  id: number,
  data: {
    review_status: string;
    admin_response?: string;
    admin_notes?: string;
  }
): Promise<void> => {
  const response = await apiClient.put(`/api/v1/admin/feedback/${id}/status`, data);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update feedback status');
  }
};

/**
 * Bulk respond to multiple feedback entries
 */
export const bulkRespondToFeedback = async (data: {
  feedback_ids: number[];
  review_status: string;
  admin_response?: string;
  admin_notes?: string;
}): Promise<{
  success: boolean;
  message: string;
  updatedCount: number;
  feedbackIds: number[];
  reviewStatus: string;
  adminId: number;
  processedAt: string;
}> => {
  const response = await apiClient.post('/api/v1/admin/feedback/bulk-response', data);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to bulk respond to feedback');
  }

  return await response.json();
};

/**
 * Get volunteer conversation by volunteer ID
 */
export const getVolunteerConversation = async (volunteerId: number): Promise<any> => {
  const response = await apiClient.get(`/api/v1/admin/volunteers/${volunteerId}/messages`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Send broadcast message
 */
export const sendBroadcastMessage = async (data: any): Promise<any> => {
  const response = await apiClient.post('/api/v1/admin/communications/broadcast', data);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to send broadcast message');
  }

  return await response.json();
};

/**
 * Send targeted message
 */
export const sendTargetedMessage = async (data: any): Promise<any> => {
  const response = await apiClient.post('/api/v1/admin/communications/targeted', data);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to send targeted message');
  }

  return await response.json();
};

/**
 * Get communication messages with filtering and pagination
 */
export const getCommunicationMessages = async (params: {
  status?: string;
  page?: number;
  per_page?: number;
  type?: string;
} = {}): Promise<{
  messages: CommunicationMessage[];
  total: number;
  page: number;
  per_page: number;
}> => {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.append('status', params.status);
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.per_page) searchParams.append('per_page', params.per_page.toString());
  if (params.type) searchParams.append('type', params.type);

  const response = await apiClient.get(`/api/v1/admin/communications/messages?${searchParams}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch communication messages');
  }

  return await response.json();
};

/**
 * Get communication templates
 */
export const getCommunicationTemplates = async (): Promise<MessageTemplate[]> => {
  const response = await apiClient.get('/api/v1/admin/communications/templates');

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch communication templates');
  }

  return await response.json();
};

// ================================
// ANALYTICS & REPORTS APIs
// ================================

/**
 * Get comprehensive analytics dashboard data
 */
export const getAnalytics = async (filters?: {
  period?: string;
  date_from?: string;
  date_to?: string;
}): Promise<any> => {
  const params = new URLSearchParams();
  if (filters?.period) params.append('period', filters.period);
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);

  const response = await apiClient.get(`/api/v1/admin/analytics?${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Get visitor analytics
 */
export const getVisitorAnalytics = async (period?: string): Promise<any> => {
  const params = new URLSearchParams();
  if (period) params.append('period', period);

  const response = await apiClient.get(`/api/v1/admin/analytics/visitor-trends?${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Get help request analytics
 */
export const getHelpRequestAnalytics = async (filters?: {
  date_from?: string;
  date_to?: string;
  category?: string;
}): Promise<{
  total_requests: number;
  completion_rate: number;
  average_processing_time: number;
  category_breakdown: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  status_breakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  daily_trends: Array<{
    date: string;
    count: number;
    completed: number;
  }>;
  peak_hours: Array<{
    hour: number;
    count: number;
  }>;
}> => {
  const params = new URLSearchParams();
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  if (filters?.category) params.append('category', filters.category);

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/analytics?${params}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Get volunteer analytics
 */
export const getVolunteerAnalytics = async (period?: string): Promise<any> => {
  const params = new URLSearchParams();
  if (period) params.append('period', period);

  const response = await apiClient.get(`/api/v1/admin/analytics/volunteer-performance?${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Export reports
 */
export const exportReport = async (
  type: string,
  format: 'csv' | 'excel' | 'pdf',
  filters?: any
): Promise<Blob> => {
  const params = new URLSearchParams();
  params.append('type', type);
  params.append('format', format);
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/reports/export?${params}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to export report');
  }

  return response.blob();
};

// ================================
// SYSTEM SETTINGS APIs
// ================================

/**
 * Get system settings
 */
export const getSystemSettings = async (): Promise<any> => {
  const response = await apiClient.get('/api/v1/admin/settings');

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Update system settings
 */
export const updateSystemSettings = async (settings: any): Promise<void> => {
  const response = await apiClient.put('/api/v1/admin/settings', settings);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update system settings');
  }
};

/**
 * Get email templates
 */
export const getEmailTemplates = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/settings/email-templates`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Update email template
 */
export const updateEmailTemplate = async (
  templateId: string,
  template: any
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/settings/email-templates/${templateId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(template),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update email template');
  }
};

/**
 * Test email configuration
 */
export const testEmailConfiguration = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/settings/test-email`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

// ================================
// ENHANCED DOCUMENT MANAGEMENT APIs
// ================================

/**
 * Get all documents with filters
 */
export const getDocuments = async (filters?: {
  status?: string;
  type?: string;
  user_id?: number;
  page?: number;
  limit?: number;
  date_from?: string;
  date_to?: string;
}): Promise<{ data: Document[]; pagination: any }> => {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
  if (filters?.user_id) params.append('user_id', filters.user_id.toString());
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('pageSize', filters.limit.toString());
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);

  const response = await apiClient.get(`/api/v1/admin/documents?${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Get document by ID
 */
export const getDocument = async (id: number): Promise<Document> => {
  const response = await apiClient.get(`/api/v1/admin/documents/${id}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Approve document
 */
export const approveDocument = async (id: number, notes?: string): Promise<void> => {
  const response = await apiClient.post(`/api/v1/admin/documents/${id}/approve`, {
    notes,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to approve document');
  }
};

/**
 * Reject document
 */
export const rejectDocument = async (
  id: number,
  reason: string,
  notes?: string
): Promise<void> => {
  const response = await apiClient.post(`/api/v1/admin/documents/${id}/reject`, {
    reason,
    notes,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to reject document');
  }
};

/**
 * Download document
 */
export const downloadDocument = async (id: number): Promise<Blob> => {
  const response = await apiClient.get(`/api/v1/admin/documents/${id}/download`);

  if (!response.ok) {
    throw new Error('Failed to download document');
  }

  return response.blob();
};

// ================================
// ENHANCED VOLUNTEER MANAGEMENT APIs
// ================================

/**
 * Get volunteer by ID
 */
export const getVolunteer = async (id: number): Promise<Volunteer> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${id}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Update volunteer status
 */
export const updateVolunteerStatus = async (
  id: number,
  status: string,
  notes?: string
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/volunteers/${id}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, notes }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update volunteer status');
  }
};

/**
 * Get volunteer shifts
 */
export const getVolunteerShifts = async (filters?: {
  volunteer_id?: number;
  date?: string;
  location?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<any> => {
  const params = new URLSearchParams();
  if (filters?.volunteer_id) params.append('volunteer_id', filters.volunteer_id.toString());
  if (filters?.date) params.append('date', filters.date);
  if (filters?.location) params.append('location', filters.location);
  if (filters?.role) params.append('role', filters.role);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('pageSize', filters.limit.toString());

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/shifts?${params}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Create volunteer shift
 */
export const createVolunteerShift = async (shiftData: {
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  role?: string;
  maxVolunteers: number;
  requiredSkills?: string;
  type: string;
  openEnded: boolean;
}): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/shifts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      date: shiftData.date,
      startTime: shiftData.start_time,
      endTime: shiftData.end_time,
      location: shiftData.location,
      description: shiftData.description,
      role: shiftData.role || 'General Support',
      maxVolunteers: shiftData.maxVolunteers,
      requiredSkills: shiftData.requiredSkills,
      type: shiftData.type,
      openEnded: shiftData.openEnded,
    }),
  });

  return handleResponse(response);
};

/**
 * Update volunteer shift
 */
export const updateVolunteerShift = async (id: number, shiftData: any): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/shifts/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(shiftData),
  });

  return handleResponse(response);
};

/**
 * Delete volunteer shift
 */
export const deleteVolunteerShift = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/shifts/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete volunteer shift');
  }
};

/**
 * Get shift details by ID
 */
export const getShiftDetails = async (id: number): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/shifts/${id}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Assign volunteer to shift
 */
export const assignVolunteerToShift = async (
  shiftId: number,
  volunteerId: number,
  notes?: string
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/volunteers/shifts/assign`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      volunteerId: volunteerId,
      shiftIds: [shiftId],
      notes: notes,
      sendEmail: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to assign volunteer to shift');
  }
};

/**
 * Reassign volunteer shift
 */
export const reassignVolunteerShift = async (
  shiftId: number,
  newVolunteerId: number,
  reason?: string,
  notifyOldVolunteer: boolean = true,
  notifyNewVolunteer: boolean = true
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/shifts/reassign`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      shiftId: shiftId,
      newVolunteerId: newVolunteerId,
      reason: reason,
      notifyOldVolunteer: notifyOldVolunteer,
      notifyNewVolunteer: notifyNewVolunteer,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to reassign volunteer shift');
  }
};

/**
 * Mark volunteer as no-show for shift
 */
export const markVolunteerNoShow = async (
  shiftId: number,
  volunteerId: number,
  reason?: string
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/shifts/${shiftId}/no-show`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      volunteerId: volunteerId,
      reason: reason,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to mark volunteer as no-show');
  }
};

/**
 * Bulk update shifts
 */
export const bulkUpdateShifts = async (
  shiftIds: number[],
  action: string,
  data?: any
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/volunteers/shifts/batch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      shiftIds: shiftIds,
      action: action,
      reason: data?.reason,
      sendEmail: data?.sendEmail !== false,
      ...data,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to perform bulk update on shifts');
  }
};

/**
 * Get volunteer shift history
 */
export const getVolunteerShiftHistory = async (
  volunteerId: number,
  page: number = 1,
  pageSize: number = 10
): Promise<any> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/admin/volunteers/${volunteerId}/shifts/history?page=${page}&pageSize=${pageSize}`,
    {
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
};

/**
 * Get volunteer coverage gaps
 */
export const getVolunteerCoverageGaps = async (
  startDate?: string,
  endDate?: string
): Promise<any> => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/volunteers/coverage-gaps?${params}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Bulk assign volunteers to shifts
 */
export const bulkAssignVolunteers = async (assignments: {
  volunteerId: number;
  shiftIds: number[];
  notes?: string;
}[]): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/volunteers/bulk-assign`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      assignments: assignments,
    }),
  });

  return handleResponse(response);
};

// ================================
// DONATION MANAGEMENT APIs
// ================================

/**
 * Get donations with filtering and pagination
 */
export const getDonations = async (params: {
  status?: string;
  page?: number;
  per_page?: number;
  type?: string;
} = {}): Promise<{
  donations: AdminDonation[];
  total: number;
  page: number;
  per_page: number;
}> => {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.append('status', params.status);
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.per_page) searchParams.append('per_page', params.per_page.toString());
  if (params.type) searchParams.append('type', params.type);

  const response = await apiClient.get(`/api/v1/admin/donations?${searchParams}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch donations');
  }

  return await response.json();
};

/**
 * Update donation status
 */
export const updateDonationStatus = async (
  donationId: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded'
): Promise<void> => {
  const response = await apiClient.put(`/api/v1/admin/donations/${donationId}/status`, {
    status: status
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update donation status');
  }
};

/**
 * Send donation receipt
 */
export const sendDonationReceipt = async (donationId: string): Promise<void> => {
  const response = await apiClient.post(`/api/v1/admin/donations/${donationId}/send-receipt`, {});

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to send donation receipt');
  }
};

/**
 * Get donation analytics
 */
export const getDonationAnalytics = async (): Promise<{
  total_donations: number;
  total_amount: number;
  monthly_total: number;
  pending_count: number;
  completed_count: number;
  failed_count: number;
  refunded_count: number;
  top_donors: Array<{
    name: string;
    total_amount: number;
    donation_count: number;
  }>;
  monthly_trends: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
}> => {
  const response = await apiClient.get('/api/v1/admin/donations/analytics');

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch donation analytics');
  }

  return await response.json();
};

/**
 * Assign volunteer to help request
 */
export const assignVolunteerToRequest = async (
  requestId: string,
  volunteerId: string,
  notes?: string
): Promise<void> => {
  const response = await apiClient.post(`/api/v1/admin/help-requests/${requestId}/assign`, {
    volunteer_id: volunteerId,
    notes: notes
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to assign volunteer to request');
  }
};

/**
 * Add note to help request
 */
export const addHelpRequestNote = async (
  requestId: string,
  note: string,
  isInternal: boolean = false
): Promise<void> => {
  const response = await apiClient.post(`/api/v1/admin/help-requests/${requestId}/notes`, {
    note: note,
    is_internal: isInternal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to add note to help request');
  }
};

/**
 * Get help request timeline and history
 */
export const getHelpRequestTimeline = async (requestId: string): Promise<Array<{
  id: number;
  timestamp: string;
  action: string;
  description: string;
  user: string;
  notes?: string;
}>> => {
  const response = await apiClient.get(`/api/v1/admin/help-requests/${requestId}/timeline`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch help request timeline');
  }

  return await response.json();
};

/**
 * Issue ticket for help request
 */
export const issueTicket = async (
  requestId: string,
  data: {
    visit_day: string;
    time_slot: string;
    notes?: string;
  }
): Promise<{
  ticket_number: string;
  qr_code: string;
  visit_day: string;
  time_slot: string;
}> => {
  const response = await apiClient.post(`/api/v1/admin/help-requests/${requestId}/issue-ticket`, data);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to issue ticket');
  }

  return await response.json();
};
