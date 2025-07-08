'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  Search, 
  Paperclip, 
  MoreVertical,
  Phone,
  Video,
  CheckCircle2,
  Clock,
  Users,
  Ticket,
  X,
  HeadphonesIcon,
  Settings,
  Star,
  Flag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Message {
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
}

interface Conversation {
  id: number;
  type: string;
  participants: Array<{
    user_id: number;
    name: string;
    role: string;
    avatar_url?: string;
  }>;
  last_message?: Message;
  created_at: string;
  updated_at: string;
}

interface SupportTicket {
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  requester_id: number;
  requester_name: string;
  assignee_id?: number;
  assignee_name?: string;
  messages: any[];
  created_at: string;
  updated_at: string;
}

interface AdminCommunicationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'messages' | 'tickets';
}

export default function AdminCommunicationCenter({ 
  isOpen, 
  onClose, 
  defaultTab = 'messages' 
}: AdminCommunicationCenterProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchTickets();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/v1/admin/volunteers/messages/conversations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      // This would be an admin endpoint for getting all support tickets
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);

      const response = await fetch(`/api/v1/admin/support-tickets?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    }
  };

  const fetchMessages = async (conversationId: number) => {
    try {
      // Get the volunteer ID from the conversation
      const volunteer = selectedConversation?.participants.find(p => p.role === 'volunteer');
      if (!volunteer) return;

      const response = await fetch(`/api/v1/admin/volunteers/${volunteer.user_id}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const volunteer = selectedConversation.participants.find(p => p.role === 'volunteer');
    if (!volunteer) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/volunteers/${volunteer.user_id}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          volunteer_id: volunteer.user_id,
          content: newMessage,
          message_type: 'text',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.data]);
        setNewMessage('');
        fetchConversations(); // Refresh conversations
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'bg-gray-100 text-gray-800';
      case 'Medium': return 'bg-blue-100 text-blue-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-7xl h-[85vh] bg-white rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center space-x-3">
            <HeadphonesIcon className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Admin Communication Center</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="h-full pb-16">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "messages" | "tickets")} className="h-full">
            <div className="border-b border-gray-200 px-4 bg-gray-50">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="messages" className="flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>Messages</span>
                </TabsTrigger>
                <TabsTrigger value="tickets" className="flex items-center space-x-2">
                  <Ticket className="h-4 w-4" />
                  <span>Support Tickets</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="messages" className="h-full m-0 p-0">
              <div className="flex h-full">
                {/* Conversations Sidebar */}
                <div className="w-1/3 border-r border-gray-200 flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Volunteer Conversations</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search volunteers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-2">
                      {conversations.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No conversations yet</p>
                        </div>
                      ) : (
                        conversations
                          .filter(conv => 
                            conv.participants.some(p => 
                              p.name.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                          )
                          .map((conversation) => {
                            const volunteer = conversation.participants.find(p => p.role === 'volunteer');
                            const isSelected = selectedConversation?.id === conversation.id;
                            
                            return (
                              <Card 
                                key={conversation.id}
                                className={`mb-2 cursor-pointer transition-all ${
                                  isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:bg-gray-50'
                                }`}
                                onClick={() => setSelectedConversation(conversation)}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-center space-x-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
                                        {volunteer?.name.split(' ').map(n => n[0]).join('') || 'V'}
                                      </AvatarFallback>
                                    </Avatar>
                                    
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900">
                                        {volunteer?.name || 'Volunteer'}
                                      </p>
                                      <Badge variant="outline" className="text-xs">
                                        Volunteer
                                      </Badge>
                                      {conversation.last_message && (
                                        <p className="text-sm text-gray-500 truncate mt-1">
                                          {conversation.last_message.content}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col">
                  {selectedConversation ? (
                    <>
                      {/* Chat Header */}
                      <div className="p-4 border-b border-gray-200 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
                                {selectedConversation.participants.find(p => p.role === 'volunteer')?.name.split(' ').map(n => n[0]).join('') || 'V'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {selectedConversation.participants.find(p => p.role === 'volunteer')?.name || 'Volunteer'}
                              </h3>
                              <p className="text-sm text-gray-500">Volunteer ID: {selectedConversation.participants.find(p => p.role === 'volunteer')?.user_id}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Flag className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Star className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                          <AnimatePresence>
                            {messages.map((message) => {
                              const isAdminMessage = message.sender_name !== selectedConversation.participants.find(p => p.role === 'volunteer')?.name;
                              
                              return (
                                <motion.div
                                  key={message.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -20 }}
                                  className={`flex ${isAdminMessage ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                    isAdminMessage 
                                      ? 'bg-purple-500 text-white' 
                                      : 'bg-gray-100 text-gray-900'
                                  }`}>
                                    <p className="text-sm">{message.content}</p>
                                    <div className={`flex items-center justify-end mt-1 space-x-1 ${
                                      isAdminMessage ? 'text-purple-100' : 'text-gray-500'
                                    }`}>
                                      <span className="text-xs">{formatTime(message.created_at)}</span>
                                      {isAdminMessage && (
                                        message.is_read ? 
                                          <CheckCircle2 className="h-3 w-3" /> : 
                                          <Clock className="h-3 w-3" />
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>

                      {/* Message Input */}
                      <div className="p-4 border-t border-gray-200 bg-white">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Paperclip className="h-4 w-4" />
                          </Button>
                          <Input
                            placeholder="Type your message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="flex-1"
                            disabled={isLoading}
                          />
                          <Button 
                            onClick={sendMessage}
                            disabled={!newMessage.trim() || isLoading}
                            className="bg-purple-500 hover:bg-purple-600"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                        <p>Choose a volunteer conversation to start messaging</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tickets" className="h-full m-0 p-0">
              <div className="flex h-full">
                {/* Tickets Sidebar */}
                <div className="w-1/3 border-r border-gray-200 flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Support Tickets</h3>
                    
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search tickets..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      <div className="flex space-x-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="Open">Open</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Priority</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-2">
                      {tickets.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Ticket className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No support tickets</p>
                        </div>
                      ) : (
                        tickets
                          .filter(ticket =>
                            ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((ticket) => {
                            const isSelected = selectedTicket?.id === ticket.id;
                            
                            return (
                              <Card 
                                key={ticket.id}
                                className={`mb-2 cursor-pointer transition-all ${
                                  isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:bg-gray-50'
                                }`}
                                onClick={() => setSelectedTicket(ticket)}
                              >
                                <CardContent className="p-3">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Badge variant="outline" className="text-xs">
                                        {ticket.ticket_number}
                                      </Badge>
                                      <span className="text-xs text-gray-500">
                                        {formatDate(ticket.created_at)}
                                      </span>
                                    </div>
                                    
                                    <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                                      {ticket.subject}
                                    </h4>
                                    
                                    <p className="text-xs text-gray-600">
                                      {ticket.requester_name}
                                    </p>
                                    
                                    <div className="flex space-x-1">
                                      <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
                                        {ticket.status}
                                      </Badge>
                                      <Badge className={`text-xs ${getPriorityColor(ticket.priority)}`}>
                                        {ticket.priority}
                                      </Badge>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Ticket Details */}
                <div className="flex-1 flex flex-col">
                  {selectedTicket ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Ticket className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium mb-2">Ticket Details</h3>
                        <p>Support ticket management interface coming soon</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Ticket className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium mb-2">Select a ticket</h3>
                        <p>Choose a support ticket to view details</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Quick access component for admin dashboard
export function AdminCommunicationQuickAccess() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'tickets'>('messages');
  const [unreadCount, setUnreadCount] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);

  useEffect(() => {
    // Fetch unread counts and open tickets periodically
    const fetchCounts = async () => {
      try {
        // Mock data - replace with actual API calls
        setUnreadCount(3);
        setOpenTickets(12);
      } catch (error) {
        console.error('Failed to fetch counts:', error);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleOpenMessages = () => {
    setActiveTab('messages');
    setIsOpen(true);
  };

  const handleOpenTickets = () => {
    setActiveTab('tickets');
    setIsOpen(true);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-40">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative"
        >
          <Button
            onClick={handleOpenMessages}
            className="bg-purple-500 hover:bg-purple-600 rounded-full p-3 shadow-lg relative"
            size="sm"
          >
            <MessageCircle className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative"
        >
          <Button
            onClick={handleOpenTickets}
            className="bg-blue-500 hover:bg-blue-600 rounded-full p-3 shadow-lg relative"
            size="sm"
          >
            <Ticket className="h-5 w-5" />
            {openTickets > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full">
                {openTickets}
              </Badge>
            )}
          </Button>
        </motion.div>
      </div>

      <AdminCommunicationCenter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        defaultTab={activeTab}
      />
    </>
  );
}
