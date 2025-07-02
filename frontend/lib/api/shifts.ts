import { API_BASE_URL, getAuthToken } from './api-client';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getAuthToken()}`,
});

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

export interface Shift {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  role: string;
  max_volunteers: number;
  required_skills: string;
  assigned_volunteer_id: number | null;
  assigned_volunteer?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  type: string;
  open_ended: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftFilters {
  volunteer_id?: number;
  date?: string;
  location?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateShiftData {
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
}

/**
 * Get all shifts with optional filters
 */
export const getShifts = async (filters?: ShiftFilters): Promise<{ data: Shift[]; pagination: any }> => {
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
 * Create a new shift
 */
export const createShift = async (shiftData: CreateShiftData): Promise<Shift> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/shifts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      date: shiftData.date,
      startTime: shiftData.start_time, // Map start_time to startTime for backend
      endTime: shiftData.end_time,     // Map end_time to endTime for backend
      location: shiftData.location,
      description: shiftData.description,
      role: shiftData.role || 'General Support',
      maxVolunteers: shiftData.maxVolunteers,
      requiredSkills: shiftData.requiredSkills || '',
      type: shiftData.type,
      openEnded: shiftData.openEnded,
    }),
  });

  return handleResponse(response);
};

/**
 * Update an existing shift
 */
export const updateShift = async (id: number, shiftData: Partial<CreateShiftData>): Promise<Shift> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/shifts/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(shiftData),
  });

  return handleResponse(response);
};

/**
 * Delete a shift
 */
export const deleteShift = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/shifts/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete shift');
  }
};

/**
 * Get shift details by ID
 */
export const getShiftById = async (id: number): Promise<Shift> => {
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
 * Unassign volunteer from shift
 */
export const unassignVolunteerFromShift = async (
  shiftId: number,
  reason?: string
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/volunteers/shifts/batch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      shiftIds: [shiftId],
      action: 'unassign',
      reason: reason,
      sendEmail: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to unassign volunteer from shift');
  }
};

/**
 * Reassign volunteer shift
 */
export const reassignShift = async (
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
export const markNoShow = async (
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
  action: 'unassign' | 'cancel' | 'delete' | 'duplicate',
  data?: {
    reason?: string;
    sendEmail?: boolean;
    newDate?: string;
  }
): Promise<void> => {
  let endpoint = '';
  let body: any = {};

  switch (action) {
    case 'unassign':
    case 'cancel':
      endpoint = '/api/v1/admin/volunteers/shifts/batch';
      body = {
        shiftIds: shiftIds,
        action: action,
        reason: data?.reason,
        sendEmail: data?.sendEmail !== false,
      };
      break;
    case 'delete':
      // Handle bulk delete by calling individual delete endpoints
      await Promise.all(shiftIds.map(id => deleteShift(id)));
      return;
    case 'duplicate':
      endpoint = '/api/v1/admin/shifts/bulk-duplicate';
      body = {
        shiftIds: shiftIds,
        newDate: data?.newDate,
      };
      break;
    default:
      throw new Error(`Unsupported bulk action: ${action}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to perform bulk ${action} on shifts`);
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
 * Get coverage gaps analysis
 */
export const getCoverageGaps = async (
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
 * Bulk assign volunteers to multiple shifts
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

/**
 * Get shift statistics
 */
export const getShiftStatistics = async (
  startDate?: string,
  endDate?: string
): Promise<any> => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/shifts/statistics?${params}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Export shifts data
 */
export const exportShifts = async (
  format: 'csv' | 'excel' | 'pdf',
  filters?: ShiftFilters
): Promise<Blob> => {
  const params = new URLSearchParams();
  params.append('format', format);
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/shifts/export?${params}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to export shifts data');
  }

  return response.blob();
};

/**
 * Import shifts from file
 */
export const importShifts = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/shifts/import`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: formData,
  });

  return handleResponse(response);
};
