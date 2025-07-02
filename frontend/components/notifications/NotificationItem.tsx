'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ExternalLink, 
  Eye, 
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle
} from 'lucide-react';
import { 
  type Notification,
  formatNotificationTime,
  getNotificationIcon,
  getNotificationColor
} from '@/lib/api/notifications';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  showActions?: boolean;
  compact?: boolean;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  showActions = true,
  compact = false
}) => {
  const getTypeIcon = () => {
    switch (notification.type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityBadge = () => {
    if (notification.priority === 'urgent') {
      return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
    }
    if (notification.priority === 'high') {
      return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">High</Badge>;
    }
    return null;
  };

  const handleAction = () => {
    if (notification.action_url) {
      window.open(notification.action_url, '_blank');
    }
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(notification.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  if (compact) {
    return (
      <div 
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50',
          !notification.read && 'bg-blue-50/50 border-blue-200',
          notification.priority === 'urgent' && 'border-red-200 bg-red-50/50'
        )}
        onClick={handleAction}
      >
        <div className="flex-shrink-0 mt-0.5">
          {getTypeIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-medium truncate',
                !notification.read && 'font-semibold'
              )}>
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {notification.message}
              </p>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {getPriorityBadge()}
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {formatNotificationTime(notification.created_at)}
            </p>
            
            {showActions && (
              <div className="flex items-center gap-1">
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAsRead}
                    className="h-6 w-6 p-0"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      'cursor-pointer transition-all hover:shadow-md',
      !notification.read && 'ring-2 ring-blue-200 bg-blue-50/50',
      notification.priority === 'urgent' && 'ring-2 ring-red-200 bg-red-50/50'
    )}>
      <CardContent className="p-4" onClick={handleAction}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getTypeIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className={cn(
                'text-sm font-medium',
                !notification.read && 'font-semibold'
              )}>
                {notification.title}
              </h4>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {getPriorityBadge()}
                {!notification.read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
              {notification.message}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{formatNotificationTime(notification.created_at)}</span>
                {notification.category && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{notification.category}</span>
                  </>
                )}
              </div>
              
              {showActions && (
                <div className="flex items-center gap-1">
                  {notification.action_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction();
                      }}
                      className="h-8 px-2 text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {notification.action_text || 'View'}
                    </Button>
                  )}
                  
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAsRead}
                      className="h-8 px-2"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="h-8 px-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationItem;
