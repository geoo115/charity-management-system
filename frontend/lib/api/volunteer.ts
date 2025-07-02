import { VolunteerShift } from '@/lib/types/volunteer';
import { getFromLocalStorage } from '@/lib/hooks/use-local-storage';
import { withRateLimit, apiRateLimiter } from '@/lib/utils/api-rate-limiter';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const API_BASE = `${API_BASE_URL}/api/v1/volunteer`;

const getAuthHeaders = () => {
  const token = getFromLocalStorage('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// Helper function for API requests with rate limiting
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getFromLocalStorage('auth_token') || getFromLocalStorage('authToken');
  
  return apiRateLimiter.executeRequest(
    `volunteer-api-${endpoint}`,
    async () => {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      return response.json();
    },
    {
      maxRequests: 5, // Limit to 5 requests per minute per endpoint
      windowMs: 60000, // 1 minute window
      cacheTtl: 300000 // 5 minute cache
    }
  );
}

// Dashboard APIs with enhanced rate limiting
export const fetchDashboardStats = withRateLimit(
  async () => apiRequest('/dashboard/stats'),
  'dashboard-stats',
  { maxRequests: 2, windowMs: 30000, cacheTtl: 600000 } // 2 requests per 30 seconds, 10 min cache
);

export const fetchVolunteerRoleInfo = withRateLimit(
  async () => apiRequest('/role/info'),
  'role-info', 
  { maxRequests: 1, windowMs: 60000, cacheTtl: 1800000 } // 1 request per minute, 30 min cache
);

export const fetchOptimizedDashboard = async () => {
  return apiRequest('/dashboard/optimized');
};

export const fetchVolunteerActivity = async (): Promise<any> => {
  try {
    const response = await fetch('/api/v1/volunteer/activity', {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.recent_shifts || data.activities || [];
  } catch (error) {
    console.error('Error fetching volunteer activity:', error);
    throw error;
  }
};

export const fetchVolunteerAchievements = async (): Promise<any> => {
  try {
    const response = await fetch('/api/v1/volunteer/achievements', {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.achievements || [];
  } catch (error) {
    console.error('Error fetching volunteer achievements:', error);
    throw error;
  }
};

// Performance APIs
export const fetchPerformanceMetrics = async () => {
  return apiRequest('/performance');
};

export const fetchVolunteerRanking = async () => {
  return apiRequest('/ranking');
};

// Profile APIs
export const fetchVolunteerProfile = async () => {
  return apiRequest('/profile');
};

export const updateVolunteerProfile = async (profileData: any) => {
  return apiRequest('/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

// Shift APIs
export const fetchAvailableShifts = async (): Promise<VolunteerShift[]> => {
  return apiRequest('/shifts/available');
};

export const fetchAssignedShifts = async () => {
  const response = await apiRequest<any>('/shifts/assigned');
  // Handle different response formats from backend
  return Array.isArray(response) ? response : (response.shifts || response.data || []);
};

export const fetchShiftHistory = async () => {
  return apiRequest('/shifts/history');
};

export const fetchShiftDetails = async (shiftId: string) => {
  return apiRequest(`/shifts/${shiftId}`);
};

export const signupForShift = async (shiftId: number, flexibleTime?: {
  startTime: string;
  endTime: string;
  duration: number;
}) => {
  const body: any = {};
  
  if (flexibleTime) {
    body.flexibleTime = flexibleTime;
  }
  
  return apiRequest(`/shifts/${shiftId}/signup`, {
    method: 'POST',
    body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
  });
};

export const cancelShift = async (shiftId: number, reason?: string) => {
  return apiRequest(`/shifts/${shiftId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || 'No reason provided' }),
  });
};

export const validateShiftAvailability = async (shiftId: number) => {
  return apiRequest(`/shifts/${shiftId}/validate`);
};

export const fetchEmergencyShifts = async () => {
  return apiRequest('/shifts/emergency');
};

// Tasks APIs
export const fetchVolunteerTasks = async () => {
  return apiRequest('/tasks');
};

export const updateTaskStatus = async (taskId: number, status: string) => {
  return apiRequest(`/tasks/${taskId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

// Notifications APIs
export const fetchVolunteerNotifications = async () => {
  return apiRequest('/notifications');
};

export const markNotificationAsRead = async (notificationId: number) => {
  return apiRequest(`/notifications/${notificationId}/read`, {
    method: 'PUT',
  });
};

export const markAllNotificationsAsRead = async () => {
  return apiRequest('/notifications/read-all', {
    method: 'PUT',
  });
};

export const deleteNotification = async (notificationId: number) => {
  return apiRequest(`/notifications/${notificationId}`, {
    method: 'DELETE',
  });
};

export const fetchNotificationSettings = async () => {
  return apiRequest('/notification-settings');
};

export const updateNotificationSettings = async (settings: any) => {
  return apiRequest('/notification-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
};

// Announcements APIs
export const fetchVolunteerAnnouncements = async () => {
  return apiRequest('/announcements');
};

export const markAnnouncementAsRead = async (announcementId: number) => {
  return apiRequest(`/announcements/${announcementId}/read`, {
    method: 'POST',
  });
};

// Additional APIs
export const fetchVolunteerNotes = async () => {
  return apiRequest('/notes');
};

export const fetchHoursSummary = async () => {
  return apiRequest('/hours/summary');
};

export const fetchTeamStats = async () => {
  return apiRequest('/team/stats');
};

// Application status API
export const fetchVolunteerApplicationStatus = async () => {
  return apiRequest('/application/status');
};

// Legacy function for compatibility
export const applyForShift = async (shiftId: number) => {
  return signupForShift(shiftId);
};

// Fetch volunteer teams (for lead volunteers)
export const fetchVolunteerTeams = async (): Promise<any> => {
  try {
    const response = await fetch('/api/v1/volunteer/lead/teams', {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.teams || [];
  } catch (error) {
    console.error('Error fetching volunteer teams:', error);
    throw error;
  }
};

// Create a new volunteer team
export const createVolunteerTeam = async (teamData: any): Promise<any> => {
  try {
    const response = await fetch('/api/v1/volunteer/lead/teams', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(teamData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating volunteer team:', error);
    throw error;
  }
};

// Get available volunteers for team assignment
export const fetchAvailableVolunteers = async (): Promise<any> => {
  try {
    const response = await fetch('/api/v1/volunteer/lead/available-volunteers', {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.volunteers || [];
  } catch (error) {
    console.error('Error fetching available volunteers:', error);
    throw error;
  }
};

// Assign a task to a volunteer
export const assignVolunteerTask = async (taskData: any): Promise<any> => {
  try {
    const response = await fetch('/api/v1/volunteer/lead/tasks/assign', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error assigning volunteer task:', error);
    throw error;
  }
};

// Get tasks created by lead volunteer
export const fetchCreatedTasks = async (): Promise<any> => {
  try {
    const response = await fetch('/api/v1/volunteer/lead/tasks/created', {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.tasks || [];
  } catch (error) {
    console.error('Error fetching created tasks:', error);
    throw error;
  }
};
