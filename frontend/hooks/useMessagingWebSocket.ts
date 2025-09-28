import { useEffect, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/components/ui/use-toast';

interface ExtendedWebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  userId?: string;
}

interface MessageWebSocketData {
  conversation_id: number;
  message: {
    id: number;
    conversation_id: number;
    sender_id: number;
    sender_name: string;
    recipient_id: number;
    content: string;
    message_type: string;
    attachment_url?: string;
    attachment_name?: string;
    is_read: boolean;
    read_at?: string;
    created_at: string;
    updated_at: string;
    is_system_msg?: boolean;
  };
}

interface ConversationUpdateData {
  conversation_id: number;
  unread_count: number;
  last_message: {
    id: number;
    content: string;
    sender_name: string;
    sender_id: number;
    created_at: string;
    is_read: boolean;
  };
  updated_at: string;
}

interface UseMessagingWebSocketOptions {
  onNewMessage?: (data: MessageWebSocketData) => void;
  onConversationUpdate?: (data: ConversationUpdateData) => void;
  onMessageRead?: (data: { conversation_id: number; message_id: number; read_at: string }) => void;
  onTypingIndicator?: (data: { conversation_id: number; user_id: number; user_name: string; is_typing: boolean }) => void;
}

export const useMessagingWebSocket = (options: UseMessagingWebSocketOptions = {}) => {
  const { toast } = useToast();

  const handleWebSocketMessage = useCallback((message: ExtendedWebSocketMessage) => {
    try {
      switch (message.type) {
        case 'new_message':
          if (options.onNewMessage) {
            options.onNewMessage(message.data as MessageWebSocketData);
          }
          // Show toast notification for new messages
          const messageData = message.data as MessageWebSocketData;
          toast({
            title: `New message from ${messageData.message.sender_name}`,
            description: messageData.message.content.length > 50 
              ? messageData.message.content.substring(0, 50) + '...'
              : messageData.message.content,
          });
          break;

        case 'conversation_update':
          if (options.onConversationUpdate) {
            options.onConversationUpdate(message.data as ConversationUpdateData);
          }
          break;

        case 'message_read':
          if (options.onMessageRead) {
            options.onMessageRead(message.data);
          }
          break;

        case 'typing_indicator':
          if (options.onTypingIndicator) {
            options.onTypingIndicator(message.data);
          }
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }, [options, toast]);

  const webSocket = useWebSocket({
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      console.log('Messaging WebSocket connected');
    },
    onDisconnect: () => {
      console.log('Messaging WebSocket disconnected');
    },
    onError: (error) => {
      console.error('Messaging WebSocket error:', error);
    }
  });

  const sendMessage = useCallback((type: string, data: any) => {
    webSocket.sendMessage({
      type: type as any,
      data,
      timestamp: new Date().toISOString()
    });
  }, [webSocket]);

  const markMessageAsRead = useCallback((conversationId: number, messageId: number) => {
    sendMessage('mark_message_read', {
      conversation_id: conversationId,
      message_id: messageId
    });
  }, [sendMessage]);

  const sendTypingIndicator = useCallback((conversationId: number, isTyping: boolean) => {
    sendMessage('typing_indicator', {
      conversation_id: conversationId,
      is_typing: isTyping
    });
  }, [sendMessage]);

  const joinConversation = useCallback((conversationId: number) => {
    sendMessage('join_conversation', {
      conversation_id: conversationId
    });
  }, [sendMessage]);

  const leaveConversation = useCallback((conversationId: number) => {
    sendMessage('leave_conversation', {
      conversation_id: conversationId
    });
  }, [sendMessage]);

  return {
    ...webSocket,
    sendMessage,
    markMessageAsRead,
    sendTypingIndicator,
    joinConversation,
    leaveConversation
  };
};