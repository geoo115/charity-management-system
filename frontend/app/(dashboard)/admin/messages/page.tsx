"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageCircle, Users, Clock, AlertCircle } from 'lucide-react';
import AdminCommunicationCenter from '@/components/admin/admin-communication-center';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Volunteer {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  lastActive: string;
}

interface ConversationSummary {
  id: number;
  volunteer: Volunteer;
  lastMessage: {
    content: string;
    timestamp: string;
    fromVolunteer: boolean;
  };
  unreadCount: number;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'resolved' | 'pending';
  tags: string[];
}

const AdminMessagingPage = () => {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ConversationSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'priority' | 'pending'>('all');
  const [loading, setLoading] = useState(true);
  const [showCommCenter, setShowCommCenter] = useState(false);

  // Mock data - replace with API call
  useEffect(() => {
    const loadAdminConversations = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/volunteers/messages/conversations`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          console.error('Failed to fetch admin conversations', res.status);
          setLoading(false);
          return;
        }

        const data = await res.json();
        // Backend returns { conversations: ConversationResponse[], total }
        const convs = (data.conversations || []).map((c: any) => {
          const volunteerParticipant = (c.participants || []).find((p: any) => p.role === 'volunteer');

          return {
            id: c.id,
            volunteer: {
              id: volunteerParticipant?.user_id || 0,
              name: volunteerParticipant?.name || 'Unknown',
              email: volunteerParticipant?.email || '',
              lastActive: volunteerParticipant?.last_active || '',
            },
            lastMessage: {
              content: c.last_message?.content || '',
              timestamp: c.last_message?.created_at || '',
              fromVolunteer: c.last_message?.sender_id === volunteerParticipant?.user_id,
            },
            unreadCount: c.unread_count || 0,
            priority: c.priority || 'low',
            status: c.status || 'active',
            tags: c.tags || [],
          } as ConversationSummary;
        });

        setConversations(convs);
        setFilteredConversations(convs);
      } catch (err) {
        console.error('Error loading admin conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAdminConversations();
  }, []);

  useEffect(() => {
    let filtered = conversations;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        conv =>
          conv.volunteer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conv.lastMessage.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conv.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    switch (selectedFilter) {
      case 'unread':
        filtered = filtered.filter(conv => conv.unreadCount > 0);
        break;
      case 'priority':
        filtered = filtered.filter(conv => conv.priority === 'high');
        break;
      case 'pending':
        filtered = filtered.filter(conv => conv.status === 'pending');
        break;
    }

    setFilteredConversations(filtered);
  }, [conversations, searchTerm, selectedFilter]);

  const handleConversationClick = (conversationId: number) => {
    // The conversation detail page expects a volunteer id in the route so it can
    // call the backend endpoint that returns messages for the admin<->volunteer
    // pair. Use the volunteer id from the conversation to navigate.
    const conv = conversations.find(c => c.id === conversationId);
    const volunteerId = conv?.volunteer?.id;
    if (volunteerId) {
      router.push(`/admin/messages/${volunteerId}`);
    } else {
      // Fallback to conversation id if volunteer id is missing
      router.push(`/admin/messages/${conversationId}`);
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
    }
  };

  const getStatusColor = (status: 'active' | 'resolved' | 'pending') => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)} mins ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  const priorityCount = conversations.filter(conv => conv.priority === 'high').length;
  const pendingCount = conversations.filter(conv => conv.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Volunteer Messages</h1>
          <p className="text-gray-600">Manage communications with volunteers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCommCenter(true)}>
            <MessageCircle className="w-4 h-4 mr-2" />
            New
          </Button>
          <Button onClick={() => router.push('/admin/volunteers')}>
            <Users className="w-4 h-4 mr-2" />
            View All Volunteers
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Conversations</p>
                <p className="text-2xl font-bold">{conversations.length}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unread Messages</p>
                <p className="text-2xl font-bold text-red-600">{totalUnread}</p>
              </div>
              <Badge className="bg-red-500">{totalUnread}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-orange-600">{priorityCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Response</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search conversations, volunteers, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'unread', 'priority', 'pending'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={selectedFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFilter(filter)}
                  className="capitalize"
                >
                  {filter === 'priority' ? 'High Priority' : filter}
                  {filter === 'unread' && totalUnread > 0 && (
                    <Badge className="ml-1 px-1 py-0 text-xs h-4 min-w-[16px]">
                      {totalUnread}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations ({filteredConversations.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No conversations found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation.id)}
                  className={cn(
                    "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                    conversation.unreadCount > 0 && "bg-blue-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={conversation.volunteer.avatar} />
                      <AvatarFallback>
                        {conversation.volunteer.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{conversation.volunteer.name}</h3>
                        <div className={cn("w-2 h-2 rounded-full", getPriorityColor(conversation.priority))} />
                        <Badge variant="outline" className={cn("text-xs", getStatusColor(conversation.status))}>
                          {conversation.status}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 truncate mb-2">
                        {conversation.lastMessage.content}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        {conversation.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">
                        {formatTime(conversation.lastMessage.timestamp)}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Admin Communication Center dialog */}
      <AdminCommunicationCenter isOpen={showCommCenter} onClose={() => setShowCommCenter(false)} />
    </div>
  );
};

export default AdminMessagingPage;

// Communication center dialog (mounted here so admins can start new conversations)
function AdminCommunicationCenterWrapper({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return <AdminCommunicationCenter isOpen={open} onClose={() => onOpenChange(false)} />;
}