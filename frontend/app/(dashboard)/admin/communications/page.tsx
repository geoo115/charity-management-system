'use client';

import { AlertTriangle, Settings, MessageSquare, CheckCircle, Clock, Edit, Mail, Smartphone, Bell, Monitor, Globe, Target, Megaphone, FileText, Zap, Filter, Search, MoreHorizontal, Eye, Copy, Trash2, Users, Send } from 'lucide-react';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getCommunicationMessages, getCommunicationTemplates, sendBroadcastMessage, sendTargetedMessage, CommunicationMessage, MessageTemplate } from '@/lib/api/admin-comprehensive';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';
import { formatDistanceToNow } from 'date-fns';

export default function CommunicationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<CommunicationMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [showTargetedDialog, setShowTargetedDialog] = useState(false);

  // Broadcast message form state
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'urgent' | 'maintenance',
    recipients: [] as string[],
    channels: [] as string[],
    scheduledAt: ''
  });

  // Targeted message form state
  const [targetedForm, setTargetedForm] = useState({
    title: '',
    message: '',
    recipients: [] as string[],
    channels: [] as string[],
    template: '',
    scheduledAt: ''
  });

  useEffect(() => {
    if (user?.role === 'Admin') {
      loadCommunicationData();
    }
  }, [user]);

  useEffect(() => {
    filterMessages();
  }, [messages, searchTerm, statusFilter, typeFilter]);

  const loadCommunicationData = async () => {
    try {
      setLoading(true);
      
      // Fetch real communication data from API
      const [messagesData, templatesData] = await Promise.all([
        getCommunicationMessages(),
        getCommunicationTemplates(),
      ]);

      setMessages(messagesData.messages || []);
      setTemplates(templatesData || []);
    } catch (error: any) {
      console.error('Error loading communication data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load communication data',
        variant: 'destructive',
      });
      setMessages([]);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const filterMessages = () => {
    let filtered = messages;

    if (searchTerm) {
      filtered = filtered.filter(message =>
        message.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(message => message.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(message => message.type === typeFilter);
    }

    setFilteredMessages(filtered);
  };

  const handleBroadcastSubmit = async () => {
    try {
      await sendBroadcastMessage(broadcastForm);
      toast({
        title: 'Success',
        description: 'Broadcast message sent successfully',
      });
      setShowBroadcastDialog(false);
      setBroadcastForm({
        title: '',
        message: '',
        type: 'info',
        recipients: [],
        channels: [],
        scheduledAt: ''
      });
      loadCommunicationData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send broadcast message',
        variant: 'destructive',
      });
    }
  };

  const handleTargetedSubmit = async () => {
    try {
      await sendTargetedMessage(targetedForm);
      toast({
        title: 'Success',
        description: 'Targeted message sent successfully',
      });
      setShowTargetedDialog(false);
      setTargetedForm({
        title: '',
        message: '',
        recipients: [],
        channels: [],
        template: '',
        scheduledAt: ''
      });
      loadCommunicationData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send targeted message',
        variant: 'destructive',
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'maintenance':
        return <Settings className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'maintenance':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Edit className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-3 w-3" />;
      case 'sms':
        return <Smartphone className="h-3 w-3" />;
      case 'push':
        return <Bell className="h-3 w-3" />;
      case 'in_app':
        return <Monitor className="h-3 w-3" />;
      default:
        return <Globe className="h-3 w-3" />;
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading communication management..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communication Management</h1>
          <p className="text-muted-foreground">
            Manage broadcast messages, targeted communications, and message templates
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0 flex-wrap">
          <Dialog open={showTargetedDialog} onOpenChange={setShowTargetedDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Target className="h-4 w-4 mr-2" />
                Targeted Message
              </Button>
            </DialogTrigger>
          </Dialog>
          
          <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
            <DialogTrigger asChild>
              <Button>
                <Megaphone className="h-4 w-4 mr-2" />
                Broadcast Message
              </Button>
            </DialogTrigger>
          </Dialog>

          <Button variant="outline" asChild>
            <Link href="/admin/communications/templates">
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href="/admin/communications/analytics">
              <Zap className="h-4 w-4 mr-2" />
              Analytics
            </Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href="/admin/communications/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search messages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type-filter">Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button variant="outline" onClick={loadCommunicationData}>
                    <Search className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages Table */}
          <Card>
            <CardHeader>
              <CardTitle>Communication Messages</CardTitle>
              <CardDescription>
                {filteredMessages.length} of {messages.length} messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Checkbox
                        checked={selectedMessages.length === filteredMessages.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedMessages(filteredMessages.map(m => m.id));
                          } else {
                            setSelectedMessages([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reach</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedMessages.includes(message.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMessages([...selectedMessages, message.id]);
                            } else {
                              setSelectedMessages(selectedMessages.filter(id => id !== message.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{message.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {message.message.substring(0, 50)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeColor(message.type) as any} className="flex items-center gap-1 w-fit">
                          {getTypeIcon(message.type)}
                          {message.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {message.recipients.map((recipient, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {recipient}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {message.channels.map((channel, index) => (
                            <div key={index} className="flex items-center gap-1 text-xs text-muted-foreground">
                              {getChannelIcon(channel)}
                              {channel}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(message.status)}
                          <span className="capitalize">{message.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {message.actualReach ? (
                            <div>
                              <div>{message.actualReach}/{message.estimatedReach}</div>
                              <div className="text-xs text-muted-foreground">
                                {message.deliveryRate}% delivered
                              </div>
                            </div>
                          ) : (
                            <div>{message.estimatedReach} estimated</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>
                Manage reusable message templates for common communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <CardDescription>{template.subject}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          {template.content.substring(0, 100)}...
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Used {template.usageCount} times</span>
                          {template.lastUsed && (
                            <span>• Last used {formatDistanceToNow(new Date(template.lastUsed), { addSuffix: true })}</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline">
                            <Copy className="h-4 w-4 mr-2" />
                            Use
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{messages.length}</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">95.2%</div>
                <p className="text-xs text-muted-foreground">
                  +1.2% from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,242</div>
                <p className="text-xs text-muted-foreground">
                  +180 from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templates.filter(t => t.isActive).length}</div>
                <p className="text-xs text-muted-foreground">
                  {templates.length} total templates
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Broadcast Message Dialog */}
      <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Broadcast Message</DialogTitle>
            <DialogDescription>
              Send a message to all users or specific user groups
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="broadcast-title">Message Title</Label>
              <Input
                id="broadcast-title"
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm({...broadcastForm, title: e.target.value})}
                placeholder="Enter message title..."
              />
            </div>

            <div>
              <Label htmlFor="broadcast-message">Message Content</Label>
              <Textarea
                id="broadcast-message"
                value={broadcastForm.message}
                onChange={(e) => setBroadcastForm({...broadcastForm, message: e.target.value})}
                placeholder="Enter your message..."
                rows={4}
              />
            </div>

            <div>
              <Label>Message Type</Label>
              <Select 
                value={broadcastForm.type} 
                onValueChange={(value: any) => setBroadcastForm({...broadcastForm, type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Information</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Recipients</Label>
              <div className="space-y-2 mt-2">
                {['all', 'visitors', 'volunteers', 'donors', 'admins'].map((recipient) => (
                  <div key={recipient} className="flex items-center space-x-2">
                    <Checkbox
                      checked={broadcastForm.recipients.includes(recipient)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setBroadcastForm({
                            ...broadcastForm, 
                            recipients: [...broadcastForm.recipients, recipient]
                          });
                        } else {
                          setBroadcastForm({
                            ...broadcastForm, 
                            recipients: broadcastForm.recipients.filter(r => r !== recipient)
                          });
                        }
                      }}
                    />
                    <Label className="capitalize">{recipient}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Delivery Channels</Label>
              <div className="space-y-2 mt-2">
                {['email', 'sms', 'push', 'in_app'].map((channel) => (
                  <div key={channel} className="flex items-center space-x-2">
                    <Checkbox
                      checked={broadcastForm.channels.includes(channel)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setBroadcastForm({
                            ...broadcastForm, 
                            channels: [...broadcastForm.channels, channel]
                          });
                        } else {
                          setBroadcastForm({
                            ...broadcastForm, 
                            channels: broadcastForm.channels.filter(c => c !== channel)
                          });
                        }
                      }}
                    />
                    <Label className="capitalize flex items-center gap-2">
                      {getChannelIcon(channel)}
                      {channel === 'in_app' ? 'In-App' : channel}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="broadcast-scheduled">Schedule (Optional)</Label>
              <Input
                id="broadcast-scheduled"
                type="datetime-local"
                value={broadcastForm.scheduledAt}
                onChange={(e) => setBroadcastForm({...broadcastForm, scheduledAt: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBroadcastDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBroadcastSubmit}>
              <Send className="h-4 w-4 mr-2" />
              Send Broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Targeted Message Dialog */}
      <Dialog open={showTargetedDialog} onOpenChange={setShowTargetedDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Targeted Message</DialogTitle>
            <DialogDescription>
              Send a personalized message to specific users
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="targeted-title">Message Title</Label>
              <Input
                id="targeted-title"
                value={targetedForm.title}
                onChange={(e) => setTargetedForm({...targetedForm, title: e.target.value})}
                placeholder="Enter message title..."
              />
            </div>

            <div>
              <Label>Use Template (Optional)</Label>
              <Select 
                value={targetedForm.template} 
                onValueChange={(value) => setTargetedForm({...targetedForm, template: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.isActive).map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="targeted-message">Message Content</Label>
              <Textarea
                id="targeted-message"
                value={targetedForm.message}
                onChange={(e) => setTargetedForm({...targetedForm, message: e.target.value})}
                placeholder="Enter your message..."
                rows={4}
              />
            </div>

            <div>
              <Label>Delivery Channels</Label>
              <div className="space-y-2 mt-2">
                {['email', 'sms', 'push', 'in_app'].map((channel) => (
                  <div key={channel} className="flex items-center space-x-2">
                    <Checkbox
                      checked={targetedForm.channels.includes(channel)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setTargetedForm({
                            ...targetedForm, 
                            channels: [...targetedForm.channels, channel]
                          });
                        } else {
                          setTargetedForm({
                            ...targetedForm, 
                            channels: targetedForm.channels.filter(c => c !== channel)
                          });
                        }
                      }}
                    />
                    <Label className="capitalize flex items-center gap-2">
                      {getChannelIcon(channel)}
                      {channel === 'in_app' ? 'In-App' : channel}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="targeted-scheduled">Schedule (Optional)</Label>
              <Input
                id="targeted-scheduled"
                type="datetime-local"
                value={targetedForm.scheduledAt}
                onChange={(e) => setTargetedForm({...targetedForm, scheduledAt: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTargetedDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTargetedSubmit}>
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
