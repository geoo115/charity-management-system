'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useWebSocket, WebSocketMessage } from '@/hooks/useWebSocket';
import { 
  fetchNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  updateNotificationPreferences,
  type Notification as APINotification
} from '@/lib/api/notifications';

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface NotificationSettings {
  email_enabled: boolean;
  push_enabled: boolean;
  sound_enabled: boolean;
  desktop_enabled: boolean;
  categories: {
    help_requests: boolean;
    system_updates: boolean;
    appointment_reminders: boolean;
    general_announcements: boolean;
  };
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings;
  loading: boolean;
  error: string | null;
  wsConnected: boolean;
}

interface NotificationContextType extends NotificationState {
  // Notification actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  
  // Settings actions
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  
  // WebSocket actions
  sendNotification: (message: WebSocketMessage) => void;
  reconnectWebSocket: () => void;
}

const initialSettings: NotificationSettings = {
  email_enabled: true,
  push_enabled: true,
  sound_enabled: true,
  desktop_enabled: true,
  categories: {
    help_requests: true,
    system_updates: true,
    appointment_reminders: true,
    general_announcements: true,
  },
};

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  settings: initialSettings,
  loading: false,
  error: null,
  wsConnected: false,
};

type NotificationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'UPDATE_NOTIFICATION'; payload: { id: string; updates: Partial<Notification> } }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'SET_SETTINGS'; payload: NotificationSettings }
  | { type: 'SET_WS_CONNECTED'; payload: boolean };

function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter(n => !n.read).length,
        loading: false,
        error: null,
      };
    
    case 'ADD_NOTIFICATION':
      const newNotifications = [action.payload, ...state.notifications];
      return {
        ...state,
        notifications: newNotifications,
        unreadCount: newNotifications.filter(n => !n.read).length,
      };
    
    case 'UPDATE_NOTIFICATION':
      const updatedNotifications = state.notifications.map(n =>
        n.id === action.payload.id ? { ...n, ...action.payload.updates } : n
      );
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.read).length,
      };
    
    case 'REMOVE_NOTIFICATION':
      const filteredNotifications = state.notifications.filter(n => n.id !== action.payload);
      return {
        ...state,
        notifications: filteredNotifications,
        unreadCount: filteredNotifications.filter(n => !n.read).length,
      };
    
    case 'MARK_AS_READ':
      const markedNotifications = state.notifications.map(n =>
        n.id === action.payload ? { ...n, read: true } : n
      );
      return {
        ...state,
        notifications: markedNotifications,
        unreadCount: markedNotifications.filter(n => !n.read).length,
      };
    
    case 'MARK_ALL_AS_READ':
      const allReadNotifications = state.notifications.map(n => ({ ...n, read: true }));
      return {
        ...state,
        notifications: allReadNotifications,
        unreadCount: 0,
      };
    
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    
    case 'SET_WS_CONNECTED':
      return { ...state, wsConnected: action.payload };
    
    default:
      return state;
  }
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // WebSocket connection
  const { isConnected, sendMessage, reconnect } = useWebSocket({
    onMessage: (message: WebSocketMessage) => {
      switch (message.type) {
        case 'notification':
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              id: message.data.id || Date.now().toString(),
              title: message.data.title,
              content: message.data.content || message.data.message,
              type: message.data.type || 'info',
              priority: message.data.priority || 'medium',
              read: false,
              actionUrl: message.data.actionUrl,
              actionText: message.data.actionText,
              createdAt: message.timestamp,
              updatedAt: message.timestamp,
              userId: (message.userId || user?.id || '').toString(),
              metadata: message.data.metadata,
            },
          });
          break;
        
        case 'notification_update':
          dispatch({
            type: 'UPDATE_NOTIFICATION',
            payload: {
              id: message.data.id,
              updates: message.data.updates,
            },
          });
          break;
      }
    },
    onConnect: () => {
      dispatch({ type: 'SET_WS_CONNECTED', payload: true });
    },
    onDisconnect: () => {
      dispatch({ type: 'SET_WS_CONNECTED', payload: false });
    },
  });

  // Transform API notification to context notification
  const transformAPINotification = (apiNotification: APINotification): Notification => ({
    id: apiNotification.id.toString(),
    title: apiNotification.title,
    content: apiNotification.message,
    type: apiNotification.type,
    priority: apiNotification.priority,
    read: apiNotification.read,
    actionUrl: apiNotification.action_url,
    actionText: apiNotification.action_text,
    createdAt: apiNotification.created_at,
    updatedAt: apiNotification.created_at, // API doesn't have updated_at
    userId: user?.id?.toString() || '',
    metadata: apiNotification.metadata,
  });

  // Fetch notifications on mount and user change
  const fetchNotificationsData = async () => {
    if (!user?.id) return;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await fetchNotifications();
      
      // Ensure result exists and handle both null and array notifications
      console.log('Raw notification data received:', JSON.stringify(result, null, 2));
      if (result && typeof result === 'object') {
        // Handle both null notifications (empty state) and array notifications
        if (result.notifications === null || result.notifications === undefined) {
          console.log('No notifications available (null/undefined)');
          dispatch({ type: 'SET_NOTIFICATIONS', payload: [] });
        } else if (Array.isArray(result.notifications)) {
          const transformedNotifications = result.notifications.map(transformAPINotification);
          dispatch({ type: 'SET_NOTIFICATIONS', payload: transformedNotifications });
        } else {
          console.warn('Invalid notification data format received:', result);
          console.warn('Expected format: { notifications: [...] | null, pages: number, total: number, unread_count: number }');
          dispatch({ type: 'SET_NOTIFICATIONS', payload: [] });
        }
      } else {
        console.error('Invalid response format:', result);
        dispatch({ type: 'SET_NOTIFICATIONS', payload: [] });
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load notifications' });
      dispatch({ type: 'SET_NOTIFICATIONS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(parseInt(notificationId));
      dispatch({ type: 'MARK_AS_READ', payload: notificationId });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      dispatch({ type: 'MARK_ALL_AS_READ' });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const deleteNotificationAction = async (notificationId: string) => {
    try {
      await deleteNotification(parseInt(notificationId));
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = { ...state.settings, ...newSettings };
      await updateNotificationPreferences(updatedSettings);
      dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  };

  const reconnectWebSocket = () => {
    reconnect();
  };

  // Load notifications on user change
  useEffect(() => {
    if (user?.id) {
      fetchNotificationsData();
    }
  }, [user?.id]);

  // Request notification permission for desktop notifications
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const contextValue: NotificationContextType = {
    ...state,
    fetchNotifications: fetchNotificationsData,
    markAsRead,
    markAllAsRead,
    deleteNotification: deleteNotificationAction,
    updateSettings,
    sendNotification: sendMessage,
    reconnectWebSocket,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
