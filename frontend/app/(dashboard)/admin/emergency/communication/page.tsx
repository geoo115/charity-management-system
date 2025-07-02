'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertCircle, 
  Send, 
  Bell, 
  MessageSquare, 
  Phone, 
  Mail, 
  Users, 
  Megaphone,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Smartphone,
  Radio,
  Volume2,
  Eye,
  Settings,
  Plus
} from 'lucide-react';

// Mock data for emergency communications
const communicationData = {
  activeAlerts: [
    {
      id: 'ALERT-001',
      title: 'Fire Emergency - Immediate Evacuation',
      type: 'Critical Alert',
      severity: 'Critical',
      status: 'Active',
      sentAt: '2024-01-10T14:30:00Z',
      channels: ['SMS', 'Email', 'Push', 'PA System'],
      recipients: 245,
      acknowledged: 198,
      message: 'FIRE EMERGENCY: Immediate evacuation required. Proceed to assembly point Alpha. Do not use elevators.',
      incidentId: 'INC-001'
    },
    {
      id: 'ALERT-002',
      title: 'Medical Emergency - Building B',
      type: 'Medical Alert',
      severity: 'High',
      status: 'Active',
      sentAt: '2024-01-10T15:45:00Z',
      channels: ['SMS', 'Push'],
      recipients: 87,
      acknowledged: 65,
      message: 'Medical emergency in Building B. Medical personnel and volunteers in the area please report to Distribution Center.',
      incidentId: 'INC-002'
    }
  ],
  recentMessages: [
    {
      id: 'MSG-001',
      title: 'Weekly Safety Reminder',
      type: 'Routine',
      sentAt: '2024-01-08T09:00:00Z',
      channels: ['Email'],
      recipients: 312,
      acknowledged: 280
    },
    {
      id: 'MSG-002',
      title: 'System Maintenance Notice',
      type: 'Information',
      sentAt: '2024-01-07T16:30:00Z',
      channels: ['Email', 'Push'],
      recipients: 156,
      acknowledged: 145
    }
  ],
  templates: [
    {
      id: 'TEMP-001',
      name: 'Fire Emergency',
      category: 'Emergency',
      message: 'FIRE EMERGENCY: Immediate evacuation required. Proceed to assembly point {location}. Do not use elevators.',
      variables: ['location'],
      usage: 5
    },
    {
      id: 'TEMP-002',
      name: 'Medical Emergency',
      category: 'Emergency',
      message: 'Medical emergency in {location}. Medical personnel please report immediately.',
      variables: ['location'],
      usage: 3
    },
    {
      id: 'TEMP-003',
      name: 'Severe Weather Warning',
      category: 'Weather',
      message: 'WEATHER ALERT: {weather_type} warning in effect. Take appropriate precautions.',
      variables: ['weather_type'],
      usage: 2
    }
  ],
  stats: {
    messagesThisWeek: 8,
    totalRecipients: 458,
    averageResponse: '3 minutes',
    activeChannels: 6
  }
};

const messageTypes = ['Critical Alert', 'Emergency', 'Medical Alert', 'Weather Alert', 'Information', 'Routine'];
const channels = ['SMS', 'Email', 'Push Notification', 'PA System', 'Mobile App', 'Website Banner'];
const recipientGroups = ['All Staff', 'Volunteers', 'Managers', 'Emergency Team', 'Medical Staff', 'Security', 'Custom'];

export default function EmergencyCommunication() {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'sms':
        return <Smartphone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'push':
      case 'push notification':
        return <Bell className="h-4 w-4" />;
      case 'pa system':
        return <Volume2 className="h-4 w-4" />;
      case 'mobile app':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertCircle className="h-8 w-8 text-orange-500" />
            Emergency Communication
          </h1>
          <p className="text-muted-foreground mt-1">
            Send emergency alerts and manage crisis communications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-red-600 hover:bg-red-700">
                <Megaphone className="h-4 w-4 mr-2" />
                Send Emergency Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Send Emergency Alert</DialogTitle>
                <DialogDescription>
                  Create and send an emergency communication
                </DialogDescription>
              </DialogHeader>
              <CreateAlertForm 
                onClose={() => setIsCreateDialogOpen(false)}
                selectedChannels={selectedChannels}
                setSelectedChannels={setSelectedChannels}
                selectedRecipients={selectedRecipients}
                setSelectedRecipients={setSelectedRecipients}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Alerts Banner */}
      {communicationData.activeAlerts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-800">
            <strong>{communicationData.activeAlerts.length} active emergency alert(s)</strong> are currently broadcasting.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages This Week</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{communicationData.stats.messagesThisWeek}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{communicationData.stats.totalRecipients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{communicationData.stats.averageResponse}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
            <Radio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{communicationData.stats.activeChannels}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="active">Active Alerts</TabsTrigger>
          <TabsTrigger value="history">Message History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-red-500" />
                  Active Emergency Alerts
                </CardTitle>
                <CardDescription>Currently broadcasting alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {communicationData.activeAlerts.map((alert) => (
                    <div key={alert.id} className="border border-red-200 rounded-lg p-3 bg-red-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <span className="font-medium">{alert.type}</span>
                          </div>
                          <div className="font-semibold mt-1">{alert.title}</div>
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                      <p className="text-sm mb-2">{alert.message}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span>Recipients: {alert.recipients}</span>
                          <span>Acknowledged: {alert.acknowledged}</span>
                        </div>
                        <div className="flex gap-1">
                          {alert.channels.map((channel) => (
                            <div key={channel} className="flex items-center gap-1">
                              {getChannelIcon(channel)}
                              <span>{channel}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {communicationData.activeAlerts.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      No active emergency alerts
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common emergency communication actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start bg-red-600 hover:bg-red-700" size="lg">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Send Critical Alert
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="lg">
                    <Bell className="h-4 w-4 mr-2" />
                    Test Alert System
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="lg">
                    <Volume2 className="h-4 w-4 mr-2" />
                    PA Announcement
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="lg">
                    <Users className="h-4 w-4 mr-2" />
                    Contact Emergency Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>Latest communications sent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {communicationData.recentMessages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{message.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {message.type} • {new Date(message.sentAt).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {message.recipients} recipients • {message.acknowledged} acknowledged
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {message.channels.map((channel) => (
                          <div key={channel} className="flex items-center gap-1 text-xs">
                            {getChannelIcon(channel)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Emergency Alerts</CardTitle>
              <CardDescription>Monitor and manage currently broadcasting alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {communicationData.activeAlerts.map((alert) => (
                  <div key={alert.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <span className="font-semibold">{alert.id}</span>
                          <span className="font-medium">{alert.type}</span>
                        </div>
                        <div className="font-semibold text-lg">{alert.title}</div>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-sm">{alert.message}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Sent:</span>
                        <br />
                        {new Date(alert.sentAt).toLocaleString()}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Recipients:</span>
                        <br />
                        {alert.recipients}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Acknowledged:</span>
                        <br />
                        {alert.acknowledged} ({Math.round((alert.acknowledged / alert.recipients) * 100)}%)
                      </div>
                      <div>
                        <span className="text-muted-foreground">Channels:</span>
                        <br />
                        <div className="flex gap-1 mt-1">
                          {alert.channels.map((channel) => (
                            <div key={channel} className="flex items-center gap-1">
                              {getChannelIcon(channel)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                      <Button size="sm" variant="outline">
                        <Send className="h-3 w-3 mr-1" />
                        Resend
                      </Button>
                      <Button size="sm" variant="outline">
                        <Bell className="h-3 w-3 mr-1" />
                        Update
                      </Button>
                      <Button size="sm" variant="destructive">
                        Stop Broadcasting
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Emergency Message Templates</CardTitle>
                  <CardDescription>Pre-configured emergency communication templates</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {communicationData.templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold">{template.name}</div>
                        <div className="text-sm text-muted-foreground">{template.category}</div>
                      </div>
                      <Badge variant="outline">Used {template.usage}x</Badge>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-sm bg-muted p-2 rounded">{template.message}</p>
                    </div>
                    
                    {template.variables.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm text-muted-foreground">Variables:</div>
                        <div className="flex gap-1 mt-1">
                          {template.variables.map((variable) => (
                            <Badge key={variable} variant="secondary" className="text-xs">
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                      <Button size="sm">
                        <Send className="h-3 w-3 mr-1" />
                        Use Template
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateAlertForm({ 
  onClose, 
  selectedChannels, 
  setSelectedChannels, 
  selectedRecipients, 
  setSelectedRecipients 
}: { 
  onClose: () => void;
  selectedChannels: string[];
  setSelectedChannels: (channels: string[]) => void;
  selectedRecipients: string[];
  setSelectedRecipients: (recipients: string[]) => void;
}) {
  const handleChannelChange = (channel: string, checked: boolean) => {
    if (checked) {
      setSelectedChannels([...selectedChannels, channel]);
    } else {
      setSelectedChannels(selectedChannels.filter(c => c !== channel));
    }
  };

  const handleRecipientChange = (recipient: string, checked: boolean) => {
    if (checked) {
      setSelectedRecipients([...selectedRecipients, recipient]);
    } else {
      setSelectedRecipients(selectedRecipients.filter(r => r !== recipient));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="alertType">Alert Type</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select alert type" />
            </SelectTrigger>
            <SelectContent>
              {messageTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label htmlFor="title">Alert Title</Label>
        <Input id="title" placeholder="Brief alert title" />
      </div>
      
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea 
          id="message" 
          placeholder="Detailed alert message"
          rows={4}
        />
      </div>
      
      <div>
        <Label>Communication Channels</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {channels.map((channel) => (
            <div key={channel} className="flex items-center space-x-2">
              <Checkbox 
                id={channel}
                checked={selectedChannels.includes(channel)}
                onCheckedChange={(checked) => handleChannelChange(channel, checked as boolean)}
              />
              <label htmlFor={channel} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {channel}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <Label>Recipients</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {recipientGroups.map((group) => (
            <div key={group} className="flex items-center space-x-2">
              <Checkbox 
                id={group}
                checked={selectedRecipients.includes(group)}
                onCheckedChange={(checked) => handleRecipientChange(group, checked as boolean)}
              />
              <label htmlFor={group} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {group}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <AlertDescription className="text-red-800">
          This will send an emergency alert to selected recipients. Ensure the message is accurate before sending.
        </AlertDescription>
      </Alert>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button className="bg-red-600 hover:bg-red-700" onClick={onClose}>
          <Send className="h-4 w-4 mr-2" />
          Send Emergency Alert
        </Button>
      </div>
    </div>
  );
}
