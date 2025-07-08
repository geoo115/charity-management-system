'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, User, X } from 'lucide-react';
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

interface AdminCommunicationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminCommunicationCenter({ isOpen, onClose }: AdminCommunicationCenterProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const { user } = useAuth();

  // Helper functions to extract participant info from conversation
  const getNonAdminParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p.role !== 'admin');
  };

  const getParticipantId = (conversation: Conversation) => {
    const participant = getNonAdminParticipant(conversation);
    return participant ? participant.user_id.toString() : '';
  };

  const getParticipantName = (conversation: Conversation) => {
    const participant = getNonAdminParticipant(conversation);
    return participant ? participant.name : 'Unknown User';
  };

  // Legacy helper functions for volunteers (keeping for compatibility)
  const getVolunteerFromConversation = (conversation: Conversation) => {
    return conversation.participants.find(p => p.role === 'volunteer');
  };

  const getVolunteerId = (conversation: Conversation) => {
    // Try to get volunteer first, then any non-admin participant
    const volunteer = getVolunteerFromConversation(conversation);
    if (volunteer) return volunteer.user_id.toString();
    
    const participant = getNonAdminParticipant(conversation);
    return participant ? participant.user_id.toString() : '';
  };

  const getVolunteerName = (conversation: Conversation) => {
    // Try to get volunteer first, then any non-admin participant
    const volunteer = getVolunteerFromConversation(conversation);
    if (volunteer) return volunteer.name;
    
    const participant = getNonAdminParticipant(conversation);
    return participant ? participant.name : 'Unknown User';
  };

  const getUnreadCount = (conversation: Conversation) => {
    // For now, return 1 if last message is unread and not from admin
    if (conversation.last_message && 
        !conversation.last_message.is_read && 
        conversation.last_message.sender_role !== 'admin') {
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
      const response = await authenticatedFetch('/api/v1/admin/volunteers/messages/conversations');
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

  // Fetch available volunteers and staff to start new conversations
  const fetchAvailableUsers = async () => {
    try {
      // Fetch volunteers
      const volunteersResponse = await authenticatedFetch('/api/v1/admin/volunteers');
      let users: Array<{id: number, name: string, role: string, email: string}> = [];
      
      if (volunteersResponse?.ok) {
        const volunteersData = await volunteersResponse.json();
        const volunteers = (volunteersData.volunteers || []).map((vol: any) => ({
          id: vol.id,
          name: `${vol.first_name} ${vol.last_name}`,
          role: 'Volunteer',
          email: vol.email
        }));
        users = [...users, ...volunteers];
      }

      // Fetch staff/admins
      const staffResponse = await authenticatedFetch('/api/v1/admin/staff');
      if (staffResponse?.ok) {
        const staffData = await staffResponse.json();
        const staff = (staffData.staff || []).map((member: any) => ({
          id: member.id,
          name: `${member.first_name} ${member.last_name}`,
          role: member.role || 'Staff',
          email: member.email
        }));
        users = [...users, ...staff];
      }

      // Filter out current admin user
      const filteredUsers = users.filter(u => u.id !== user?.id);
      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  // Start a new conversation with a volunteer or staff member
  const startNewConversation = async (userId: number, userRole: string) => {
    try {
      let endpoint = '';
      let requestBody = {};

      if (userRole === 'Volunteer') {
        // Use the existing volunteer messaging endpoint
        endpoint = `/api/v1/admin/volunteers/${userId}/messages/send`;
        requestBody = {
          volunteer_id: userId,
          content: 'Hello! I\'m starting a new conversation with you.',
          message_type: 'text'
        };
      } else {
        // For staff/admin, we might need a different endpoint
        // For now, let's assume we can use a general messaging endpoint
        endpoint = '/api/v1/admin/messaging/start';
        requestBody = {
          recipient_id: userId,
          content: 'Hello! I\'m starting a new conversation with you.',
          message_type: 'text'
        };
      }

      const response = await authenticatedFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      if (response?.ok) {
        setShowNewConversation(false);
        await fetchConversations();
        // Select the new conversation if possible
        const conversationsData = await authenticatedFetch('/api/v1/admin/volunteers/messages/conversations');
        if (conversationsData?.ok) {
          const data = await conversationsData.json();
          const conversations = data.conversations || [];
          // Find the conversation with the user we just messaged
          const newConversation = conversations.find((conv: Conversation) => 
            conv.participants.some(p => p.user_id === userId)
          );
          if (newConversation) {
            setSelectedConversation(newConversation);
          }
        }
      } else {
        console.error('Failed to start conversation, status:', response?.status);
      }
    } catch (error) {
      console.error('Error starting new conversation:', error);
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (volunteerId: string) => {
    try {
      const response = await authenticatedFetch(`/api/v1/admin/volunteers/${volunteerId}/messages`);
      if (response?.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        
        // Note: Admin doesn't have a "mark as read" endpoint yet
        // This could be implemented in the future if needed
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const volunteerId = getVolunteerId(selectedConversation);
    if (!volunteerId) return;

    try {
      const response = await authenticatedFetch(`/api/v1/admin/volunteers/${volunteerId}/messages/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          volunteer_id: parseInt(volunteerId),
          content: newMessage.trim(),
          message_type: 'text'
        })
      });

      if (response?.ok) {
        setNewMessage('');
        await fetchMessages(volunteerId);
        await fetchConversations(); // Refresh conversations to update last message
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchAvailableUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedConversation) {
      const volunteerId = getVolunteerId(selectedConversation);
      if (volunteerId) {
        fetchMessages(volunteerId);
      }
    }
  }, [selectedConversation]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px] flex flex-col" aria-describedby="admin-communication-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Admin Communication Center
          </DialogTitle>
          <div id="admin-communication-description" className="sr-only">
            Manage conversations with volunteers and view messaging history
          </div>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Conversations List */}
          <div className="w-1/3 border-r pr-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Active Conversations</h3>
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
                      <div className="font-medium">{getVolunteerName(conversation)}</div>
                      {getUnreadCount(conversation) > 0 && (
                        <Badge variant="destructive" className="text-xs">
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
              <div className="mt-4 p-3 border rounded-lg bg-gray-50 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Start New Conversation</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowNewConversation(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {availableUsers.length === 0 ? (
                    <div className="text-sm text-gray-500">No users available</div>
                  ) : (
                    availableUsers.map((user) => (
                      <Button
                        key={user.id}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left"
                        onClick={() => startNewConversation(user.id, user.role)}
                      >
                        <User className="h-4 w-4 mr-2 flex-shrink-0" />
                        <div className="flex flex-col items-start">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.role} - {user.email}</div>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                <div className="border-b pb-3 mb-3">
                  <h3 className="font-semibold">
                    Conversation with {getVolunteerName(selectedConversation)}
                  </h3>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_role === 'admin' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          message.sender_role === 'admin'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100'
                        }`}
                      >
                        <div className="text-sm">{message.content}</div>
                        <div
                          className={`text-xs mt-1 ${
                            message.sender_role === 'admin'
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
                    Send
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

interface AdminCommunicationQuickAccessProps {
  onClick: () => void;
  unreadCount?: number;
}

export function AdminCommunicationQuickAccess({ onClick, unreadCount = 0 }: AdminCommunicationQuickAccessProps) {
  return (
    <Button
      onClick={onClick}
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
  );
}

export default AdminCommunicationCenter;
