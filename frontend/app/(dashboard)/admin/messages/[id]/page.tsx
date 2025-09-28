"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MessageList } from '@/components/messaging/MessageList';
import { MessageInput } from '@/components/messaging/MessageInput';
import { ArrowLeft, User, Mail, Phone, Calendar, Flag, Check, X, Tag, Archive } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { getVolunteerConversation } from '@/lib/api/admin-comprehensive';
import { cn } from '@/lib/utils';

interface VolunteerProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  joinDate: string;
  skills: string[];
  availability: string;
  totalHours: number;
}

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

interface ConversationDetails {
  id: number;
  volunteer: VolunteerProfile;
  messages: AdminMessage[];
  status: 'active' | 'resolved' | 'pending';
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const AdminConversationPage = () => {
  const router = useRouter();
  const params = useParams();
  const conversationId = params?.id as string;

  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLimited, setProfileLimited] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!conversationId) return;

    const loadConversation = async () => {
      setLoading(true);
      try {
              const volunteerRes = await fetch(`/api/v1/admin/users/${conversationId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });

        const messagesRes = await getVolunteerConversation(Number(conversationId));

        let volunteerProfile: any = null;
        let usedFallback = false;
        if (volunteerRes.ok) {
          volunteerProfile = await volunteerRes.json();
        } else {
          console.warn('Failed to fetch volunteer profile', volunteerRes.status);
          // If profile fetch is forbidden or fails, try to extract participant info from messages
          try {
            const participants = messagesRes?.participants || [];
            const participant = participants.find((p: any) => p.role !== 'admin' && p.role !== 'Admin');
            if (participant) {
              volunteerProfile = {
                id: participant.user_id,
                first_name: participant.name?.split(' ')[0] || participant.name,
                last_name: participant.name?.split(' ').slice(1).join(' ') || '',
                email: '',
                phone: '',
                created_at: '',
                skills: [],
                availability: '',
                total_hours: 0,
                avatar_url: undefined,
              };
              usedFallback = true;
            }
          } catch (e) {
            console.error('Error extracting participant info from messagesRes', e);
          }
        }
        
        const conv: ConversationDetails = {
          id: Number(conversationId),
          volunteer: {
            id: Number(conversationId),
            name: volunteerProfile?.first_name ? `${volunteerProfile.first_name} ${volunteerProfile.last_name}` : (volunteerProfile?.name || 'Unknown'),
            email: volunteerProfile?.email || '',
            phone: volunteerProfile?.phone || '',
            joinDate: volunteerProfile?.created_at || '',
            skills: volunteerProfile?.skills || [],
            availability: volunteerProfile?.availability || '',
            totalHours: volunteerProfile?.total_hours || 0,
            avatar: volunteerProfile?.avatar_url || undefined,
          },
          messages: (messagesRes.messages || []).filter((m: any) => {
            const emptyContent = !m.content || String(m.content).trim() === '';
            const hasAttachment = !!m.attachment_url;
            return !(emptyContent && !hasAttachment);
          }),
          status: messagesRes.status || 'active',
          priority: messagesRes.priority || 'low',
          tags: messagesRes.tags || [],
          createdAt: messagesRes.created_at || '',
          updatedAt: messagesRes.updated_at || '',
        };

        setConversation(conv);
        setProfileLimited(usedFallback);
      } catch (err) {
        console.error('Error loading conversation:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [conversationId]);

  const handleSendMessage = (content: string, attachment?: File) => {
    if (!conversation) return;

    const newMessage: AdminMessage = {
      id: Date.now(),
      conversation_id: conversation.id,
      sender_id: 999, // Admin ID
      sender_name: 'Admin',
      recipient_id: conversation.volunteer.id,
      content,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attachment_url: attachment ? URL.createObjectURL(attachment) : undefined,
      attachment_name: attachment?.name
    };

    setConversation(prev => prev ? {
      ...prev,
      messages: [...prev.messages, newMessage],
      updatedAt: new Date().toISOString()
    } : null);
  };

  const handleStatusChange = (newStatus: 'active' | 'resolved' | 'pending') => {
    if (!conversation) return;
    setConversation(prev => prev ? { ...prev, status: newStatus } : null);
  };

  const handlePriorityChange = (newPriority: 'high' | 'medium' | 'low') => {
    if (!conversation) return;
    setConversation(prev => prev ? { ...prev, priority: newPriority } : null);
  };

  const handleAddTag = () => {
    if (!conversation || !newTag.trim()) return;
    
    const tag = newTag.trim().toLowerCase();
    if (!conversation.tags.includes(tag)) {
      setConversation(prev => prev ? {
        ...prev,
        tags: [...prev.tags, tag]
      } : null);
    }
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!conversation) return;
    setConversation(prev => prev ? {
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    } : null);
  };

  const getStatusColor = (status: 'active' | 'resolved' | 'pending') => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Conversation not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Avatar>
                <AvatarImage src={conversation.volunteer?.avatar} />
                <AvatarFallback>
                  {conversation.volunteer?.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold">{conversation.volunteer?.name}</h1>
                {profileLimited && (
                  <div className="text-xs text-yellow-700 bg-yellow-100 inline-block px-2 py-0.5 rounded-md mt-1">
                    Limited profile info (insufficient permissions)
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs", getStatusColor(conversation.status))}>
                    {conversation.status}
                  </Badge>
                  <div className={cn("w-2 h-2 rounded-full", getPriorityColor(conversation.priority))} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(conversation.status === 'resolved' ? 'active' : 'resolved')}
              >
                {conversation.status === 'resolved' ? (
                  <><X className="w-4 h-4 mr-1" /> Reopen</>
                ) : (
                  <><Check className="w-4 h-4 mr-1" /> Mark Resolved</>
                )}
              </Button>
              <Button variant="outline" size="sm">
                <Archive className="w-4 h-4 mr-1" />
                Archive
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <MessageList
            messages={conversation.messages}
            currentUserId={999} // Admin user ID
          />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t p-4">
          <MessageInput
            onSend={handleSendMessage}
            placeholder={`Reply to ${conversation.volunteer?.name}...`}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-white border-l flex flex-col">
        {/* Volunteer Profile */}
        <Card className="m-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Volunteer Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-sm">{conversation.volunteer?.email}</span>
            </div>
            {conversation.volunteer?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{conversation.volunteer.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Joined {new Date(conversation.volunteer?.joinDate).toLocaleDateString()}</span>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Skills</p>
              <div className="flex flex-wrap gap-1">
                {conversation.volunteer?.skills?.map(skill => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Total Hours: {conversation.volunteer?.totalHours}</p>
              <p className="text-sm text-gray-600">Available: {conversation.volunteer?.availability}</p>
            </div>
          </CardContent>
        </Card>

        {/* Conversation Management */}
        <Card className="m-4">
          <CardHeader>
            <CardTitle>Manage Conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <div className="flex gap-1">
                {(['active', 'pending', 'resolved'] as const).map(status => (
                  <Button
                    key={status}
                    variant={conversation.status === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange(status)}
                    className="capitalize flex-1 text-xs"
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <div className="flex gap-1">
                {(['high', 'medium', 'low'] as const).map(priority => (
                  <Button
                    key={priority}
                    variant={conversation.priority === priority ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePriorityChange(priority)}
                    className="capitalize flex-1 text-xs"
                  >
                    <div className={cn("w-2 h-2 rounded-full mr-1", getPriorityColor(priority))} />
                    {priority}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {conversation.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag} <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1">
                <Input
                  placeholder="Add tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  className="text-sm"
                />
                <Button size="sm" onClick={handleAddTag}>
                  <Tag className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Internal Notes */}
        <Card className="m-4 flex-1">
          <CardHeader>
            <CardTitle>Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add private notes about this conversation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] text-sm"
            />
            <Button size="sm" className="mt-2 w-full">
              Save Notes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminConversationPage;