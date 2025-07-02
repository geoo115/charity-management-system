'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Mail,
  MessageSquare,
  Smartphone,
  Trash2
} from 'lucide-react';
import LoadingSpinner from '@/components/common/loading-spinner';
import { formatDate } from '@/lib/utils/date-utils';
// Import API types
import { 
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  updateNotificationPreferences,
  fetchNotificationSettings,
  NotificationPreferences,
  Notification
} from '@/lib/api/notifications';

// Interfaces
interface VolunteerNotification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  created_at: string;
  action_url?: string;
  action_text?: string;
  // Legacy compatibility properties
  createdAt?: string;
  actionUrl?: string;
  actionText?: string;
}

interface NotificationSettings {
  emailNotifications: {
    shiftReminders: boolean;
    shiftChanges: boolean;
    newOpportunities: boolean;
    achievements: boolean;
    announcements: boolean;
  };
  smsNotifications: {
    shiftReminders: boolean;
    emergencyShifts: boolean;
  };
  pushNotifications: {
    enabled: boolean;
    shiftReminders: boolean;
    realTimeUpdates: boolean;
  };
}

export default function VolunteerNotificationSettingsPage() {
  const [notifications, setNotifications] = useState<VolunteerNotification[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const { toast } = useToast();

  useEffect(() => {
    const loadNotificationData = async () => {
      setLoading(true);
      try {
        const [notificationsResponse, settingsData] = await Promise.all([
          fetchNotifications({ category: 'volunteer' }),
          fetchNotificationSettings()
        ]);

        // Extract notifications from response
        const notificationsData = Array.isArray(notificationsResponse) 
          ? notificationsResponse 
          : notificationsResponse.notifications || [];

        setNotifications(notificationsData.map(n => ({
          ...n,
          createdAt: n.created_at,
          actionUrl: n.action_url,
          actionText: n.action_text
        })) as VolunteerNotification[]);
        
        // Convert API settings to local format
        if (settingsData?.preferences) {
          const preferences = settingsData.preferences;
          const localSettings: NotificationSettings = {
            emailNotifications: {
              shiftReminders: preferences.shift_reminders || false,
              shiftChanges: preferences.shift_updates || false,
              newOpportunities: preferences.volunteer_communications || false,
              achievements: preferences.system_updates || false,
              announcements: preferences.admin_announcements || false
            },
            smsNotifications: {
              shiftReminders: preferences.shift_reminders && preferences.sms_enabled || false,
              emergencyShifts: preferences.emergency_alerts || false
            },
            pushNotifications: {
              enabled: preferences.push_enabled || false,
              shiftReminders: preferences.shift_reminders && preferences.push_enabled || false,
              realTimeUpdates: preferences.system_updates && preferences.push_enabled || false
            }
          };
          setSettings(localSettings);
        }
        
        // Set empty states instead of mock data
        setNotifications([]);
        setAnnouncements([]);
        if (!settings) {
          setSettings({
            emailNotifications: {
              shiftReminders: true,
              shiftChanges: true,
              newOpportunities: false,
              achievements: true,
              announcements: false
            },
            smsNotifications: {
              shiftReminders: true,
              emergencyShifts: false
            },
            pushNotifications: {
              enabled: true,
              shiftReminders: true,
              realTimeUpdates: false
            }
          });
        }
      } catch (err: any) {
        console.error('Error loading notifications:', err);
        setError(err.message || 'Failed to load notifications');
        
        // Set empty states instead of mock data
        setNotifications([]);
        setAnnouncements([]);
        if (!settings) {
          setSettings({
            emailNotifications: {
              shiftReminders: true,
              shiftChanges: true,
              newOpportunities: false,
              achievements: true,
              announcements: false
            },
            smsNotifications: {
              shiftReminders: true,
              emergencyShifts: false
            },
            pushNotifications: {
              enabled: true,
              shiftReminders: true,
              realTimeUpdates: false
            }
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadNotificationData();
  }, []);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      toast({
        title: "Marked as read",
        description: "Notification has been marked as read.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to mark notification as read",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
      toast({
        title: "All notifications marked as read",
        description: "All your notifications have been marked as read.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to mark all notifications as read",
      });
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);
      setNotifications(prev =>
        prev.filter(notification => notification.id !== notificationId)
      );
      toast({
        title: "Notification deleted",
        description: "The notification has been deleted.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to delete notification",
      });
    }
  };

  const handleUpdateSettings = async (newSettings: NotificationSettings) => {
    setSaving(true);
    try {
      // Convert local settings to API format
      const apiPreferences: Partial<NotificationPreferences> = {
        email_enabled: Object.values(newSettings.emailNotifications).some(Boolean),
        sms_enabled: Object.values(newSettings.smsNotifications).some(Boolean),
        push_enabled: newSettings.pushNotifications.enabled,
        shift_reminders: newSettings.emailNotifications.shiftReminders || newSettings.smsNotifications.shiftReminders || newSettings.pushNotifications.shiftReminders,
        shift_updates: newSettings.emailNotifications.shiftChanges,
        volunteer_communications: newSettings.emailNotifications.newOpportunities,
        system_updates: newSettings.emailNotifications.achievements || newSettings.pushNotifications.realTimeUpdates,
        admin_announcements: newSettings.emailNotifications.announcements,
        emergency_alerts: newSettings.smsNotifications.emergencyShifts
      };
      
      await updateNotificationPreferences(apiPreferences);
      setSettings(newSettings);
      toast({
        title: "Settings updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to update settings",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (category: string, setting: string, value: boolean) => {
    if (!settings) return;
    
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category as keyof NotificationSettings],
        [setting]: value
      }
    };
    handleUpdateSettings(newSettings);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'read':
        return notification.read;
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return <LoadingSpinner message="Loading notifications..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Manage your notifications and preferences</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All Read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notifications">
            Notifications {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({notifications.length})
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadCount})
              </Button>
              <Button
                variant={filter === 'read' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('read')}
              >
                Read ({notifications.length - unreadCount})
              </Button>
            </div>
          </div>

          {filteredNotifications.length > 0 ? (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`transition-all hover:shadow-md ${
                    !notification.read ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold">{notification.title}</h3>
                            {!notification.read && (
                              <Badge variant="destructive" className="text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {formatDate(notification.createdAt || notification.created_at)}
                            </p>
                            {(notification.actionUrl || notification.action_url) && (
                              <Button variant="outline" size="sm" asChild>
                                <Link href={notification.actionUrl || notification.action_url || '#'}>
                                  {notification.actionText || notification.action_text || 'View'}
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-4">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNotification(notification.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="text-center">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    {filter === 'unread' ? 'No Unread Notifications' : 
                     filter === 'read' ? 'No Read Notifications' : 'No Notifications'}
                  </h3>
                  <p className="text-muted-foreground">
                    {filter === 'unread' 
                      ? 'All caught up! No new notifications to review.'
                      : 'Your notifications will appear here when you receive them.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          {announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-3">
                      <MessageSquare className="h-5 w-5 text-primary mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{announcement.title}</h3>
                          {!announcement.read && (
                            <Badge variant="destructive" className="text-xs">New</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {announcement.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(announcement.created_at || announcement.createdAt)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Announcements</h3>
                  <p className="text-muted-foreground">
                    Organization announcements will appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {settings && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>Configure your email notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-shift-reminders">Shift Reminders</Label>
                      <p className="text-sm text-muted-foreground">Receive reminders about upcoming shifts</p>
                    </div>
                    <Switch
                      id="email-shift-reminders"
                      checked={settings.emailNotifications.shiftReminders}
                      onCheckedChange={(checked) => 
                        handleSettingChange('emailNotifications', 'shiftReminders', checked)
                      }
                      disabled={saving}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-shift-changes">Shift Changes</Label>
                      <p className="text-sm text-muted-foreground">Get notified when shifts are modified or cancelled</p>
                    </div>
                    <Switch
                      id="email-shift-changes"
                      checked={settings.emailNotifications.shiftChanges}
                      onCheckedChange={(checked) => 
                        handleSettingChange('emailNotifications', 'shiftChanges', checked)
                      }
                      disabled={saving}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-opportunities">New Opportunities</Label>
                      <p className="text-sm text-muted-foreground">Be informed about new volunteer opportunities</p>
                    </div>
                    <Switch
                      id="email-opportunities"
                      checked={settings.emailNotifications.newOpportunities}
                      onCheckedChange={(checked) => 
                        handleSettingChange('emailNotifications', 'newOpportunities', checked)
                      }
                      disabled={saving}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-achievements">Achievements</Label>
                      <p className="text-sm text-muted-foreground">Celebrate your volunteer milestones</p>
                    </div>
                    <Switch
                      id="email-achievements"
                      checked={settings.emailNotifications.achievements}
                      onCheckedChange={(checked) => 
                        handleSettingChange('emailNotifications', 'achievements', checked)
                      }
                      disabled={saving}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-announcements">Announcements</Label>
                      <p className="text-sm text-muted-foreground">Receive organization announcements</p>
                    </div>
                    <Switch
                      id="email-announcements"
                      checked={settings.emailNotifications.announcements}
                      onCheckedChange={(checked) => 
                        handleSettingChange('emailNotifications', 'announcements', checked)
                      }
                      disabled={saving}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    SMS Notifications
                  </CardTitle>
                  <CardDescription>Configure your SMS notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sms-shift-reminders">Shift Reminders</Label>
                      <p className="text-sm text-muted-foreground">Receive SMS reminders for upcoming shifts</p>
                    </div>
                    <Switch
                      id="sms-shift-reminders"
                      checked={settings.smsNotifications.shiftReminders}
                      onCheckedChange={(checked) => 
                        handleSettingChange('smsNotifications', 'shiftReminders', checked)
                      }
                      disabled={saving}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sms-emergency">Emergency Shifts</Label>
                      <p className="text-sm text-muted-foreground">Get SMS alerts for urgent volunteer needs</p>
                    </div>
                    <Switch
                      id="sms-emergency"
                      checked={settings.smsNotifications.emergencyShifts}
                      onCheckedChange={(checked) => 
                        handleSettingChange('smsNotifications', 'emergencyShifts', checked)
                      }
                      disabled={saving}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Smartphone className="h-5 w-5 mr-2" />
                    Push Notifications
                  </CardTitle>
                  <CardDescription>Configure your push notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="push-enabled">Enable Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Allow the app to send push notifications</p>
                    </div>
                    <Switch
                      id="push-enabled"
                      checked={settings.pushNotifications.enabled}
                      onCheckedChange={(checked) => 
                        handleSettingChange('pushNotifications', 'enabled', checked)
                      }
                      disabled={saving}
                    />
                  </div>
                  
                  {settings.pushNotifications.enabled && (
                    <>
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="push-shift-reminders">Shift Reminders</Label>
                          <p className="text-sm text-muted-foreground">Push notifications for upcoming shifts</p>
                        </div>
                        <Switch
                          id="push-shift-reminders"
                          checked={settings.pushNotifications.shiftReminders}
                          onCheckedChange={(checked) => 
                            handleSettingChange('pushNotifications', 'shiftReminders', checked)
                          }
                          disabled={saving}
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="push-realtime">Real-time Updates</Label>
                          <p className="text-sm text-muted-foreground">Live updates about shifts and activities</p>
                        </div>
                        <Switch
                          id="push-realtime"
                          checked={settings.pushNotifications.realTimeUpdates}
                          onCheckedChange={(checked) => 
                            handleSettingChange('pushNotifications', 'realTimeUpdates', checked)
                          }
                          disabled={saving}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
