import { apiClient } from './api-client';

// Helper function to handle API responses
const apiRequest = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await apiClient.request(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
};

export interface StaffProfile {
  id: number;
  user_id: number;
  employee_id: string;
  department: string;
  position: string;
  hire_date: string;
  supervisor_id?: number;
  status: 'active' | 'inactive' | 'suspended' | 'training';
  skills: string;
  certifications: string;
  work_schedule: string;
  contact_info: string;
  emergency_contact: string;
  notes: string;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  supervisor?: StaffProfile;
}

export interface StaffAssignment {
  id: number;
  staff_id: number;
  queue_id: number;
  department: string;
  shift_start: string;
  shift_end: string;
  status: string;
  assigned_by: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface StaffPerformanceMetric {
  id: number;
  staff_id: number;
  metric_type: string;
  metric_value: number;
  measurement_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface StaffSchedule {
  id: number;
  staff_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  break_start?: string;
  break_end?: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffRequest {
  user_id: number;
  employee_id: string;
  department: string;
  position: string;
  hire_date: string;
  supervisor_id?: number;
  skills?: string[];
  certifications?: string[];
  work_schedule?: any;
  contact_info?: any;
  emergency_contact?: any;
  notes?: string;
}

export interface UpdateStaffRequest {
  department?: string;
  position?: string;
  supervisor_id?: number;
  status?: string;
  skills?: string[];
  certifications?: string[];
  work_schedule?: any;
  contact_info?: any;
  emergency_contact?: any;
  notes?: string;
}

export interface StaffListResponse {
  staff: StaffProfile[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface StaffDashboardData {
  overview: {
    total_staff: number;
    active_staff: number;
    on_shift: number;
    departments: number;
  };
  recent_activity: Array<{
    id: string;
    staff_name: string;
    action: string;
    timestamp: string;
    details: string;
  }>;
  performance_summary: {
    average_performance: number;
    top_performers: Array<{
      name: string;
      performance: number;
    }>;
  };
  upcoming_shifts: Array<{
    staff_name: string;
    department: string;
    start_time: string;
    end_time: string;
  }>;
}

// Staff CRUD Operations
export const createStaff = async (data: CreateStaffRequest): Promise<StaffProfile> => {
  return apiRequest<StaffProfile>('/api/v1/admin/staff', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getStaffList = async (params?: {
  page?: number;
  pageSize?: number;
  department?: string;
  status?: string;
  search?: string;
}): Promise<StaffListResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
  if (params?.department) searchParams.append('department', params.department);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.search) searchParams.append('search', params.search);

  const url = `/api/v1/admin/staff${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  return apiRequest<StaffListResponse>(url);
};

export const getStaff = async (id: number): Promise<{
  staff: StaffProfile;
  performance: any;
}> => {
  return apiRequest<{
    staff: StaffProfile;
    performance: any;
  }>(`/api/v1/admin/staff/${id}`);
};

export const updateStaff = async (id: number, data: UpdateStaffRequest): Promise<StaffProfile> => {
  return apiRequest<StaffProfile>(`/api/v1/admin/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteStaff = async (id: number, hard?: boolean): Promise<{ message: string }> => {
  const url = `/api/v1/admin/staff/${id}${hard ? '?hard=true' : ''}`;
  return apiRequest<{ message: string }>(url, {
    method: 'DELETE',
  });
};

// Staff Assignment Operations
export const assignStaffToQueue = async (data: {
  staff_id: number;
  queue_id: number;
  department: string;
  shift_start: string;
  shift_end: string;
  notes?: string;
}): Promise<StaffAssignment> => {
  return apiRequest<StaffAssignment>('/api/v1/admin/staff/assignments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getStaffAssignments = async (staffId?: number): Promise<StaffAssignment[]> => {
  const url = staffId ? `/api/v1/admin/staff/assignments?staff_id=${staffId}` : '/api/v1/admin/staff/assignments';
  return apiRequest<StaffAssignment[]>(url);
};

// Staff Performance Operations
export const getStaffPerformance = async (id: number, params?: {
  start_date?: string;
  end_date?: string;
  metric_type?: string;
}): Promise<{
  metrics: StaffPerformanceMetric[];
  summary: any;
}> => {
  const searchParams = new URLSearchParams();
  if (params?.start_date) searchParams.append('start_date', params.start_date);
  if (params?.end_date) searchParams.append('end_date', params.end_date);
  if (params?.metric_type) searchParams.append('metric_type', params.metric_type);

  const url = `/api/v1/admin/staff/${id}/performance${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  return apiRequest<{
    metrics: StaffPerformanceMetric[];
    summary: any;
  }>(url);
};

// Staff Schedule Operations
export const getStaffSchedule = async (id: number): Promise<{
  schedule: StaffSchedule[];
  current_shift?: any;
}> => {
  return apiRequest<{
    schedule: StaffSchedule[];
    current_shift?: any;
  }>(`/api/v1/admin/staff/${id}/schedule`);
};

export const updateStaffSchedule = async (id: number, schedule: Partial<StaffSchedule>[]): Promise<{
  message: string;
  schedule: StaffSchedule[];
}> => {
  return apiRequest<{
    message: string;
    schedule: StaffSchedule[];
  }>(`/api/v1/admin/staff/${id}/schedule`, {
    method: 'PUT',
    body: JSON.stringify({ schedule }),
  });
};

// Staff Dashboard
export const getStaffDashboard = async (): Promise<StaffDashboardData> => {
  return apiRequest<StaffDashboardData>('/api/v1/admin/staff/dashboard');
};

// Utility functions
export const getStaffDepartments = (): string[] => {
  return ['general', 'food', 'emergency', 'admin', 'support'];
};

export const getStaffPositions = (): string[] => {
  return ['coordinator', 'specialist', 'supervisor', 'manager', 'assistant'];
};

export const getStaffStatuses = (): Array<{ value: string; label: string }> => {
  return [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'training', label: 'Training' },
  ];
}; 