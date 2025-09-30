"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageList } from '@/components/messaging/MessageList';
import { MessageInput } from '@/components/messaging/MessageInput';
import { ConversationList, Conversation as ConversationType } from '@/components/messaging/ConversationList';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Plus, HelpCircle, AlertTriangle, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface AdminMessage {
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
}

const VisitorMessagingPage = () => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationType | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHelpRequestOpen, setNewHelpRequestOpen] = useState(false);
  const [newHelpRequestData, setNewHelpRequestData] = useState({
    category: '',
    priority: 'medium',
    subject: '',
    description: ''
  });

  // Mock current visitor ID - replace with actual auth context
  const currentVisitorId = 456;

  // Mock data - replace with API calls
  useEffect(() => {
    const mockConversations: ConversationType[] = [
      {
        id: 1,
        type: 'help-request',
        title: 'Food Assistance Request',
        participants: [
          { user_id: 999, name: 'Help Desk', role: 'admin' },
          { user_id: currentVisitorId, name: 'You', role: 'visitor' }
        ],
        last_message: {
          id: 1,
          content: 'We have received your food assistance request and will process it within 24 hours.',
          sender_name: 'Help Desk',
          sender_id: 999,
          created_at: '2024-01-15T14:30:00Z',
          is_read: false
        },
        unread_count: 1,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T14:30:00Z',
        last_message_at: '2024-01-15T14:30:00Z'
      },
      {
        id: 2,
        type: 'general-inquiry',
        title: 'Volunteer Opportunities',
        participants: [
          { user_id: 888, name: 'Volunteer Coordinator', role: 'admin' },
          { user_id: currentVisitorId, name: 'You', role: 'visitor' }
        ],
        last_message: {
          id: 2,
          content: 'Thank you for your interest! We have several opportunities available.',
          sender_name: 'Volunteer Coordinator',
          sender_id: 888,
          created_at: '2024-01-14T16:20:00Z',
          is_read: true
        },
        unread_count: 0,
        created_at: '2024-01-14T15:00:00Z',
        updated_at: '2024-01-14T16:20:00Z',
        last_message_at: '2024-01-14T16:20:00Z'
      }
    ];

    setTimeout(() => {
      setConversations(mockConversations);
      setLoading(false);
    }, 500);
  }, [currentVisitorId]);

  const loadMessages = (conversationId: number) => {
    // Mock messages for the selected conversation
    const mockMessages: AdminMessage[] = [
      {
        id: 1,
        conversation_id: conversationId,
        sender_id: currentVisitorId,
        sender_name: 'You',
        recipient_id: 999,
        content: 'Hi, I need help with food assistance for my family. We are going through a difficult time.',
        message_type: 'text',
        is_read: true,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        conversation_id: conversationId,
        sender_id: 999, // Admin
        sender_name: 'Help Desk',
        recipient_id: currentVisitorId,
        content: 'Hello! I understand you need food assistance. Can you please provide some details about your family size and current situation?',
        message_type: 'text',
        is_read: true,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z'
      },
      {
        id: 3,
        conversation_id: conversationId,
        sender_id: currentVisitorId,
        sender_name: 'You',
        recipient_id: 999,
        content: 'We are a family of 4 with 2 young children. My spouse recently lost their job and we\'re struggling to make ends meet.',
        message_type: 'text',
        is_read: true,
        created_at: '2024-01-15T11:00:00Z',
        updated_at: '2024-01-15T11:00:00Z'
      },
      {
        id: 4,
        conversation_id: conversationId,
        sender_id: 999, // Admin
        sender_name: 'Help Desk',
        recipient_id: currentVisitorId,
        content: 'We have received your food assistance request and will process it within 24 hours. Our team will contact you shortly with next steps.',
        message_type: 'text',
        is_read: false,
        created_at: '2024-01-15T14:30:00Z',
        updated_at: '2024-01-15T14:30:00Z'
      }
    ];

    setMessages(mockMessages);
  };

  const handleConversationSelect = (conversation: ConversationType) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
  };

  const handleSendMessage = (content: string, attachment?: File) => {
    if (!selectedConversation) return;

    const newMessage: AdminMessage = {
      id: Date.now(),
      conversation_id: selectedConversation.id,
      sender_id: currentVisitorId,
      sender_name: 'You',
      recipient_id: 999, // Admin
      content,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attachment_url: attachment ? URL.createObjectURL(attachment) : undefined,
      attachment_name: attachment?.name
    };

    setMessages(prev => [...prev, newMessage]);

    // Update conversation's last message
    setConversations(prev => 
      prev.map(conv => 
        conv.id === selectedConversation.id 
          ? { 
              ...conv, 
              last_message: {
                id: newMessage.id,
                content,
                sender_name: 'You',
                sender_id: currentVisitorId,
                created_at: new Date().toISOString(),
                is_read: false
              },
              updated_at: new Date().toISOString(),
              last_message_at: new Date().toISOString()
            }
          : conv
      )
    );

    toast({
      title: "Message sent",
      description: "Your message has been sent successfully.",
    });
  };

  const handleCreateHelpRequest = () => {
    if (!newHelpRequestData.subject || !newHelpRequestData.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const newConversation: ConversationType = {
      id: Date.now(),
      type: 'help-request',
      title: newHelpRequestData.subject,
      participants: [
        { user_id: 999, name: 'Help Desk', role: 'admin' },
        { user_id: currentVisitorId, name: 'You', role: 'visitor' }
      ],
      last_message: {
        id: Date.now(),
        content: newHelpRequestData.description,
        sender_name: 'You',
        sender_id: currentVisitorId,
        created_at: new Date().toISOString(),
        is_read: false
      },
      unread_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString()
    };

    setConversations(prev => [newConversation, ...prev]);
    setNewHelpRequestOpen(false);
    setNewHelpRequestData({ category: '', priority: 'medium', subject: '', description: '' });
    handleConversationSelect(newConversation);

    toast({
      title: "Help request created",
      description: "Your help request has been submitted successfully.",
    });
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Help Request List Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Help Requests</h2>
            <Dialog open={newHelpRequestOpen} onOpenChange={setNewHelpRequestOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  New Request
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Help Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={newHelpRequestData.category}
                      onValueChange={(value) => 
                        setNewHelpRequestData(prev => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select help category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="food">Food Assistance</SelectItem>
                        <SelectItem value="clothing">Clothing Donations</SelectItem>
                        <SelectItem value="housing">Housing Support</SelectItem>
                        <SelectItem value="medical">Medical Assistance</SelectItem>
                        <SelectItem value="employment">Employment Support</SelectItem>
                        <SelectItem value="education">Educational Resources</SelectItem>
                        <SelectItem value="legal">Legal Aid</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <Select
                      value={newHelpRequestData.priority}
                      onValueChange={(value) => 
                        setNewHelpRequestData(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="low">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Subject</label>
                    <Input
                      value={newHelpRequestData.subject}
                      onChange={(e) => 
                        setNewHelpRequestData(prev => ({ ...prev, subject: e.target.value }))
                      }
                      placeholder="Brief description of your need"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newHelpRequestData.description}
                      onChange={(e) => 
                        setNewHelpRequestData(prev => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Please provide details about your situation and what help you need"
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setNewHelpRequestOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateHelpRequest}>
                      Submit Request
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-blue-50 p-3 rounded mb-4">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">Need Help?</span>
            </div>
            <p className="text-sm text-blue-700">
              Our team is here to assist you. Submit a help request and we&apos;ll respond as soon as possible.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            currentUserId={currentVisitorId}
            selectedConversationId={selectedConversation?.id}
            onConversationSelect={handleConversationSelect}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    <HelpCircle className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="font-semibold">
                    {selectedConversation.title || 'Help Request'}
                  </h1>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {selectedConversation.type.replace('-', ' ')}
                    </Badge>
                    {selectedConversation.unread_count && selectedConversation.unread_count > 0 && (
                      <Badge className="bg-red-500">
                        {selectedConversation.unread_count} unread
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <MessageList
                messages={messages}
                currentUserId={currentVisitorId}
              />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t p-4">
              <MessageInput
                onSend={handleSendMessage}
                placeholder="Type your message..."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to Help Center
              </h3>
              <p className="text-gray-500 mb-4 max-w-md">
                Select a help request to continue the conversation or create a new request 
                to get assistance with your needs.
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>24/7 Support Available</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Quick Response Times</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <span>Comprehensive Assistance</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitorMessagingPage;