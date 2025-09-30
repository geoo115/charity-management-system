'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMessagingWebSocket } from '@/hooks/useMessagingWebSocket';

interface UnreadCounts {
  [conversationId: number]: number;
}

interface MessagingContextType {
  totalUnreadCount: number;
  unreadCounts: UnreadCounts;
  isConnected: boolean;
  markConversationAsRead: (conversationId: number) => void;
  refreshUnreadCounts: () => void;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const useMessagingContext = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessagingContext must be used within a MessagingProvider');
  }
  return context;
};

// Safe version that returns undefined if context is not available
export const useSafeMessagingContext = () => {
  const context = useContext(MessagingContext);
  return context;
};

interface MessagingProviderProps {
  children: React.ReactNode;
}

export const MessagingProvider: React.FC<MessagingProviderProps> = ({ children }) => {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  // Initialize with mock data - replace with API call
  useEffect(() => {
    // Mock API call to get initial unread counts
    const mockUnreadCounts = {
      1: 2,  // Conversation 1 has 2 unread messages
      2: 1,  // Conversation 2 has 1 unread message
      3: 0   // Conversation 3 has no unread messages
    };
    
    setUnreadCounts(mockUnreadCounts);
    setTotalUnreadCount(Object.values(mockUnreadCounts).reduce((sum, count) => sum + count, 0));
  }, []);

  const messagingWebSocket = useMessagingWebSocket({
    onNewMessage: (data) => {
      // Increment unread count for the conversation
      setUnreadCounts(prev => {
        const newCounts = {
          ...prev,
          [data.conversation_id]: (prev[data.conversation_id] || 0) + 1
        };
        setTotalUnreadCount(Object.values(newCounts).reduce((sum, count) => sum + count, 0));
        return newCounts;
      });
    },
    onConversationUpdate: (data) => {
      // Update unread count for the conversation
      setUnreadCounts(prev => {
        const newCounts = {
          ...prev,
          [data.conversation_id]: data.unread_count
        };
        setTotalUnreadCount(Object.values(newCounts).reduce((sum, count) => sum + count, 0));
        return newCounts;
      });
    },
    onMessageRead: (data) => {
      // This could be used to decrement unread counts, but typically
      // the backend will send a conversation_update instead
    }
  });

  const markConversationAsRead = (conversationId: number) => {
    setUnreadCounts(prev => {
      const newCounts = {
        ...prev,
        [conversationId]: 0
      };
      setTotalUnreadCount(Object.values(newCounts).reduce((sum, count) => sum + count, 0));
      return newCounts;
    });

    // Also send read receipt to backend via WebSocket
    if (messagingWebSocket.isConnected) {
      messagingWebSocket.sendMessage('mark_conversation_read', {
        conversation_id: conversationId
      });
    }
  };

  const refreshUnreadCounts = async () => {
    try {
      // Mock API call - replace with actual API
      const response = await fetch('/api/v1/messages/unread-counts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCounts(data.unreadCounts || {});
        setTotalUnreadCount(data.totalUnreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to refresh unread counts:', error);
    }
  };

  const value: MessagingContextType = {
    totalUnreadCount,
    unreadCounts,
    isConnected: messagingWebSocket.isConnected,
    markConversationAsRead,
    refreshUnreadCounts
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
};