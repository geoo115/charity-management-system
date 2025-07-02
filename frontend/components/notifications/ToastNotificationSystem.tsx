'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Toast, ToastClose, ToastDescription, ToastTitle } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action_url?: string;
  action_text?: string;
  duration?: number;
  persistent?: boolean;
  created_at: string;
}

interface ToastNotificationSystemProps {
  maxToasts?: number;
  defaultDuration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const ToastNotificationSystem: React.FC<ToastNotificationSystemProps> = ({
  maxToasts = 5,
  defaultDuration = 5000,
  position = 'top-right'
}) => {
  const { user } = useAuth();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [mounted, setMounted] = useState(false);

  // Add a new toast notification
  const addToast = (notification: ToastNotification) => {
    const toast: ToastNotification = {
      ...notification,
      id: `toast-${Date.now()}-${Math.random()}`,
      duration: notification.priority === 'urgent' ? 0 : defaultDuration, // Urgent notifications persist
      persistent: notification.priority === 'urgent'
    };

    setToasts(prev => {
      const newToasts = [toast, ...prev];
      return newToasts.slice(0, maxToasts); // Limit number of toasts
    });

    // Auto-remove toast after duration (unless persistent)
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration);
    }

    // Play notification sound for urgent notifications
    if (notification.priority === 'urgent') {
      playNotificationSound();
    }
  };

  // Remove a toast
  const removeToast = (toastId: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  };

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore errors (user may not have interacted with page yet)
      });
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  // Get icon for notification type
  const getIcon = (type: string, priority: string) => {
    if (priority === 'urgent') {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  // Get toast variant
  const getVariant = (type: string, priority: string) => {
    if (priority === 'urgent' || type === 'error') {
      return 'destructive';
    }
    return 'default';
  };

  // Handle action click
  const handleAction = (toast: ToastNotification) => {
    if (toast.action_url) {
      window.open(toast.action_url, '_blank');
    }
    removeToast(toast.id);
  };

  // Get container position styles
  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-right':
      default:
        return 'top-4 right-4';
    }
  };

  // Real-time notifications are handled by NotificationContext
  // No need for individual WebSocket connections here
  useEffect(() => {
    if (!user) return;
    // Toast notifications will be triggered via the central notification system
  }, [user]);

  // Handle mounting for SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const toastContainer = (
    <div 
      className={cn(
        'fixed z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none',
        getPositionStyles()
      )}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={getVariant(toast.type, toast.priority)}
          className="pointer-events-auto animate-in slide-in-from-top-full duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(toast.type, toast.priority)}
            </div>
            
            <div className="flex-1 min-w-0">
              <ToastTitle className="text-sm font-semibold">
                {toast.title}
              </ToastTitle>
              <ToastDescription className="text-sm mt-1">
                {toast.message}
              </ToastDescription>
              
              {toast.action_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction(toast)}
                  className="mt-2 h-8 px-2 text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {toast.action_text || 'View'}
                </Button>
              )}
            </div>
            
            <ToastClose 
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0"
            />
          </div>
        </Toast>
      ))}
    </div>
  );

  return createPortal(toastContainer, document.body);
};

export default ToastNotificationSystem;
