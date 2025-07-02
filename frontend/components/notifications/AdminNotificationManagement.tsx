'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Bell,
  Send,
  Calendar as CalendarIcon,
  Users,
  MessageSquare,
  Mail,
  Smartphone,
  Clock,
  Check,
  X,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  Search,
  Download,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/use-toast';
import {
  fetchNotificationTemplates,
  scheduleNotification,
  fetchScheduledNotifications,
  cancelScheduledNotification,
  sendTestNotification,
  type NotificationTemplate,
  type ScheduledNotification
} from '@/lib/api/notifications';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/common/loading-spinner';

interface AdminNotificationManagementProps {
  className?: string;
}

export const AdminNotificationManagement: React.FC<AdminNotificationManagementProps> = ({ 
  className 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for templates
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  
  // State for scheduled notifications
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  
  // State for new notification
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info',
    recipients: 'all',
    customRecipients: '',
    channels: ['email'],
    scheduled: false,
    scheduledDate: undefined as Date | undefined,
    scheduledTime: '09:00'
  });
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('compose');

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesData, scheduledData] = await Promise.all([
        fetchNotificationTemplates(),
        fetchScheduledNotifications()
      ]);
      
      setTemplates(templatesData);
      setScheduledNotifications(scheduledData);
    } catch (error) {
      console.error('Failed to load notification data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Send notification
  const handleSendNotification = async () => {
    if (!newNotification.title || !newNotification.message) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    try {
      if (newNotification.scheduled && newNotification.scheduledDate) {
        // Schedule notification
        const scheduledFor = new Date(newNotification.scheduledDate);
        const [hours, minutes] = newNotification.scheduledTime.split(':');
        scheduledFor.setHours(parseInt(hours), parseInt(minutes));

        const scheduledId = await scheduleNotification({
          title: newNotification.title,
          message: newNotification.message,
          scheduled_for: scheduledFor.toISOString(),
          recipients: newNotification.recipients === 'all' ? [] : 
            newNotification.customRecipients.split(',').map(id => parseInt(id.trim())),
          channels: newNotification.channels,
          type: newNotification.type
        });

        if (scheduledId) {
          toast({
            title: 'Success',
            description: 'Notification scheduled successfully'
          });
          await loadData(); // Refresh scheduled notifications
        }
      } else {
        // Send immediately
        const success = await sendTestNotification({
          type: newNotification.type,
          title: newNotification.title,
          message: newNotification.message,
          channels: newNotification.channels
        });

        if (success) {
          toast({
            title: 'Success',
            description: 'Notification sent successfully'
          });
        }
      }

      // Reset form
      setNewNotification({
        title: '',
        message: '',
        type: 'info',
        recipients: 'all',
        customRecipients: '',
        channels: ['email'],
        scheduled: false,
        scheduledDate: undefined,
        scheduledTime: '09:00'
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to send notification',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  // Cancel scheduled notification
  const handleCancelScheduled = async (id: number) => {
    const success = await cancelScheduledNotification(id);
    if (success) {
      toast({
        title: 'Success',
        description: 'Scheduled notification cancelled'
      });
      await loadData();
    }
  };

  // Use template
  const useTemplate = (template: NotificationTemplate) => {
    setNewNotification(prev => ({
      ...prev,
      title: template.subject,
      message: template.content,
      type: template.type
    }));
    setActiveTab('compose');
  };

  useEffect(() => {
    if (user?.role === 'Admin') {
      loadData();
    }
  }, [user]);

  if (user?.role !== 'Admin') {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading notification management..." />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification Management</h1>
          <p className="text-muted-foreground">
            Send and manage notifications across the platform
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compose Notification</CardTitle>
              <CardDescription>
                Create and send notifications to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newNotification.title}
                    onChange={(e) => setNewNotification(prev => ({ 
                      ...prev, 
                      title: e.target.value 
                    }))}
                    placeholder="Notification title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select 
                    value={newNotification.type} 
                    onValueChange={(value) => setNewNotification(prev => ({ 
                      ...prev, 
                      type: value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={newNotification.message}
                  onChange={(e) => setNewNotification(prev => ({ 
                    ...prev, 
                    message: e.target.value 
                  }))}
                  placeholder="Notification message"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Channels</Label>
                <div className="flex gap-4">
                  {[
                    { id: 'email', label: 'Email', icon: Mail },
                    { id: 'sms', label: 'SMS', icon: MessageSquare },
                    { id: 'push', label: 'Push', icon: Smartphone }
                  ].map(({ id, label, icon: Icon }) => (
                    <div key={id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={id}
                        checked={newNotification.channels.includes(id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewNotification(prev => ({
                              ...prev,
                              channels: [...prev.channels, id]
                            }));
                          } else {
                            setNewNotification(prev => ({
                              ...prev,
                              channels: prev.channels.filter(c => c !== id)
                            }));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={id} className="flex items-center gap-1">
                        <Icon className="h-4 w-4" />
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Recipients</Label>
                <Select 
                  value={newNotification.recipients} 
                  onValueChange={(value) => setNewNotification(prev => ({ 
                    ...prev, 
                    recipients: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="visitors">Visitors Only</SelectItem>
                    <SelectItem value="volunteers">Volunteers Only</SelectItem>
                    <SelectItem value="donors">Donors Only</SelectItem>
                    <SelectItem value="admins">Admins Only</SelectItem>
                    <SelectItem value="custom">Custom Recipients</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newNotification.recipients === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="customRecipients">Custom Recipients (User IDs)</Label>
                  <Input
                    id="customRecipients"
                    value={newNotification.customRecipients}
                    onChange={(e) => setNewNotification(prev => ({ 
                      ...prev, 
                      customRecipients: e.target.value 
                    }))}
                    placeholder="1, 2, 3, ..."
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="scheduled"
                  checked={newNotification.scheduled}
                  onChange={(e) => setNewNotification(prev => ({ 
                    ...prev, 
                    scheduled: e.target.checked 
                  }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="scheduled">Schedule for later</Label>
              </div>

              {newNotification.scheduled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newNotification.scheduledDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newNotification.scheduledDate ? (
                            format(newNotification.scheduledDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newNotification.scheduledDate}
                          onSelect={(date) => setNewNotification(prev => ({ 
                            ...prev, 
                            scheduledDate: date 
                          }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduledTime">Time</Label>
                    <Input
                      id="scheduledTime"
                      type="time"
                      value={newNotification.scheduledTime}
                      onChange={(e) => setNewNotification(prev => ({ 
                        ...prev, 
                        scheduledTime: e.target.value 
                      }))}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setNewNotification({
                  title: '',
                  message: '',
                  type: 'info',
                  recipients: 'all',
                  customRecipients: '',
                  channels: ['email'],
                  scheduled: false,
                  scheduledDate: undefined,
                  scheduledTime: '09:00'
                })}>
                  Clear
                </Button>
                <Button onClick={handleSendNotification} disabled={sending}>
                  {sending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                  {newNotification.scheduled ? 'Schedule' : 'Send Now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Tab */}
        <TabsContent value="scheduled" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Notifications</CardTitle>
              <CardDescription>
                Manage notifications scheduled for future delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scheduledNotifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No scheduled notifications
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Scheduled For</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledNotifications.map((notification) => (
                      <TableRow key={notification.id}>
                        <TableCell className="font-medium">
                          {notification.title}
                        </TableCell>
                        <TableCell>
                          {format(new Date(notification.scheduled_for), 'PPp')}
                        </TableCell>
                        <TableCell>{notification.recipients} users</TableCell>
                        <TableCell>
                          <Badge variant={
                            notification.status === 'pending' ? 'default' :
                            notification.status === 'sent' ? 'secondary' :
                            notification.status === 'failed' ? 'destructive' :
                            'outline'
                          }>
                            {notification.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {notification.status === 'pending' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Scheduled Notification</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to cancel this scheduled notification?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleCancelScheduled(notification.id)}
                                    >
                                      Confirm
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Templates</CardTitle>
              <CardDescription>
                Pre-built templates for common notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No templates available
                </div>
              ) : (
                <div className="grid gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.subject}
                          </p>
                          <Badge variant="outline" className="mt-2">
                            {template.type}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => useTemplate(template)}
                        >
                          Use Template
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminNotificationManagement;
