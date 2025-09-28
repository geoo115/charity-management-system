'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  sender_name: string;
  sender_role: string;
  is_read: boolean;
  created_at: string;
}

interface Participant {
  user_id: number;
  name: string;
  role: string;
}

interface Conversation {
  id: number;
  type: string;
  participants: Participant[];
  last_message: Message | null;
  created_at: string;
  updated_at: string;
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

  // Helper functions to extract admin info from conversation
  const getAdminFromConversation = (conversation: Conversation) => {
    return conversation.participants.find(p => p.role === 'admin' || p.role === 'Admin');
  };

  const getAdminId = (conversation: Conversation) => {
    const admin = getAdminFromConversation(conversation);
    return admin ? admin.user_id.toString() : '';
  };

  const getAdminName = (conversation: Conversation) => {
    const admin = getAdminFromConversation(conversation);
    return admin ? admin.name : 'Unknown Admin';
  };

  const getUnreadCount = (conversation: Conversation) => {
    // For now, return 1 if last message is unread and not from volunteer
    if (conversation.last_message && 
        !conversation.last_message.is_read && 
        conversation.last_message.sender_role !== 'volunteer') {
      return 1;
    }
    return 0;
  };

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
      const response = await authenticatedFetch('/api/v1/volunteer/messages/conversations');
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
      const response = await authenticatedFetch('/api/v1/volunteer/messages/admins/available');
      if (response?.ok) {
        const data = await response.json();
        setAvailableAdmins(data.admins || []);
      }
    } catch (error) {
      console.error('Error fetching available admins:', error);
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId: number) => {
    try {
      const response = await authenticatedFetch(`/api/v1/volunteer/messages/conversations/${conversationId}`);
      if (response?.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        
        // Mark conversation as read
        await authenticatedFetch(`/api/v1/volunteer/messages/conversations/${conversationId}/read`, {
          method: 'PUT'
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Start new conversation
  const startNewConversation = async (adminId: string) => {
    try {
      const response = await authenticatedFetch('/api/v1/volunteer/messages/start-conversation', {
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
      const response = await authenticatedFetch('/api/v1/volunteer/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: selectedConversation.id,
          content: newMessage.trim()
        })
      });

      if (response?.ok) {
        setNewMessage('');
        await fetchMessages(selectedConversation.id);
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
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px] flex flex-col" aria-describedby="volunteer-communication-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
              <MessageCircle className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-xl font-semibold text-gray-800">Communication Center</span>
          </DialogTitle>
          <div id="volunteer-communication-description" className="sr-only">
            Communicate with admins and view messaging history
          </div>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Conversations List */}
          <div className="w-1/3 border-r pr-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Conversations
              </h3>
              <Button 
                size="sm" 
                onClick={() => setShowNewConversation(true)}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <MessageCircle className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-center">No conversations yet</p>
                <p className="text-sm text-center mt-1">Start a new conversation with an admin</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                      selectedConversation?.id === conversation.id
                        ? 'bg-blue-50 border-blue-200 shadow-md transform scale-[1.02]'
                        : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="font-medium text-gray-800">{getAdminName(conversation)}</div>
                      </div>
                      {getUnreadCount(conversation) > 0 && (
                        <Badge variant="destructive" className="text-xs animate-pulse">
                          {getUnreadCount(conversation)}
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
              <div className="mt-4 p-4 border rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-gray-800">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  Start New Conversation
                </h4>
                <div className="space-y-2">
                  {availableAdmins.map((admin) => (
                    <Button
                      key={admin.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start hover:bg-white hover:border-blue-300 transition-all duration-200"
                      onClick={() => startNewConversation(admin.id)}
                    >
                      <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full mr-3">
                        <User className="h-3 w-3 text-blue-600" />
                      </div>
                      {admin.first_name} {admin.last_name} 
                      <span className="ml-1 text-xs text-gray-500">({admin.role})</span>
                    </Button>
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-3 text-gray-600 hover:text-gray-800"
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
                <div className="border-b pb-4 mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 -m-4 p-4 rounded-t-lg">
                  <h3 className="font-semibold text-lg flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-gray-800">Conversation with {getAdminName(selectedConversation)}</span>
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
                <div className="flex gap-3 p-4 bg-gray-50 rounded-lg border">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!newMessage.trim()}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 transition-colors duration-200"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <MessageCircle className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-lg font-medium text-gray-600 mb-2">Select a conversation</p>
                <p className="text-sm text-gray-500">Choose a conversation from the list to view messages</p>
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
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push('/volunteer/messages')}
      variant="outline"
      size="sm"
      className="relative border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 px-4 py-2"
      title="Messages & Communication"
    >
      <div className="relative flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Messages</span>
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px] animate-pulse bg-red-500 hover:bg-red-600 border-2 border-white"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </div>
    </Button>
  );
}

// Floating Action Button for Communication Center
export function CommunicationFloatingButton({ unreadCount = 0 }: CommunicationQuickAccessProps) {
  const router = useRouter();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={() => router.push('/volunteer/messages')}
        size="lg"
        className="relative w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 group"
        title="Open Messages"
      >
        <div className="relative">
          <MessageCircle className="h-6 w-6 text-white" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-3 -right-3 h-6 w-6 flex items-center justify-center text-xs p-0 min-w-[24px] animate-bounce bg-red-500 hover:bg-red-600 border-2 border-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </Button>
    </div>
  );
}

export default CommunicationCenter;
