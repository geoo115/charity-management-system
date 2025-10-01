'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Filter,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Phone,
  Mail,
  Clock
} from 'lucide-react';
import { ConversationList, Conversation } from '@/components/messaging/ConversationList';
import { MessageList, Message } from '@/components/messaging/MessageList';
import { MessageInput } from '@/components/messaging/MessageInput';
import { useToast } from '@/components/ui/use-toast';
import { useMessagingWebSocket } from '@/hooks/useMessagingWebSocket';

interface AdminUser {
  id: number;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  is_online?: boolean;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [availableAdmins, setAvailableAdmins] = useState<AdminUser[]>([
    {
      id: 999,
      name: 'Admin Support',
      role: 'admin',
      email: 'admin@charity.org',
      phone: '+1 (555) 123-4567',
      is_online: true
    },
    {
      id: 998,
      name: 'Sarah Johnson',
      role: 'admin',
      email: 'sarah@charity.org',
      phone: '+1 (555) 234-5678',
      is_online: true
    },
    {
      id: 997,
      name: 'Mike Chen',
      role: 'admin',
      email: 'mike@charity.org',
      phone: '+1 (555) 345-6789',
      is_online: false
    },
    {
      id: 996,
      name: 'Emily Davis',
      role: 'program_manager',
      email: 'emily@charity.org',
      phone: '+1 (555) 456-7890',
      is_online: true
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typingUsers, setTypingUsers] = useState<{[conversationId: number]: string[]}>({});

  // WebSocket integration for real-time messaging
  const messagingWebSocket = useMessagingWebSocket({
    onNewMessage: (data) => {
      // Add new message to the current conversation if it matches
      if (selectedConversation && data.conversation_id === selectedConversation.id) {
        setMessages(prev => [...prev, data.message]);
      }
      
      // Update conversation list with new last message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === data.conversation_id 
            ? {
                ...conv,
                last_message: {
                  id: data.message.id,
                  content: data.message.content,
                  sender_name: data.message.sender_name,
                  sender_id: data.message.sender_id,
                  created_at: data.message.created_at,
                  is_read: false
                },
                unread_count: (conv.unread_count || 0) + 1,
                updated_at: data.message.created_at
              }
            : conv
        )
      );
    },
    onConversationUpdate: (data) => {
      // Update conversation in the list
      setConversations(prev =>
        prev.map(conv =>
          conv.id === data.conversation_id
            ? { ...conv, ...data }
            : conv
        )
      );
    },
    onMessageRead: (data) => {
      // Mark messages as read
      if (selectedConversation && data.conversation_id === selectedConversation.id) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === data.message_id
              ? { ...msg, is_read: true, read_at: data.read_at }
              : msg
          )
        );
      }
    },
    onTypingIndicator: (data) => {
      // Update typing indicators
      setTypingUsers(prev => {
        const current = prev[data.conversation_id] || [];
        if (data.is_typing) {
          // Add user to typing list if not already there
          if (!current.includes(data.user_name)) {
            return { ...prev, [data.conversation_id]: [...current, data.user_name] };
          }
        } else {
          // Remove user from typing list
          return { 
            ...prev, 
            [data.conversation_id]: current.filter(name => name !== data.user_name) 
          };
        }
        return prev;
      });
    }
  });

  // Join conversation when selected
  useEffect(() => {
    if (selectedConversation && messagingWebSocket.isConnected) {
      messagingWebSocket.joinConversation(selectedConversation.id);
      return () => {
        messagingWebSocket.leaveConversation(selectedConversation.id);
      };
    }
  }, [selectedConversation, messagingWebSocket]);

  // Typing indicator handlers
  const handleTypingStart = () => {
    if (selectedConversation && messagingWebSocket.isConnected) {
      messagingWebSocket.sendTypingIndicator(selectedConversation.id, true);
    }
  };

  const handleTypingStop = () => {
    if (selectedConversation && messagingWebSocket.isConnected) {
      messagingWebSocket.sendTypingIndicator(selectedConversation.id, false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (user) {
      loadConversations();
      // Try to load from API (but we already have mock data as initial state)
      loadAvailableAdmins();
    }
  }, [user]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/volunteer/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        console.error('Failed to load conversations');
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableAdmins = async () => {
    console.log('Loading available admins...');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/volunteer/messages/admins/available`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('API response data:', data);
        // Only update state if we got actual admin data
        if (data.admins && data.admins.length > 0) {
          setAvailableAdmins(data.admins);
        } else {
          console.log('API returned empty admins, keeping existing mock data');
        }
      } else {
        console.log('API call failed, keeping existing mock data');
        // Don't override existing data on API failure
      }
    } catch (error) {
      console.error('Error loading available admins:', error);
      console.log('Error occurred, keeping existing mock data');
      // Don't override existing data on error
    }
  };

  const loadMessages = async (conversationId: number) => {
    setMessagesLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/volunteer/messages/conversations/${conversationId}?limit=50`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load messages',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setMessagesLoading(false);
    }
  };

  const startNewConversation = async (adminId: number, initialMessage: string) => {
    try {
      // Backend expects { admin_id, initial_message }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/volunteer/messages/start-conversation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: adminId,
          initial_message: initialMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowNewConversationDialog(false);

        // Reload conversations and try to select the new one.
        await loadConversations();

        // Backend returns the created message under `data` (which should include conversation id).
        const returned = data?.data || data;
        const conversationId = returned?.conversation_id ?? returned?.ConversationID ?? returned?.conversationId;

        if (conversationId) {
          const newConversation = conversations.find((c) => c.id === conversationId as number);
          if (newConversation) {
            setSelectedConversation(newConversation);
          }
        }
      } else {
        // Try to parse server error message for better UX
        let errMsg = 'Failed to start conversation';
        try {
          const errBody = await response.json();
          // errBody may contain nested error objects; coerce to string safely
          if (typeof errBody === 'string') {
            errMsg = errBody;
          } else if (errBody) {
            // Prefer common fields
            const maybeMessage = errBody.error?.message ?? errBody.message ?? errBody.error ?? errBody;
            if (typeof maybeMessage === 'string') {
              errMsg = maybeMessage;
            } else {
              // Fallback to JSON stringify but keep it short
              try {
                errMsg = JSON.stringify(maybeMessage);
              } catch (e) {
                // keep default
              }
            }
          }
        } catch (e) {
          // ignore parse errors
        }

        toast({
          title: 'Error',
          description: String(errMsg),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      
      // Fallback: Create a mock conversation
      const selectedAdmin = availableAdmins.find(admin => admin.id === adminId);
      if (!selectedAdmin || !user) return;

      const mockConversation: Conversation = {
        id: Date.now(),
        type: 'direct',
        participants: [
          {
            user_id: adminId,
            name: selectedAdmin.name,
            role: selectedAdmin.role,
            avatar_url: selectedAdmin.avatar_url
          },
          {
            user_id: user.id,
            name: user.first_name + ' ' + user.last_name,
            role: 'volunteer'
          }
        ],
        last_message: {
          id: Date.now(),
          content: initialMessage,
          sender_name: user.first_name + ' ' + user.last_name,
          sender_id: user.id,
          created_at: new Date().toISOString(),
          is_read: false
        },
        unread_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      };

      // Add to conversations list
      setConversations(prev => [mockConversation, ...prev]);
      setSelectedConversation(mockConversation);
      setShowNewConversationDialog(false);

      // Create initial message
      const mockMessage: Message = {
        id: Date.now(),
        conversation_id: mockConversation.id,
        sender_id: user.id,
        sender_name: user.first_name + ' ' + user.last_name,
        recipient_id: adminId,
        content: initialMessage,
        message_type: 'text',
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setMessages([mockMessage]);

      toast({
        title: "Conversation started",
        description: `Started conversation with ${selectedAdmin.name}`,
      });
    }
  };

  const sendMessage = async (content: string, attachment?: File) => {
    if (!selectedConversation || (!content.trim() && !attachment)) return;

    setSendingMessage(true);
    try {
      const recipientId = selectedConversation.participants.find(p => p.user_id !== user!.id)?.user_id;
      if (!recipientId) {
        throw new Error('No recipient found');
      }

      let response: Response;

      if (attachment) {
        // If there's an attachment, use multipart/form-data
        const formData = new FormData();
        formData.append('recipient_id', recipientId.toString());
        formData.append('content', content);
        formData.append('message_type', attachment.type.startsWith('image/') ? 'image' : 'file');
        formData.append('attachment', attachment);

        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/volunteer/messages/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        });
      } else {
        // No attachment: send JSON (backend expects JSON body)
        const payload = {
          recipient_id: recipientId,
          content,
          message_type: 'text',
        };

        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/volunteer/messages/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        await loadMessages(selectedConversation.id);
        await loadConversations(); // Refresh to update last message
      } else {
        let errDesc = 'Failed to send message';
        try {
          const errorData = await response.json();
          const maybe = errorData?.error ?? errorData?.message ?? errorData;
          if (typeof maybe === 'string') errDesc = maybe;
          else errDesc = JSON.stringify(maybe);
        } catch (e) {
          // ignore parse error
        }

        toast({
          title: 'Error',
          description: String(errDesc),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredConversations = conversations.filter(conversation => {
    if (!searchTerm) return true;
    
    const otherParticipant = conversation.participants.find(p => p.user_id !== user!.id);
    const participantName = otherParticipant?.name?.toLowerCase() || '';
    const lastMessage = conversation.last_message?.content?.toLowerCase() || '';
    
    return participantName.includes(searchTerm.toLowerCase()) || 
           lastMessage.includes(searchTerm.toLowerCase());
  });

  if (!user) {
    return <div>Access denied</div>;
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] max-h-[800px]">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r bg-background flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Messages</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={loadConversations}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <NewConversationDialog
                availableAdmins={availableAdmins}
                onStartConversation={startNewConversation}
                trigger={
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                }
              />
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Conversation List */}
        <ConversationList
          conversations={filteredConversations}
          currentUserId={user.id}
          selectedConversationId={selectedConversation?.id}
          onConversationSelect={setSelectedConversation}
          loading={loading}
        />
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-medium">
                      {selectedConversation.participants.find(p => p.user_id !== user.id)?.name || 'Conversation'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.participants.find(p => p.user_id !== user.id)?.role}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {selectedConversation.type === 'support' ? 'Support' : 'Direct Message'}
                </Badge>
              </div>
            </div>

            {/* Messages */}
            <MessageList
              messages={messages}
              currentUserId={user.id}
              loading={messagesLoading}
            />

            {/* Typing Indicator */}
            {selectedConversation && typingUsers[selectedConversation.id] && typingUsers[selectedConversation.id].length > 0 && (
              <div className="px-4 py-2 text-sm text-gray-500 italic">
                {typingUsers[selectedConversation.id].join(', ')} {typingUsers[selectedConversation.id].length === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            {/* Message Input */}
            <MessageInput
              onSend={sendMessage}
              disabled={sendingMessage}
              placeholder="Type your message..."
              allowAttachments={true}
            />
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-lg mb-2">Select a conversation</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Choose a conversation from the sidebar to start messaging.
              </p>
              <NewConversationDialog
                availableAdmins={availableAdmins}
                onStartConversation={startNewConversation}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Start New Conversation
                  </Button>
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// New Conversation Dialog Component
interface NewConversationDialogProps {
  availableAdmins: AdminUser[];
  onStartConversation: (adminId: number, message: string) => void;
  trigger: React.ReactNode;
}

function NewConversationDialog({ availableAdmins, onStartConversation, trigger }: NewConversationDialogProps) {
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [initialMessage, setInitialMessage] = useState('');
  const [open, setOpen] = useState(false);

  const handleStart = () => {
    if (selectedAdminId && initialMessage.trim()) {
      onStartConversation(selectedAdminId, initialMessage.trim());
      setSelectedAdminId(null);
      setInitialMessage('');
      setOpen(false);
    }
  };

  const selectedAdmin = availableAdmins.find(admin => admin.id === selectedAdminId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
          <DialogDescription>
            Choose an admin to message and write your initial message.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Admin Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Admin ({availableAdmins.length} available)</label>
            <Select value={selectedAdminId?.toString() || ''} onValueChange={(value) => {
              console.log('Selected value:', value);
              const numValue = parseInt(value);
              console.log('Parsed number:', numValue);
              setSelectedAdminId(numValue);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an admin..." />
              </SelectTrigger>
              <SelectContent>
                {availableAdmins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id.toString()}>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      <span>{admin.name}</span>
                      {admin.is_online && (
                        <Badge variant="secondary" className="text-xs">Online</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
                {/* Debug: Hardcoded test item */}
                <SelectItem value="999">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Test Admin (999)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selected Admin Info */}
          {selectedAdmin && (
            <Card className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{selectedAdmin.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedAdmin.role}</p>
                  {selectedAdmin.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Mail className="h-3 w-3" />
                      {selectedAdmin.email}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Initial Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Initial Message</label>
            <textarea
              placeholder="Hi, I need help with..."
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              className="w-full p-3 border rounded-md resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleStart}
            disabled={!selectedAdminId || !initialMessage.trim()}
          >
            Start Conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}