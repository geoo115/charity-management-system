'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  MessageSquare,
  Paperclip,
  Send,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
  attachment_url?: string;
  attachment_name?: string;
  messages: TicketMessage[] | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

interface TicketMessage {
  id: number;
  author_id: number;
  author_name: string;
  author_role: string;
  content: string;
  message_type: string;
  attachment_url?: string;
  attachment_name?: string;
  is_internal: boolean;
  created_at: string;
}

interface CreateTicketForm {
  subject: string;
  description: string;
  category: string;
  priority: string;
  attachment_url?: string;
  attachment_name?: string;
}

export default function SupportTicketsCenter() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [createForm, setCreateForm] = useState<CreateTicketForm>({
    subject: '',
    description: '',
    category: '',
    priority: 'Medium',
  });

  const categories = [
    'Technical',
    'Shift-related',
    'Training',
    'Emergency',
    'General'
  ];

  const priorities = ['Low', 'Medium', 'High', 'Urgent'];

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const response = await fetch(`/api/v1/volunteer/support-tickets?${params}`, {
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
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (selectedTicket) {
      fetchTicketDetails(selectedTicket.id);
    }
  }, [selectedTicket?.id]);

  const fetchTicketDetails = async (ticketId: number) => {
    try {
      const response = await fetch(`/api/v1/volunteer/support-tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedTicket(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch ticket details:', error);
    }
  };

  const createTicket = async () => {
    if (!createForm.subject.trim() || !createForm.description.trim() || !createForm.category) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/volunteer/support-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(createForm),
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(prev => [data.data, ...prev]);
        setCreateForm({
          subject: '',
          description: '',
          category: '',
          priority: 'Medium',
        });
        setIsCreateDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to create ticket:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/volunteer/support-tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          content: newMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedTicket(prev => prev ? {
          ...prev,
          messages: [...(prev.messages || []), data.data]
        } : null);
        setNewMessage('');
        fetchTickets(); // Refresh the list to update last activity
      }
    } catch (error) {
      console.error('Failed to add message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Open': return <Clock className="h-4 w-4" />;
      case 'In Progress': return <AlertCircle className="h-4 w-4" />;
      case 'Resolved': return <CheckCircle className="h-4 w-4" />;
      case 'Closed': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="flex h-full">
        {/* Tickets Sidebar */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Ticket className="h-5 w-5 mr-2" />
                Support Tickets
              </h2>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Support Ticket</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Brief description of the issue"
                        value={createForm.subject}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, subject: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={createForm.category}
                        onValueChange={(value) => setCreateForm(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={createForm.priority}
                        onValueChange={(value) => setCreateForm(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorities.map(priority => (
                            <SelectItem key={priority} value={priority}>
                              {priority}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Provide detailed information about the issue"
                        value={createForm.description}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={createTicket}
                        disabled={isLoading || !createForm.subject.trim() || !createForm.description.trim() || !createForm.category}
                      >
                        Create Ticket
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Search and Filters */}
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
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tickets List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Ticket className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No tickets found</p>
                  <p className="text-sm">Create a new ticket to get started</p>
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const isSelected = selectedTicket?.id === ticket.id;
                  
                  return (
                    <motion.div
                      key={ticket.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card 
                        className={`mb-2 cursor-pointer transition-all ${
                          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
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
                            
                            <div className="flex items-center justify-between">
                              <div className="flex space-x-1">
                                <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
                                  {getStatusIcon(ticket.status)}
                                  <span className="ml-1">{ticket.status}</span>
                                </Badge>
                                <Badge className={`text-xs ${getPriorityColor(ticket.priority)}`}>
                                  {ticket.priority}
                                </Badge>
                              </div>
                              
                              {ticket.messages && ticket.messages.length > 1 && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  {ticket.messages.length}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Ticket Details */}
        <div className="flex-1 flex flex-col">
          {selectedTicket ? (
            <>
              {/* Ticket Header */}
              <div className="p-6 border-b border-gray-200 bg-white">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{selectedTicket.ticket_number}</Badge>
                      <Badge className={`${getStatusColor(selectedTicket.status)}`}>
                        {getStatusIcon(selectedTicket.status)}
                        <span className="ml-1">{selectedTicket.status}</span>
                      </Badge>
                      <Badge className={`${getPriorityColor(selectedTicket.priority)}`}>
                        {selectedTicket.priority}
                      </Badge>
                    </div>
                    
                    <h1 className="text-xl font-semibold text-gray-900">
                      {selectedTicket.subject}
                    </h1>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Category: {selectedTicket.category}</span>
                      <span>Created: {formatDate(selectedTicket.created_at)}</span>
                      {selectedTicket.assignee_name && (
                        <span>Assigned to: {selectedTicket.assignee_name}</span>
                      )}
                    </div>
                  </div>
                  
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {selectedTicket.messages && selectedTicket.messages.map((message, index) => {
                    const isOwnMessage = message.author_role === 'volunteer';
                    
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-2xl ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                          <div className={`rounded-lg p-4 ${
                            isOwnMessage 
                              ? 'bg-blue-50 border border-blue-200' 
                              : 'bg-gray-50 border border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-medium ${
                                  isOwnMessage ? 'text-blue-900' : 'text-gray-900'
                                }`}>
                                  {message.author_name}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {message.author_role}
                                </Badge>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDate(message.created_at)}
                              </span>
                            </div>
                            
                            <div className="prose prose-sm max-w-none">
                              <p className="text-gray-700 whitespace-pre-wrap">
                                {message.content}
                              </p>
                            </div>
                            
                            {message.attachment_url && (
                              <div className="mt-3 flex items-center space-x-2 text-sm text-blue-600">
                                <Paperclip className="h-4 w-4" />
                                <a href={message.attachment_url} target="_blank" rel="noopener noreferrer">
                                  {message.attachment_name || 'Attachment'}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Reply Input */}
              {selectedTicket.status !== 'Closed' && (
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add a reply..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="sm">
                        <Paperclip className="h-4 w-4 mr-1" />
                        Attach File
                      </Button>
                      <Button 
                        onClick={addMessage}
                        disabled={!newMessage.trim() || isLoading}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send Reply
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Ticket className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Select a support ticket</h3>
                <p>Choose a ticket from the sidebar to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
