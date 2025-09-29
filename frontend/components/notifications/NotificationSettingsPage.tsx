'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Mail, MessageSquare, Smartphone, Check, X, Settings, Shield, Clock, Volume2, Moon, Globe, Save, RefreshCw, Info, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/use-toast';
import {
  fetchNotificationSettings,
  updateNotificationPreferences,
  resetNotificationPreferences,
  sendTestNotification,
  type NotificationSettings,
  type NotificationPreferences
} from '@/lib/api/notifications';
import LoadingSpinner from '@/components/common/loading-spinner';

interface NotificationSettingsPageProps {
  className?: string;
}

export const NotificationSettingsPage: React.FC<NotificationSettingsPageProps> = ({ 
  className 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  // Load notification settings
  const loadSettings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await fetchNotificationSettings();
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Save preferences
  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const success = await updateNotificationPreferences(settings.preferences);
      if (success) {
        toast({
          title: 'Success',
          description: 'Notification preferences saved successfully'
        });
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    setSaving(true);
    try {
      const success = await resetNotificationPreferences();
      if (success) {
        await loadSettings(); // Reload settings
        toast({
          title: 'Success',
          description: 'Notification preferences reset to defaults'
        });
      } else {
        throw new Error('Failed to reset preferences');
      }
    } catch (error) {
      console.error('Failed to reset preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset notification preferences',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Send test notification
  const handleTestNotification = async (channel: string) => {
    setTestingChannel(channel);
    try {
      const success = await sendTestNotification({
        type: 'info',
        title: 'Test Notification',
        message: `This is a test ${channel} notification to verify your settings are working correctly.`,
        channels: [channel]
      });
      
      if (success) {
        toast({
          title: 'Test Sent',
          description: `Test ${channel} notification sent successfully`
        });
      } else {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast({
        title: 'Error',
        description: `Failed to send test ${channel} notification`,
        variant: 'destructive'
      });
    } finally {
      setTestingChannel(null);
    }
  };

  // Update channel preference for notification type
  const updateTypeChannelPreference = (typeId: string, channel: string, enabled: boolean) => {
    if (!settings) return;
    
    setSettings(prev => ({
      ...prev!,
      types: prev!.types.map(type => 
        type.id === typeId
          ? {
              ...type,
              channels: {
                ...type.channels,
                [channel]: enabled
              }
            }
          : type
      )
    }));
  };

  // Update global channel preference
  const updateGlobalChannelPreference = (channel: string, enabled: boolean) => {
    if (!settings) return;
    
    setSettings(prev => ({
      ...prev!,
      channels: prev!.channels.map(ch => 
        ch.id === channel ? { ...ch, enabled } : ch
      ),
      preferences: {
        ...prev!.preferences,
        [`${channel}_enabled`]: enabled
      } as any
    }));
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  if (loading) {
    return <LoadingSpinner message="Loading notification settings..." />;
  }

  if (!settings) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Failed to load notification settings. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification Settings</h1>
          <p className="text-muted-foreground">
            Manage how and when you receive notifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={saving}
          >
            Reset to Defaults
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Communication Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Communication Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.channels.map((channel) => (
            <div key={channel.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {channel.id === 'email' && <Mail className="h-5 w-5" />}
                {channel.id === 'sms' && <MessageSquare className="h-5 w-5" />}
                {channel.id === 'push' && <Smartphone className="h-5 w-5" />}
                <div>
                  <Label className="text-base font-medium">{channel.name}</Label>
                  <p className="text-sm text-muted-foreground">
                    {channel.id === 'email' && 'Receive notifications via email'}
                    {channel.id === 'sms' && 'Receive notifications via SMS text messages'}
                    {channel.id === 'push' && 'Receive push notifications in your browser'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={channel.enabled}
                  onCheckedChange={(enabled) => 
                    updateGlobalChannelPreference(channel.id, enabled)
                  }
                />
                {channel.enabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestNotification(channel.id)}
                    disabled={testingChannel === channel.id}
                  >
                    {testingChannel === channel.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Types
          </CardTitle>
          <CardDescription>
            Customize which notifications you want to receive for each channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {settings.types.map((type, index) => (
              <div key={type.id}>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">{type.name}</h4>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    {settings.channels
                      .filter(channel => channel.enabled)
                      .map((channel) => (
                      <div key={channel.id} className="flex items-center space-x-2">
                        <Switch
                          id={`${type.id}-${channel.id}`}
                          checked={type.channels[channel.id] || false}
                          onCheckedChange={(enabled) => 
                            updateTypeChannelPreference(type.id, channel.id, enabled)
                          }
                        />
                        <Label 
                          htmlFor={`${type.id}-${channel.id}`}
                          className="text-sm flex items-center gap-1"
                        >
                          {channel.id === 'email' && <Mail className="h-3 w-3" />}
                          {channel.id === 'sms' && <MessageSquare className="h-3 w-3" />}
                          {channel.id === 'push' && <Smartphone className="h-3 w-3" />}
                          {channel.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {index < settings.types.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Additional Settings
          </CardTitle>
          <CardDescription>
            Advanced notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Emergency Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Always receive emergency and critical system alerts
              </p>
            </div>
            <Switch
              checked={settings.preferences.emergency_alerts}
              onCheckedChange={(enabled) => 
                setSettings(prev => ({
                  ...prev!,
                  preferences: { ...prev!.preferences, emergency_alerts: enabled }
                }))
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Quiet Hours</Label>
              <p className="text-sm text-muted-foreground">
                Suppress non-urgent notifications during quiet hours
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="22:00">
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                      {i.toString().padStart(2, '0')}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm">to</span>
              <Select defaultValue="08:00">
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                      {i.toString().padStart(2, '0')}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Changes */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={saving}
          size="lg"
        >
          {saving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
          Save All Changes
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
