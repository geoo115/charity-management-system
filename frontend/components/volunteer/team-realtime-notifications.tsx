'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  BellOff, 
  MessageSquare, 
  Users, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';

interface TeamNotification {
  id: string;
  type: 'message' | 'task' | 'meeting' | 'announcement' | 'urgent';
  title: string;
  message: string;
  team_id: number;
  sender_id: number;
  sender_name: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  action_required?: boolean;
  action_url?: string;
}

interface TeamRealtimeNotificationsProps {
  teamId: number;
  onNotificationClick?: (notification: TeamNotification) => void;
  onMarkAsRead?: (notificationId: string) => void;
}

export default function TeamRealtimeNotifications({
  teamId,
  onNotificationClick,
  onMarkAsRead
}: TeamRealtimeNotificationsProps) {
  const [notifications, setNotifications] = useState<TeamNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [settings, setSettings] = useState({
    sound: true,
    desktop: true,
    message: true,
    task: true,
    meeting: true,
    announcement: true,
    urgent: true
  });
  const [showSettings, setShowSettings] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    initializeWebSocket();
    loadExistingNotifications();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [teamId]);

  useEffect(() => {
    // Create audio element for notification sounds
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  const initializeWebSocket = () => {
    const token = localStorage.getItem('token');
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
    
    wsRef.current = new WebSocket(`${wsUrl}/ws/volunteer/team/${teamId}?token=${token}`);

    wsRef.current.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected for team notifications');
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleIncomingNotification(data);
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          initializeWebSocket();
        }
      }, 5000);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  };

  const loadExistingNotifications = async () => {
    try {
      const response = await fetch(`/api/v1/volunteer/lead/teams/${teamId}/notifications`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        updateUnreadCount(data.notifications || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleIncomingNotification = (notification: TeamNotification) => {
    // Check if notification type is enabled in settings
    if (!settings[notification.type as keyof typeof settings]) {
      return;
    }

    setNotifications(prev => [notification, ...prev]);
    updateUnreadCount([notification, ...notifications]);

    // Play sound if enabled
    if (settings.sound && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }

    // Show desktop notification if enabled
    if (settings.desktop && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo.svg',
        tag: notification.id,
        requireInteraction: notification.action_required || false
      });
    }

    // Auto-hide notification after 5 seconds if not urgent
    if (notification.priority !== 'high' && !notification.action_required) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    }
  };

  const updateUnreadCount = (notifs: TeamNotification[]) => {
    const unread = notifs.filter(n => !n.read).length;
    setUnreadCount(unread);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/v1/volunteer/lead/teams/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        updateUnreadCount(notifications.map(n => n.id === notificationId ? { ...n, read: true } : n));
        
        if (onMarkAsRead) {
          onMarkAsRead(notificationId);
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`/api/v1/volunteer/lead/teams/${teamId}/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'task':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'meeting':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'announcement':
        return <Users className="h-4 w-4 text-orange-500" />;
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setSettings(prev => ({ ...prev, desktop: true }));
      }
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2"
        >
          {isConnected ? (
            <Bell className="h-5 w-5 text-blue-600" />
          ) : (
            <BellOff className="h-5 w-5 text-gray-400" />
          )}
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-red-500"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>

        {/* Settings Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="ml-2 p-2"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 top-12 w-80 bg-white border rounded-lg shadow-lg z-50 p-4"
          >
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Notification Settings</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {settings.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    <Label>Sound</Label>
                  </div>
                  <Switch
                    checked={settings.sound}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sound: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Desktop Notifications</Label>
                  <Switch
                    checked={settings.desktop}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        requestNotificationPermission();
                      } else {
                        setSettings(prev => ({ ...prev, desktop: false }));
                      }
                    }}
                  />
                </div>

                <div className="border-t pt-3">
                  <Label className="text-sm font-medium">Notification Types</Label>
                  <div className="space-y-2 mt-2">
                    {Object.entries(settings).filter(([key]) => key !== 'sound' && key !== 'desktop').map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="text-sm capitalize">{key}</Label>
                        <Switch
                          checked={value}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, [key]: checked }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 top-12 w-96 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden"
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Team Notifications</h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={markAllAsRead}
                    >
                      Mark all read
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNotifications(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-500">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id);
                        }
                        if (onNotificationClick) {
                          onNotificationClick(notification);
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <div className="flex items-center space-x-1">
                              <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                                {notification.priority}
                              </Badge>
                              {notification.action_required && (
                                <Badge variant="destructive" className="text-xs">
                                  Action Required
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {notification.sender_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications</p>
                  <p className="text-sm">You're all caught up!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 