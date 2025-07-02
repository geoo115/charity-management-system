'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  Calendar, 
  FileText, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { formatNotificationTime } from '@/lib/api/notifications';

interface NotificationPreviewProps {
  notifications?: Array<{
    id: number;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    category: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    created_at: string;
    read: boolean;
    action_url?: string;
  }>;
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  className?: string;
}

export const NotificationPreview: React.FC<NotificationPreviewProps> = ({
  notifications = [],
  maxItems = 3,
  showViewAll = true,
  onViewAll,
  className
}) => {
  const getIcon = (category: string, type: string) => {
    switch (category) {
      case 'help_request':
        return <FileText className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'shift':
        return <Calendar className="h-4 w-4" />;
      case 'announcement':
        return <MessageSquare className="h-4 w-4" />;
      case 'system':
        return type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string, priority: string) => {
    if (priority === 'urgent') return 'text-red-600';
    
    switch (type) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'success':
        return 'text-green-600';
      case 'info':
      default:
        return 'text-blue-600';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
      case 'high':
        return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-xs">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs text-muted-foreground">Low</Badge>;
      default:
        return null;
    }
  };

  const displayedNotifications = notifications.slice(0, maxItems);
  const hasMore = notifications.length > maxItems;

  if (notifications.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="h-5 w-5 text-green-500" />
            All Caught Up
          </CardTitle>
          <CardDescription>No new notifications</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </div>
          {showViewAll && notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onViewAll}
              className="text-xs"
            >
              View All ({notifications.length})
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-80">
          <div className="space-y-3">
            {displayedNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50 cursor-pointer ${
                  !notification.read ? 'bg-blue-50/50 border-blue-200' : ''
                } ${
                  notification.priority === 'urgent' ? 'border-red-200 bg-red-50/50' : ''
                }`}
              >
                <div className={`flex-shrink-0 mt-0.5 ${getTypeColor(notification.type, notification.priority)}`}>
                  {getIcon(notification.category, notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`text-sm font-medium line-clamp-1 ${
                      !notification.read ? 'font-semibold' : ''
                    }`}>
                      {notification.title}
                    </h4>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {getPriorityBadge(notification.priority)}
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatNotificationTime(notification.created_at)}
                    </span>
                    
                    {notification.action_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(notification.action_url, '_blank');
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {hasMore && (
              <div className="text-center pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onViewAll}
                  className="text-xs text-muted-foreground"
                >
                  {notifications.length - maxItems} more notifications...
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default NotificationPreview;
