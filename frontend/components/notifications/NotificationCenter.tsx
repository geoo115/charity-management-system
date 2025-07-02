'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Settings, 
  Filter,
  Search,
  AlertCircle,
  Clock,
  CheckCircle,
  Info,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { 
  fetchNotifications,
  fetchNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  formatNotificationTime,
  getNotificationIcon,
  getNotificationColor,
  type Notification,
  type NotificationCount
} from '@/lib/api/notifications';
import { NotificationItem } from './NotificationItem';

interface NotificationCenterProps {
  trigger?: React.ReactNode;
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  trigger, 
  className 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCount, setNotificationCount] = useState<NotificationCount>({
    total: 0,
    pending: 0,
    urgent: 0,
    unread: 0,
    type: 'info'
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Fetch notifications
  const loadNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const params = {
        limit: 50,
        ...(filterType !== 'all' && { type: filterType }),
        ...(filterCategory !== 'all' && { category: filterCategory }),
        ...(showUnreadOnly && { unread_only: true })
      };

      const [notificationsData, countData] = await Promise.all([
        fetchNotifications(params),
        fetchNotificationCount(user.role)
      ]);

      setNotifications(notificationsData.notifications || []);
      setNotificationCount(countData);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle mark as read
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setNotificationCount(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1)
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setNotificationCount(prev => ({ ...prev, unread: 0 }));
      
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    }
  };

  // Handle delete notification
  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setNotificationCount(prev => {
        const notification = notifications.find(n => n.id === notificationId);
        return {
          ...prev,
          total: Math.max(0, prev.total - 1),
          unread: notification && !notification.read ? Math.max(0, prev.unread - 1) : prev.unread
        };
      });
      
      toast({
        title: 'Success',
        description: 'Notification deleted',
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  // Filter notifications based on search and filters
  const filteredNotifications = (notifications || []).filter(notification => {
    const matchesSearch = !searchQuery || 
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || notification.type === filterType;
    const matchesCategory = filterCategory === 'all' || notification.category === filterCategory;
    const matchesReadStatus = !showUnreadOnly || !notification.read;
    
    return matchesSearch && matchesType && matchesCategory && matchesReadStatus;
  });

  // Load notifications when component mounts or filters change
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, filterType, filterCategory, showUnreadOnly, user]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;
    // Real-time notifications are now handled by the NotificationContext
    // No need for individual WebSocket connections here
  }, [user]);

  const getBellIcon = () => {
    if (notificationCount.urgent > 0) {
      return <AlertCircle className="h-5 w-5 text-red-500 animate-pulse" />;
    }
    if (notificationCount.pending > 0) {
      return <Bell className="h-5 w-5 text-yellow-500" />;
    }
    return <Bell className="h-5 w-5" />;
  };

  const triggerElement = trigger || (
    <Button variant="ghost" size="sm" className={`relative ${className}`}>
      {getBellIcon()}
      {notificationCount.unread > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {notificationCount.unread > 99 ? '99+' : notificationCount.unread}
        </Badge>
      )}
    </Button>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {triggerElement}
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Notifications</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadNotifications}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {notificationCount.unread > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark All Read
                </Button>
              )}
            </div>
          </SheetTitle>
          <SheetDescription>
            Stay updated with your latest notifications
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col space-y-4 mt-6">
          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="request">Request</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="unread-only"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="unread-only" className="text-sm font-medium">
                Show unread only
              </label>
            </div>
          </div>

          <Separator />

          {/* Notifications List */}
          <ScrollArea className="flex-1 max-h-[600px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery || filterType !== 'all' || filterCategory !== 'all' || showUnreadOnly
                    ? 'No notifications match your filters'
                    : 'No notifications yet'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDeleteNotification}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
