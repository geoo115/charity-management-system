'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/use-toast';

// VAPID public key - in production, this should come from environment variables
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HuWd94AzZJHkxaXvM4QFXjmQKMYk8bQ9Q1dXHzudilVxPwtq6cKYPOb8Xg';

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

export interface DonorNotificationTypes {
  DONATION_CONFIRMED: 'donation_confirmed';
  IMPACT_UPDATE: 'impact_update';
  URGENT_NEED: 'urgent_need';
  MILESTONE_ACHIEVED: 'milestone_achieved';
  TAX_RECEIPT_READY: 'tax_receipt_ready';
  MONTHLY_SUMMARY: 'monthly_summary';
  RECOGNITION_EARNED: 'recognition_earned';
}

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  requestPermission: () => Promise<NotificationPermission>;
  subscribe: () => Promise<PushSubscription | null>;
  unsubscribe: () => Promise<void>;
  sendTestNotification: () => Promise<void>;
  updateSubscriptionPreferences: (preferences: NotificationPreferences) => Promise<void>;
}

export interface NotificationPreferences {
  donationConfirmations: boolean;
  impactUpdates: boolean;
  urgentNeeds: boolean;
  milestoneAchievements: boolean;
  taxReceipts: boolean;
  monthlySummaries: boolean;
  recognitionEarned: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

const defaultPreferences: NotificationPreferences = {
  donationConfirmations: true,
  impactUpdates: true,
  urgentNeeds: true,
  milestoneAchievements: true,
  taxReceipts: true,
  monthlySummaries: false,
  recognitionEarned: true,
  frequency: 'immediate',
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Check existing subscription on mount
  useEffect(() => {
    const checkExistingSubscription = async () => {
      if (!isSupported) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        
        if (existingSubscription) {
          setSubscription(existingSubscription);
          setIsSubscribed(true);
        }
      } catch (error) {
        console.error('Error checking existing subscription:', error);
      }
    };

    checkExistingSubscription();
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported');
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported');
    }

    if (permission !== 'granted') {
      const newPermission = await requestPermission();
      if (newPermission !== 'granted') {
        throw new Error('Permission not granted');
      }
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
        return existingSubscription;
      }

      // Create new subscription
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
        'BEl62iUYgUivxIkv69yViEuiBIa40HI6YrrfQAsxiJBt2-oVCNzEkuCBTHrBjEi0EFUa8X3vxs9YuY8f1bx3nKM'; // Demo key

      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to server
      await sendSubscriptionToServer(newSubscription);

      setSubscription(newSubscription);
      setIsSubscribed(true);
      
      return newSubscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }, [isSupported, permission, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!subscription) return;

    try {
      // Unsubscribe from push manager
      await subscription.unsubscribe();
      
      // Remove subscription from server
      await removeSubscriptionFromServer(subscription);
      
      setSubscription(null);
      setIsSubscribed(false);
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }, [subscription]);

  const sendTestNotification = useCallback(async (): Promise<void> => {
    if (!isSubscribed || !subscription) {
      throw new Error('Not subscribed to push notifications');
    }

    try {
      const response = await fetch('/api/v1/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          subscription,
          notification: {
            title: 'Test Notification',
            body: 'This is a test notification from LDH Donor Portal',
            icon: '/logo.svg',
            badge: '/logo.svg',
            tag: 'test-notification',
            data: {
              url: '/dashboard/donor',
              type: 'test',
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }, [isSubscribed, subscription]);

  const updateSubscriptionPreferences = useCallback(async (preferences: NotificationPreferences): Promise<void> => {
    if (!isSubscribed || !subscription) {
      throw new Error('Not subscribed to push notifications');
    }

    try {
      const response = await fetch('/api/v1/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          subscription: subscription.endpoint,
          preferences,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification preferences');
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }, [isSubscribed, subscription]);

  return {
    isSupported,
    permission,
    isSubscribed,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    updateSubscriptionPreferences,
  };
};

// Helper functions
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const sendSubscriptionToServer = async (subscription: PushSubscription): Promise<void> => {
  try {
    const response = await fetch('/api/v1/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        subscription,
        preferences: defaultPreferences,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to server');
    }
  } catch (error) {
    console.error('Error sending subscription to server:', error);
    throw error;
  }
};

const removeSubscriptionFromServer = async (subscription: PushSubscription): Promise<void> => {
  try {
    const response = await fetch('/api/v1/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscription from server');
    }
  } catch (error) {
    console.error('Error removing subscription from server:', error);
    throw error;
  }
};

// Specialized notification functions for donors
export const createDonationNotification = (amount: number, type: string): PushNotificationOptions => ({
  title: 'Donation Confirmed! 🎉',
  body: `Your ${type} donation of £${amount.toFixed(2)} has been confirmed. Thank you for supporting our community!`,
  icon: '/logo.svg',
  badge: '/logo.svg',
  tag: 'donation-confirmed',
  data: {
    url: '/dashboard/donor/history',
    type: 'donation_confirmed',
    amount,
  },
  actions: [
    {
      action: 'view_impact',
      title: 'View Impact',
      icon: '/icons/impact.png',
    },
    {
      action: 'share',
      title: 'Share',
      icon: '/icons/share.png',
    },
  ],
  requireInteraction: true,
  vibrate: [200, 100, 200],
});

export const createImpactUpdateNotification = (peopleHelped: number): PushNotificationOptions => ({
  title: 'Impact Update 📊',
  body: `Your donations have now helped ${peopleHelped} people in our community!`,
  icon: '/logo.svg',
  badge: '/logo.svg',
  tag: 'impact-update',
  data: {
    url: '/dashboard/donor/impact',
    type: 'impact_update',
    peopleHelped,
  },
  actions: [
    {
      action: 'view_details',
      title: 'View Details',
    },
  ],
});

export const createMilestoneNotification = (milestone: string): PushNotificationOptions => ({
  title: 'Milestone Achieved! 🏆',
  body: `Congratulations! You've reached: ${milestone}`,
  icon: '/logo.svg',
  badge: '/logo.svg',
  tag: 'milestone-achieved',
  data: {
    url: '/dashboard/donor/recognition',
    type: 'milestone_achieved',
    milestone,
  },
  actions: [
    {
      action: 'view_achievements',
      title: 'View Achievements',
    },
    {
      action: 'share_achievement',
      title: 'Share',
    },
  ],
  requireInteraction: true,
  vibrate: [300, 100, 300, 100, 300],
});

export default usePushNotifications;
