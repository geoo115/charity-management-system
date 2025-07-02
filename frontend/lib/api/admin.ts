import { apiClient } from './api-client';

// Admin dashboard data fetcher
export const fetchAdminDashboard = async () => {
  try {
    const response = await apiClient.get('/api/v1/admin/dashboard');
    
    if (!response.ok) {
      throw new Error('Failed to fetch admin dashboard data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    throw error;
  }
};

// Fetch help requests
export const fetchHelpRequests = async () => {
  try {
    const response = await apiClient.get('/api/v1/help-requests');
    
    if (!response.ok) {
      throw new Error('Failed to fetch help requests');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching help requests:', error);
    throw error;
  }
};

// Approve help request
export const approveHelpRequest = async (requestId: number) => {
  try {
    const response = await apiClient.post(`/api/v1/help-requests/${requestId}/approve`);
    
    if (!response.ok) {
      throw new Error('Failed to approve help request');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error approving help request:', error);
    throw error;
  }
};

// Reject help request
export const rejectHelpRequest = async (requestId: number, data: { reason: string }) => {
  try {
    const response = await apiClient.post(`/api/v1/help-requests/${requestId}/reject`, data);
    
    if (!response.ok) {
      throw new Error('Failed to reject help request');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error rejecting help request:', error);
    throw error;
  }
};

// Issue ticket for help request
export const issueTicket = async (requestId: number, data: { attendees: number }) => {
  try {
    const response = await apiClient.post(`/api/v1/help-requests/${requestId}/issue-ticket`, data);
    
    if (!response.ok) {
      throw new Error('Failed to issue ticket');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error issuing ticket:', error);
    throw error;
  }
};

// Fetch admin metrics
export const fetchAdminMetrics = async (timeRange: string = 'month') => {
  try {
    const response = await apiClient.get(`/api/v1/admin/analytics?timeRange=${timeRange}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch admin metrics');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    throw new Error('Failed to fetch admin metrics');
  }
};

// Fetch system analytics
export const fetchSystemAnalytics = async (startDate?: string) => {
  try {
    const url = startDate 
      ? `/api/v1/admin/analytics?start_date=${startDate}`
      : '/api/v1/admin/analytics';
    
    const response = await apiClient.get(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch system analytics');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching system analytics:', error);
    throw new Error('Failed to fetch system analytics');
  }
};

// Fetch visitor metrics for admin
export const fetchVisitorMetrics = async () => {
  try {
    const response = await apiClient.get('/api/v1/admin/visitors/stats');
    
    if (!response.ok) {
      throw new Error('Failed to fetch visitor metrics');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching visitor metrics:', error);
    throw error;
  }
};

// Fetch volunteer metrics for admin
export const fetchVolunteerMetrics = async () => {
  try {
    const response = await apiClient.get('/api/v1/admin/volunteers/stats');
    
    if (!response.ok) {
      throw new Error('Failed to fetch volunteer metrics');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching volunteer metrics:', error);
    throw error;
  }
};

// Fetch donation metrics
export const fetchDonationMetrics = async () => {
  try {
    const response = await apiClient.get('/api/v1/admin/donations/stats');
    
    if (!response.ok) {
      throw new Error('Failed to fetch donation metrics');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching donation metrics:', error);
    throw error;
  }
};

// Fetch system alerts
export const fetchSystemAlerts = async () => {
  try {
    const response = await apiClient.get('/api/v1/admin/alerts');
    
    if (!response.ok) {
      throw new Error('Failed to fetch system alerts');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching system alerts:', error);
    throw error;
  }
};

// Legacy support - remove after migration
export const fetchDashboardStats = fetchAdminMetrics;

// Fetch system health metrics
export const fetchSystemHealth = async () => {
  try {
    const response = await apiClient.get('/api/v1/admin/metrics/system-health');
    
    if (!response.ok) {
      throw new Error('Failed to fetch system health data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching system health:', error);
    throw error;
  }
};

// Emergency procedures API functions
export const fetchEmergencyDashboard = async () => {
  try {
    const response = await apiClient.get('/api/v1/admin/emergency/dashboard');
    
    if (!response.ok) {
      throw new Error('Failed to fetch emergency dashboard data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching emergency dashboard:', error);
    throw error;
  }
};

export const fetchEmergencyWorkflows = async () => {
  try {
    const response = await apiClient.get('/api/v1/admin/emergency/workflows');
    
    if (!response.ok) {
      throw new Error('Failed to fetch emergency workflows');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching emergency workflows:', error);
    throw error;
  }
};

export const createEmergencyWorkflow = async (workflowData: any) => {
  try {
    const response = await apiClient.post('/api/v1/admin/emergency/workflows', workflowData);
    
    if (!response.ok) {
      throw new Error('Failed to create emergency workflow');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating emergency workflow:', error);
    throw error;
  }
};

export const updateEmergencyWorkflow = async (workflowId: string, workflowData: any) => {
  try {
    const response = await apiClient.put(`/api/v1/admin/emergency/workflows/${workflowId}`, workflowData);
    
    if (!response.ok) {
      throw new Error('Failed to update emergency workflow');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating emergency workflow:', error);
    throw error;
  }
};

export const deleteEmergencyWorkflow = async (workflowId: string) => {
  try {
    const response = await apiClient.delete(`/api/v1/admin/emergency/workflows/${workflowId}`);
    
    if (!response.ok) {
      throw new Error('Failed to delete emergency workflow');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting emergency workflow:', error);
    throw error;
  }
};

export const startEmergencyWorkflow = async (workflowId: string, incidentData: any) => {
  try {
    const response = await apiClient.post(`/api/v1/admin/emergency/workflows/${workflowId}/start`, incidentData);
    
    if (!response.ok) {
      throw new Error('Failed to start emergency workflow');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error starting emergency workflow:', error);
    throw error;
  }
};

export const fetchActiveIncidents = async () => {
  try {
    const response = await apiClient.get('/api/v1/admin/emergency/incidents');
    
    if (!response.ok) {
      throw new Error('Failed to fetch active incidents');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching active incidents:', error);
    throw error;
  }
};

export const createIncident = async (incidentData: any) => {
  try {
    const response = await apiClient.post('/api/v1/admin/emergency/incidents', incidentData);
    
    if (!response.ok) {
      throw new Error('Failed to create incident');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating incident:', error);
    throw error;
  }
};

export const updateIncident = async (incidentId: string, updateData: any) => {
  try {
    const response = await apiClient.put(`/api/v1/admin/emergency/incidents/${incidentId}`, updateData);
    
    if (!response.ok) {
      throw new Error('Failed to update incident');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating incident:', error);
    throw error;
  }
};

export const resolveIncident = async (incidentId: string, resolutionData: any) => {
  try {
    const response = await apiClient.post(`/api/v1/admin/emergency/incidents/${incidentId}/resolve`, resolutionData);
    
    if (!response.ok) {
      throw new Error('Failed to resolve incident');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error resolving incident:', error);
    throw error;
  }
};

export const sendEmergencyAlert = async (alertData: any) => {
  try {
    const response = await apiClient.post('/api/v1/admin/emergency/alerts', alertData);
    
    if (!response.ok) {
      throw new Error('Failed to send emergency alert');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending emergency alert:', error);
    throw error;
  }
};

export const fetchEmergencyAlerts = async () => {
  try {
    const response = await apiClient.get('/api/v1/admin/emergency/alerts');
    
    if (!response.ok) {
      throw new Error('Failed to fetch emergency alerts');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching emergency alerts:', error);
    throw error;
  }
};

export const stopEmergencyAlert = async (alertId: string) => {
  try {
    const response = await apiClient.post(`/api/v1/admin/emergency/alerts/${alertId}/stop`);
    
    if (!response.ok) {
      throw new Error('Failed to stop emergency alert');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error stopping emergency alert:', error);
    throw error;
  }
};

export const fetchEmergencyMessageTemplates = async () => {
  try {
    const response = await apiClient.get('/api/v1/admin/emergency/templates');
    
    if (!response.ok) {
      throw new Error('Failed to fetch emergency message templates');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching emergency message templates:', error);
    throw error;
  }
};

export const createEmergencyMessageTemplate = async (templateData: any) => {
  try {
    const response = await apiClient.post('/api/v1/admin/emergency/templates', templateData);
    
    if (!response.ok) {
      throw new Error('Failed to create emergency message template');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating emergency message template:', error);
    throw error;
  }
};
