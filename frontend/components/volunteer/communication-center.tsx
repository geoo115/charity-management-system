'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Users, User } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { API_BASE_URL, getAuthToken } from '@/lib/api/api-client';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_role: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  admin_id: string;
  admin_name: string;
  last_message: Message | null;
  unread_count: number;
}

interface CommunicationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommunicationCenter({ isOpen, onClose }: CommunicationCenterProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableAdmins, setAvailableAdmins] = useState<any[]>([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const { user } = useAuth();

  // Authenticated fetch helper
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No auth token available');
    }

    return fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  };

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/v1/volunteer/messaging/conversations');
      if (response?.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available admins
  const fetchAvailableAdmins = async () => {
    try {
      const response = await authenticatedFetch('/api/v1/volunteer/messaging/available-admins');
      if (response?.ok) {
        const data = await response.json();
        setAvailableAdmins(data.admins || []);
      }
    } catch (error) {
      console.error('Error fetching available admins:', error);
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (adminId: string) => {
    try {
      const response = await authenticatedFetch(`/api/v1/volunteer/messaging/conversations/${adminId}/messages`);
      if (response?.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        
        // Mark messages as read
        await authenticatedFetch(`/api/v1/volunteer/messaging/conversations/${adminId}/read`, {
          method: 'POST'
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Start new conversation
  const startNewConversation = async (adminId: string) => {
    try {
      const response = await authenticatedFetch('/api/v1/volunteer/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({
          admin_id: adminId,
          content: 'Hello, I would like to start a conversation.'
        })
      });

      if (response?.ok) {
        setShowNewConversation(false);
        await fetchConversations();
      }
    } catch (error) {
      console.error('Error starting new conversation:', error);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await authenticatedFetch(`/api/v1/volunteer/messaging/conversations/${selectedConversation.admin_id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: newMessage.trim()
        })
      });

      if (response?.ok) {
        setNewMessage('');
        await fetchMessages(selectedConversation.admin_id);
        await fetchConversations(); // Refresh conversations to update last message
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchAvailableAdmins();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.admin_id);
    }
  }, [selectedConversation]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px] flex flex-col" aria-describedby="volunteer-communication-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Communication Center
          </DialogTitle>
          <div id="volunteer-communication-description" className="sr-only">
            Communicate with admins and view messaging history
          </div>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Conversations List */}
          <div className="w-1/3 border-r pr-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Conversations</h3>
              <Button 
                size="sm" 
                onClick={() => setShowNewConversation(true)}
                className="text-xs"
              >
                New
              </Button>
            </div>
            
            {loading ? (
              <div>Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="text-gray-500">No conversations yet</div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation?.id === conversation.id
                        ? 'bg-blue-50 border-blue-200 border'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium">{conversation.admin_name}</div>
                      {conversation.unread_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                    {conversation.last_message && (
                      <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {conversation.last_message.content}
                      </div>
                    )}
                    {conversation.last_message && (
                      <div className="text-xs text-gray-400 mt-1">
                        {formatTime(conversation.last_message.created_at)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* New Conversation Modal */}
            {showNewConversation && (
              <div className="mt-4 p-3 border rounded-lg bg-gray-50">
                <h4 className="font-medium mb-2">Start New Conversation</h4>
                <div className="space-y-2">
                  {availableAdmins.map((admin) => (
                    <Button
                      key={admin.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => startNewConversation(admin.id)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      {admin.first_name} {admin.last_name} ({admin.role})
                    </Button>
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => setShowNewConversation(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                <div className="border-b pb-3 mb-3">
                  <h3 className="font-semibold">
                    Conversation with {selectedConversation.admin_name}
                  </h3>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_role === 'volunteer' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          message.sender_role === 'volunteer'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100'
                        }`}
                      >
                        <div className="text-sm">{message.content}</div>
                        <div
                          className={`text-xs mt-1 ${
                            message.sender_role === 'volunteer'
                              ? 'text-blue-100'
                              : 'text-gray-500'
                          }`}
                        >
                          {formatTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a conversation to view messages
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CommunicationQuickAccessProps {
  unreadCount?: number;
}

export function CommunicationQuickAccess({ unreadCount = 0 }: CommunicationQuickAccessProps) {
  const [showCenter, setShowCenter] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowCenter(true)}
        variant="ghost"
        size="sm"
        className="relative p-2"
        title="Communication Center"
      >
        <MessageCircle className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
      
      <CommunicationCenter 
        isOpen={showCenter} 
        onClose={() => setShowCenter(false)} 
      />
    </>
  );
}

export default CommunicationCenter;
