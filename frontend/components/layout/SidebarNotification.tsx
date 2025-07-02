import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { apiClient } from '@/lib/api/api-client';

interface NotificationCount {
  total: number;
  pending: number;
  urgent: number;
  type: 'info' | 'warning' | 'success' | 'error';
}

interface SidebarNotificationProps {
  className?: string;
}

// Real API call to fetch notifications
const fetchNotificationCount = async (role: string): Promise<NotificationCount> => {
  try {
    const response = await apiClient.get(`/api/v1/notifications/count`);
    
    if (response.ok) {
      const data = await response.json();
      return {
        total: data.total || 0,
        pending: data.pending || 0,
        urgent: data.urgent || 0,
        type: data.urgent > 0 ? 'error' : data.pending > 0 ? 'warning' : 'info'
      };
    }
  } catch (error) {
    console.error('Failed to fetch notification count:', error);
  }

  // Fallback to role-based mock data
  switch (role) {
    case 'Admin':
      return { total: 12, pending: 5, urgent: 2, type: 'warning' };
    case 'Volunteer':
      return { total: 3, pending: 1, urgent: 0, type: 'info' };
    case 'Visitor':
      return { total: 1, pending: 1, urgent: 0, type: 'success' };
    case 'Donor':
      return { total: 0, pending: 0, urgent: 0, type: 'info' };
    default:
      return { total: 0, pending: 0, urgent: 0, type: 'info' };
  }
};

export const SidebarNotification: React.FC<SidebarNotificationProps> = ({ className }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationCount>({
    total: 0,
    pending: 0,
    urgent: 0,
    type: 'info'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const notificationData = await fetchNotificationCount(user.role);
        setNotifications(notificationData);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        // Set fallback empty state
        setNotifications({
          total: 0,
          pending: 0,
          urgent: 0,
          type: 'info'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
    
    // Set up polling for real-time updates (every 30 seconds)
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Don't show loading state or empty notification badge
  if (isLoading || notifications.total === 0) return null;

  const getIconAndColor = () => {
    if (notifications.urgent > 0) {
      return {
        icon: AlertCircle,
        color: 'bg-red-500 text-white',
        pulse: true
      };
    }
    if (notifications.pending > 0) {
      return {
        icon: Clock,
        color: 'bg-yellow-500 text-white',
        pulse: false
      };
    }
    return {
      icon: CheckCircle,
      color: 'bg-green-500 text-white',
      pulse: false
    };
  };

  const { icon: Icon, color, pulse } = getIconAndColor();

  return (
    <div className={`relative ${className}`}>
      <Icon className={`h-4 w-4 ${pulse ? 'animate-pulse' : ''}`} />
      {notifications.total > 0 && (
        <Badge 
          className={`absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-semibold ${color}`}
        >
          {notifications.total > 99 ? '99+' : notifications.total}
        </Badge>
      )}
    </div>
  );
};

// Hook for getting notification counts
export const useNotificationCounts = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      try {
        // Mock data - replace with real API calls
        switch (user.role) {
          case 'Admin':
            setCounts({
              helpRequests: 8,
              documents: 3,
              volunteers: 2,
              feedback: 4
            });
            break;
          case 'Volunteer':
            setCounts({
              shifts: 1,
              training: 2,
              notifications: 1
            });
            break;
          case 'Visitor':
            setCounts({
              requests: 1,
              documents: 0,
              feedback: 0
            });
            break;
          default:
            setCounts({});
        }
      } catch (error) {
        console.error('Failed to fetch notification counts:', error);
      }
    };

    fetchCounts();
  }, [user]);

  return counts;
};
