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

// Handle API responses and errors
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

// ================================
// HELP REQUEST ANALYTICS & REPORTING APIS - 100% BACKEND COVERAGE
// ================================

export interface HelpRequestStats {
  total_requests: number;
  completed_requests: number;
  pending_requests: number;
  today_requests: number;
  this_week_requests: number;
  this_month_requests: number;
}

export interface HelpRequestAnalytics {
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
}

/**
 * Get comprehensive help request statistics
 */
export const getHelpRequestStats = async (): Promise<HelpRequestStats> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/stats`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Get help request analytics with advanced metrics
 */
export const getHelpRequestAnalytics = async (filters?: {
  date_from?: string;
  date_to?: string;
  category?: string;
}): Promise<HelpRequestAnalytics> => {
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
 * Generate help request reports in various formats
 */
export const generateHelpRequestReport = async (filters: {
  date_from: string;
  date_to: string;
  category?: string;
  status?: string;
  format?: 'json' | 'csv' | 'pdf';
}): Promise<Blob | any> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value.toString());
  });

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/report?${params}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate report');
  }

  // Return blob for file downloads or JSON for data
  return filters.format === 'json' ? await response.json() : await response.blob();
};

/**
 * Get help request capacity information for planning
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
 * Get help request performance metrics
 */
export const getHelpRequestPerformanceMetrics = async (filters?: {
  date_from?: string;
  date_to?: string;
}): Promise<{
  average_processing_time: number;
  resolution_rate: number;
  customer_satisfaction: number;
  staff_efficiency: Array<{
    staff_id: number;
    staff_name: string;
    requests_handled: number;
    average_time: number;
    satisfaction_score: number;
  }>;
  bottlenecks: Array<{
    stage: string;
    average_wait_time: number;
    requests_stuck: number;
  }>;
}> => {
  const params = new URLSearchParams();
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/performance?${params}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Get help request trends and forecasting
 */
export const getHelpRequestTrends = async (period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<{
  historical_data: Array<{
    period: string;
    count: number;
    category_breakdown: Record<string, number>;
  }>;
  forecast: Array<{
    period: string;
    predicted_count: number;
    confidence_interval: {
      lower: number;
      upper: number;
    };
  }>;
  seasonal_patterns: {
    peak_days: string[];
    peak_hours: number[];
    seasonal_factors: Record<string, number>;
  };
}> => {
  const params = new URLSearchParams({ period });

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/trends?${params}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Export help request data in various formats
 */
export const exportHelpRequestData = async (filters: {
  date_from?: string;
  date_to?: string;
  status?: string;
  category?: string;
  format: 'csv' | 'excel' | 'pdf';
  include_visitor_details?: boolean;
}): Promise<Blob> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) params.append(key, value.toString());
  });

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/help-requests/export?${params}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to export data');
  }

  return await response.blob();
};
