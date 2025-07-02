'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  X,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Settings,
  Trash2,
  Mail,
  Eye,
  Filter,
  ChevronDown,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  timestamp: Date;
  read: boolean;
  persistent?: boolean;
  actionLabel?: string;
  actionHandler?: () => void;
  avatar?: string;
  category?: string;
  metadata?: Record<string, any>;
}

// Notification context
interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  unreadCount: number;
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
}

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  showPreviews: boolean;
  autoHide: boolean;
  hideDelay: number;
  categories: Record<string, boolean>;
  priorities: Record<NotificationPriority, boolean>;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  showPreviews: true,
  autoHide: true,
  hideDelay: 5000,
  categories: {},
  priorities: { low: true, medium: true, high: true, urgent: true }
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Toast notification component
interface ToastNotificationProps {
  notification: Notification;
  onRemove: (id: string) => void;
  settings: NotificationSettings;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ 
  notification, 
  onRemove, 
  settings 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    if (settings.autoHide && !notification.persistent) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onRemove(notification.id), 300);
      }, settings.hideDelay);
      
      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.persistent, settings.autoHide, settings.hideDelay, onRemove]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case 'success':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'info':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-300';
    }
  };

  const getPriorityIndicator = () => {
    switch (notification.priority) {
      case 'urgent':
        return <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />;
      case 'high':
        return <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full" />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.3 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'relative bg-white dark:bg-gray-800 shadow-lg rounded-lg border-l-4 p-4 max-w-sm',
            getBorderColor()
          )}
        >
          {getPriorityIndicator()}
          
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {notification.title}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(notification.id)}
                  className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                {notification.message}
              </p>
              
              {notification.actionLabel && notification.actionHandler && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={notification.actionHandler}
                  className="mt-2 h-7 text-xs"
                >
                  {notification.actionLabel}
                </Button>
              )}
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {notification.timestamp.toLocaleTimeString()}
                </span>
                {notification.category && (
                  <Badge variant="secondary" className="text-xs">
                    {notification.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Notification bell component
interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('NotificationBell must be used within NotificationProvider');

  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, settings } = context;
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    return true;
  }).slice(0, 10); // Show only last 10 notifications

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('relative', className)}>
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 p-0" align="end" sideOffset={5}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
                className="h-7 text-xs"
              >
                <Filter className="h-3 w-3 mr-1" />
                {filter === 'all' ? 'All' : 'Unread'}
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-7 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-96">
          {filteredNotifications.length > 0 ? (
            <div className="p-2">
              {filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'p-3 rounded-lg cursor-pointer transition-colors mb-2',
                    !notification.read 
                      ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {notification.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {notification.type === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                      {notification.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                      {notification.type === 'info' && <Info className="h-4 w-4 text-blue-500" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {formatTime(notification.timestamp)}
                        </span>
                        {notification.priority === 'urgent' && (
                          <Badge variant="destructive" className="text-xs">
                            Urgent
                          </Badge>
                        )}
                        {notification.priority === 'high' && (
                          <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                            High
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-500">No notifications</p>
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearAll();
                setIsOpen(false);
              }}
              className="w-full h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear all notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Notification settings component
const NotificationSettings: React.FC = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('NotificationSettings must be used within NotificationProvider');

  const { settings, updateSettings } = context;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Enable Notifications</h4>
            <p className="text-xs text-gray-500">Receive notifications in the app</p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(enabled) => updateSettings({ enabled })}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Sound Notifications</h4>
            <p className="text-xs text-gray-500">Play sound for new notifications</p>
          </div>
          <Switch
            checked={settings.soundEnabled}
            onCheckedChange={(soundEnabled) => updateSettings({ soundEnabled })}
            disabled={!settings.enabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Show Previews</h4>
            <p className="text-xs text-gray-500">Display notification content</p>
          </div>
          <Switch
            checked={settings.showPreviews}
            onCheckedChange={(showPreviews) => updateSettings({ showPreviews })}
            disabled={!settings.enabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Auto Hide</h4>
            <p className="text-xs text-gray-500">Automatically dismiss notifications</p>
          </div>
          <Switch
            checked={settings.autoHide}
            onCheckedChange={(autoHide) => updateSettings({ autoHide })}
            disabled={!settings.enabled}
          />
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-medium mb-3">Priority Levels</h4>
          <div className="space-y-2">
            {Object.entries(settings.priorities).map(([priority, enabled]) => (
              <div key={priority} className="flex items-center justify-between">
                <span className="text-sm capitalize">{priority}</span>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => 
                    updateSettings({
                      priorities: { ...settings.priorities, [priority]: checked }
                    })
                  }
                  disabled={!settings.enabled}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Toast container component
const ToastContainer: React.FC = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('ToastContainer must be used within NotificationProvider');

  const { notifications, removeNotification, settings } = context;

  const toastNotifications = notifications
    .filter(n => !n.read || n.persistent)
    .slice(-5); // Show max 5 toasts

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toastNotifications.map((notification) => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
            settings={settings}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Main notification provider
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('notification-settings');
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    }
    return defaultSettings;
  });

  // Save settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notification-settings', JSON.stringify(settings));
    }
  }, [settings]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    if (!settings.enabled) return;

    // Check if priority is enabled
    if (!settings.priorities[notification.priority]) return;

    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Play sound if enabled
    if (settings.soundEnabled) {
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.play().catch(() => {
          // Fallback to system beep or ignore
        });
      } catch (error) {
        // Ignore audio errors
      }
    }

    // Request permission for browser notifications if available
    if ('Notification' in window && Notification.permission === 'granted' && settings.showPreviews) {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo.svg',
        tag: newNotification.id,
      });
    }
  }, [settings]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    unreadCount,
    settings,
    updateSettings,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer />
    </NotificationContext.Provider>
  );
};

// Hook to use notifications
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

// Export components
export { NotificationBell, NotificationSettings, ToastContainer };
export default NotificationProvider; 