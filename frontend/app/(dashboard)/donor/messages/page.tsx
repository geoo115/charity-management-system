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
import { MessageCircle, Plus, Heart, DollarSign, Users, HelpCircle } from 'lucide-react';
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

interface Conversation {
  id: number;
  name: string;
  lastMessage?: string;
  timestamp?: string;
  unreadCount: number;
  avatar?: string;
  status: 'active' | 'resolved';
}

const DonorMessagingPage = () => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationType | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newConversationData, setNewConversationData] = useState({
    subject: '',
    category: '',
    message: ''
  });

  // Mock current donor ID - replace with actual auth context
  const currentDonorId = 123;

  // Mock data - replace with API calls
  useEffect(() => {
    const mockConversations: ConversationType[] = [
      {
        id: 1,
        type: 'support',
        participants: [
          { user_id: 999, name: 'Admin Support', role: 'admin' },
          { user_id: currentDonorId, name: 'You', role: 'donor' }
        ],
        last_message: {
          id: 1,
          content: 'Thank you for your generous donation!',
          sender_name: 'Admin Support',
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
        type: 'impact-report',
        participants: [
          { user_id: 888, name: 'Impact Report Team', role: 'admin' },
          { user_id: currentDonorId, name: 'You', role: 'donor' }
        ],
        last_message: {
          id: 2,
          content: 'Here\'s your quarterly impact report',
          sender_name: 'Impact Report Team',
          sender_id: 888,
          created_at: '2024-01-14T10:15:00Z',
          is_read: true
        },
        unread_count: 0,
        created_at: '2024-01-14T09:00:00Z',
        updated_at: '2024-01-14T10:15:00Z',
        last_message_at: '2024-01-14T10:15:00Z'
      }
    ];

    setTimeout(() => {
      setConversations(mockConversations);
      setLoading(false);
    }, 500);
  }, [currentDonorId]);

  const loadMessages = (conversationId: number) => {
    // Mock messages for the selected conversation
    const mockMessages: AdminMessage[] = [
      {
        id: 1,
        conversation_id: conversationId,
        sender_id: 999, // Admin
        sender_name: 'Admin Support',
        recipient_id: currentDonorId,
        content: 'Hello! Thank you for your recent donation of $500 to our food drive program.',
        message_type: 'text',
        is_read: true,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        conversation_id: conversationId,
        sender_id: currentDonorId,
        sender_name: 'You',
        recipient_id: 999,
        content: 'You\'re welcome! I\'d love to know more about how my donation is being used.',
        message_type: 'text',
        is_read: true,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z'
      },
      {
        id: 3,
        conversation_id: conversationId,
        sender_id: 999, // Admin
        sender_name: 'Admin Support',
        recipient_id: currentDonorId,
        content: 'Absolutely! Your $500 donation helped us purchase food supplies for 50 families this week. We\'ll send you a detailed impact report shortly.',
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
      sender_id: currentDonorId,
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
          ? { ...conv, lastMessage: content, timestamp: new Date().toISOString() }
          : conv
      )
    );

    toast({
      title: "Message sent",
      description: "Your message has been sent successfully.",
    });
  };

  const handleCreateConversation = () => {
    if (!newConversationData.subject || !newConversationData.message) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const newConversation: ConversationType = {
      id: Date.now(),
      type: newConversationData.category,
      participants: [
        { user_id: 999, name: 'Admin Support', role: 'admin' },
        { user_id: currentDonorId, name: 'You', role: 'donor' }
      ],
      last_message: {
        id: Date.now(),
        content: newConversationData.message,
        sender_name: 'You',
        sender_id: currentDonorId,
        created_at: new Date().toISOString(),
        is_read: false
      },
      unread_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString()
    };

    setConversations(prev => [newConversation, ...prev]);
    setNewConversationOpen(false);
    setNewConversationData({ subject: '', category: '', message: '' });
    handleConversationSelect(newConversation);

    toast({
      title: "Conversation started",
      description: "Your new conversation has been created.",
    });
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
      {/* Conversation List Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={newConversationData.category}
                      onValueChange={(value) => 
                        setNewConversationData(prev => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="donation">Donation Inquiry</SelectItem>
                        <SelectItem value="impact">Impact Report</SelectItem>
                        <SelectItem value="tax">Tax Documentation</SelectItem>
                        <SelectItem value="events">Events & Programs</SelectItem>
                        <SelectItem value="volunteer">Volunteer Opportunities</SelectItem>
                        <SelectItem value="support">General Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Subject</label>
                    <Input
                      value={newConversationData.subject}
                      onChange={(e) => 
                        setNewConversationData(prev => ({ ...prev, subject: e.target.value }))
                      }
                      placeholder="Brief subject line"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Message</label>
                    <Textarea
                      value={newConversationData.message}
                      onChange={(e) => 
                        setNewConversationData(prev => ({ ...prev, message: e.target.value }))
                      }
                      placeholder="How can we help you?"
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setNewConversationOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateConversation}>
                      Start Conversation
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-blue-50 p-2 rounded text-center">
              <Heart className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <div className="font-medium">Total Donated</div>
              <div className="text-blue-600">$2,450</div>
            </div>
            <div className="bg-green-50 p-2 rounded text-center">
              <Users className="w-4 h-4 mx-auto mb-1 text-green-600" />
              <div className="font-medium">Families Helped</div>
              <div className="text-green-600">127</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            currentUserId={currentDonorId}
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
                    <MessageCircle className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="font-semibold">
                    {selectedConversation.title || 
                     selectedConversation.participants.find(p => p.user_id !== currentDonorId)?.name || 
                     'Conversation'}
                  </h1>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">
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
                currentUserId={currentDonorId}
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
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to Donor Support
              </h3>
              <p className="text-gray-500 mb-4 max-w-md">
                Select a conversation to continue or start a new one to ask questions about 
                donations, impact reports, or volunteer opportunities.
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Donation Support</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Heart className="w-4 h-4" />
                  <span>Impact Reports</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <span>General Questions</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonorMessagingPage;