'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Bell, 
  Mail, 
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface TeamMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  team_id: number;
  message: string;
  message_type: 'general' | 'urgent' | 'announcement' | 'task';
  created_at: string;
  read_by: number[];
  priority: 'low' | 'medium' | 'high';
}

interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_level: string;
  status: 'active' | 'inactive';
}

interface TeamCommunicationProps {
  teamId: number;
  teamName: string;
  members: TeamMember[];
  onSendMessage?: (messageData: any) => Promise<void>;
  onSendAnnouncement?: (announcementData: any) => Promise<void>;
}

export default function TeamCommunication({
  teamId,
  teamName,
  members,
  onSendMessage,
  onSendAnnouncement
}: TeamCommunicationProps) {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'general' | 'urgent' | 'announcement' | 'task'>('general');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [teamId]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/v1/volunteer/lead/teams/${teamId}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const messageData = {
        team_id: teamId,
        message: newMessage,
        message_type: messageType,
        priority,
        recipients: selectedRecipients.length > 0 ? selectedRecipients : members.map(m => m.id)
      };

      if (onSendMessage) {
        await onSendMessage(messageData);
      } else {
        const response = await fetch('/api/v1/volunteer/lead/teams/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(messageData),
        });

        if (response.ok) {
          setNewMessage('');
          setSelectedRecipients([]);
          setShowSendDialog(false);
          loadMessages();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const announcementData = {
        team_id: teamId,
        message: newMessage,
        priority,
        recipients: members.map(m => m.id)
      };

      if (onSendAnnouncement) {
        await onSendAnnouncement(announcementData);
      } else {
        const response = await fetch('/api/v1/volunteer/lead/teams/announcements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(announcementData),
        });

        if (response.ok) {
          setNewMessage('');
          setShowSendDialog(false);
          loadMessages();
        }
      }
    } catch (error) {
      console.error('Error sending announcement:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'announcement':
        return <Bell className="h-4 w-4 text-blue-500" />;
      case 'task':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <span>Team Communication</span>
          </h2>
          <p className="text-gray-600 mt-1">Communicate with your {teamName} team members</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Send Team Message</DialogTitle>
                <DialogDescription>
                  Send a message to your team members.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Message Type</Label>
                  <Select onValueChange={(value) => setMessageType(value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select message type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Message</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="task">Task Related</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select onValueChange={(value) => setPriority(value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Recipients (Optional - sends to all if none selected)</Label>
                  <Select onValueChange={(value) => {
                    const memberId = parseInt(value);
                    if (!selectedRecipients.includes(memberId)) {
                      setSelectedRecipients([...selectedRecipients, memberId]);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specific members" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.first_name} {member.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedRecipients.map((memberId) => {
                        const member = members.find(m => m.id === memberId);
                        return member ? (
                          <Badge key={memberId} variant="secondary" className="flex items-center space-x-1">
                            <span>{member.first_name} {member.last_name}</span>
                            <button
                              onClick={() => setSelectedRecipients(selectedRecipients.filter(id => id !== memberId))}
                              className="ml-1 text-gray-500 hover:text-gray-700"
                            >
                              ×
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Message</Label>
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={messageType === 'announcement' ? handleSendAnnouncement : handleSendMessage}
                  disabled={!newMessage.trim() || loading}
                >
                  {loading ? 'Sending...' : 'Send Message'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <span>Recent Messages</span>
          </CardTitle>
          <CardDescription>
            Latest communications with your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.length > 0 ? (
              messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-shrink-0">
                    {getMessageTypeIcon(message.message_type)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{message.sender_name}</span>
                        <Badge variant="outline" className={getPriorityColor(message.priority)}>
                          {message.priority}
                        </Badge>
                        <Badge variant="outline">
                          {message.message_type}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{formatMessageTime(message.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-gray-700">{message.message}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Users className="h-3 w-3" />
                      <span>{message.read_by.length} of {members.length} members read</span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm">Start a conversation with your team!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Email Team</h3>
                <p className="text-sm text-gray-600">Send email to all members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Bell className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Announcement</h3>
                <p className="text-sm text-gray-600">Make team announcement</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Schedule Meeting</h3>
                <p className="text-sm text-gray-600">Organize team meeting</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 