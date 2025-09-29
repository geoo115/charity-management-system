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
import { Zap, Plus, Clock, MapPin, User, Phone, MessageSquare, AlertTriangle, CheckCircle, XCircle, Eye, Edit, Play, Activity, Users, Calendar, Timer, AlertCircle, Monitor, Filter } from 'lucide-react';

// Mock incidents data
const incidentsData = [
  {
    id: 'INC-001',
    title: 'Fire Emergency - Storage Area',
    type: 'Fire',
    severity: 'Critical',
    status: 'Active',
    location: 'Main Building - Storage Room A',
    description: 'Smoke detected in storage area. Fire alarm activated. Evacuation in progress.',
    reportedBy: 'John Smith',
    reportedAt: '2024-01-10T14:30:00Z',
    assignedTo: ['Fire Warden', 'Building Manager'],
    timelineEntries: [
      { time: '14:30', action: 'Incident reported', user: 'John Smith' },
      { time: '14:31', action: 'Fire alarm activated', user: 'System' },
      { time: '14:32', action: 'Evacuation announced', user: 'Fire Warden' },
      { time: '14:35', action: 'Fire department called', user: 'Security' },
      { time: '14:40', action: 'All personnel accounted for', user: 'HR Manager' }
    ],
    priority: 1,
    estimatedResolution: '2024-01-10T16:00:00Z'
  },
  {
    id: 'INC-002',
    title: 'Medical Emergency - Volunteer Injury',
    type: 'Medical',
    severity: 'High',
    status: 'Responding',
    location: 'Distribution Center - Sorting Area',
    description: 'Volunteer injured while lifting heavy boxes. First aid administered.',
    reportedBy: 'Sarah Connor',
    reportedAt: '2024-01-10T15:45:00Z',
    assignedTo: ['Dr. Wilson', 'Floor Manager'],
    timelineEntries: [
      { time: '15:45', action: 'Injury reported', user: 'Sarah Connor' },
      { time: '15:46', action: 'First aid administered', user: 'Dr. Wilson' },
      { time: '15:48', action: 'Ambulance called', user: 'Reception' },
      { time: '15:52', action: 'Family contacted', user: 'HR Department' }
    ],
    priority: 2,
    estimatedResolution: '2024-01-10T17:00:00Z'
  },
  {
    id: 'INC-003',
    title: 'Security Breach - Unauthorized Access',
    type: 'Security',
    severity: 'Medium',
    status: 'Investigating',
    location: 'Office Building - 2nd Floor',
    description: 'Motion sensors triggered in secured area after hours.',
    reportedBy: 'Security System',
    reportedAt: '2024-01-10T22:15:00Z',
    assignedTo: ['Security Team', 'IT Support'],
    timelineEntries: [
      { time: '22:15', action: 'Motion detected', user: 'Security System' },
      { time: '22:16', action: 'Security team notified', user: 'System' },
      { time: '22:20', action: 'On-site investigation started', user: 'Security Guard' },
      { time: '22:25', action: 'CCTV footage reviewed', user: 'Security Team' }
    ],
    priority: 3,
    estimatedResolution: '2024-01-10T23:30:00Z'
  }
];

const incidentTypes = ['Fire', 'Medical', 'Security', 'Technical', 'Weather', 'Other'];
const severityLevels = ['Critical', 'High', 'Medium', 'Low'];
const statusOptions = ['Active', 'Responding', 'Investigating', 'Resolved', 'Cancelled'];

export default function ActiveIncidents() {
  const [incidents, setIncidents] = useState(incidentsData);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');

  const filteredIncidents = incidents.filter(incident => 
    filterStatus === 'All' || incident.status === filterStatus
  );

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'destructive';
      case 'responding':
        return 'default';
      case 'investigating':
        return 'default';
      case 'resolved':
        return 'secondary';
      case 'cancelled':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getTimeElapsed = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000 / 60);
    
    if (diff < 60) {
      return `${diff}m ago`;
    } else {
      const hours = Math.floor(diff / 60);
      const minutes = diff % 60;
      return `${hours}h ${minutes}m ago`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-red-500" />
            Active Incidents
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage ongoing emergency situations
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Report New Incident</DialogTitle>
                <DialogDescription>
                  Create a new emergency incident report
                </DialogDescription>
              </DialogHeader>
              <CreateIncidentForm onClose={() => setIsCreateDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alert for Active Incidents */}
      {incidents.filter(i => i.status === 'Active').length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-800">
            <strong>{incidents.filter(i => i.status === 'Active').length} critical incident(s)</strong> require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active</CardTitle>
            <Activity className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidents.filter(i => i.status !== 'Resolved').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incidents.filter(i => i.severity === 'Critical').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responding</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incidents.filter(i => i.status === 'Responding').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6m</div>
            <p className="text-xs text-muted-foreground">Response time</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label>Filter by Status:</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Incidents List */}
      <div className="space-y-4">
        {filteredIncidents.map((incident) => (
          <Card key={incident.id} className={`${incident.severity === 'Critical' ? 'border-red-200' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityColor(incident.severity)}>
                      {incident.severity}
                    </Badge>
                    <Badge variant={getStatusColor(incident.status)}>
                      {incident.status}
                    </Badge>
                    <span className="font-semibold">{incident.id}</span>
                  </div>
                  <CardTitle className="text-xl">{incident.title}</CardTitle>
                  <CardDescription>{incident.description}</CardDescription>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>{getTimeElapsed(incident.reportedAt)}</div>
                  <div>Priority: {incident.priority}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{incident.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Reported by: {incident.reportedBy}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Assigned: {incident.assignedTo.join(', ')}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Est. resolution: {new Date(incident.estimatedResolution).toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedIncident(incident)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>{selectedIncident?.title}</DialogTitle>
                        <DialogDescription>
                          Incident {selectedIncident?.id} - {selectedIncident?.type}
                        </DialogDescription>
                      </DialogHeader>
                      {selectedIncident && <IncidentDetails incident={selectedIncident} />}
                    </DialogContent>
                  </Dialog>
                  
                  <Button size="sm" variant="outline">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Update
                  </Button>
                  
                  {incident.status !== 'Resolved' && (
                    <Button size="sm">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CreateIncidentForm({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Incident Title</Label>
          <Input id="title" placeholder="Brief description of incident" />
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select incident type" />
            </SelectTrigger>
            <SelectContent>
              {incidentTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="severity">Severity</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              {severityLevels.map((severity) => (
                <SelectItem key={severity} value={severity}>
                  {severity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" placeholder="Where is the incident occurring?" />
        </div>
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea 
          id="description" 
          placeholder="Detailed description of the incident"
          rows={3}
        />
      </div>
      
      <div>
        <Label htmlFor="reportedBy">Reported By</Label>
        <Input id="reportedBy" placeholder="Your name" />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onClose}>
          Report Incident
        </Button>
      </div>
    </div>
  );
}

function IncidentDetails({ incident }: { incident: any }) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="actions">Actions</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Incident ID</Label>
            <p className="text-sm text-muted-foreground">{incident.id}</p>
          </div>
          <div>
            <Label>Type</Label>
            <p className="text-sm text-muted-foreground">{incident.type}</p>
          </div>
          <div>
            <Label>Severity</Label>
            <Badge variant={incident.severity === 'Critical' ? 'destructive' : 'default'}>
              {incident.severity}
            </Badge>
          </div>
          <div>
            <Label>Status</Label>
            <Badge variant="default">{incident.status}</Badge>
          </div>
          <div>
            <Label>Location</Label>
            <p className="text-sm text-muted-foreground">{incident.location}</p>
          </div>
          <div>
            <Label>Priority</Label>
            <p className="text-sm text-muted-foreground">Priority {incident.priority}</p>
          </div>
        </div>
        
        <div>
          <Label>Description</Label>
          <p className="text-sm text-muted-foreground mt-1">{incident.description}</p>
        </div>
        
        <div>
          <Label>Assigned Personnel</Label>
          <div className="flex gap-2 mt-1">
            {incident.assignedTo.map((person: string) => (
              <Badge key={person} variant="outline">{person}</Badge>
            ))}
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="timeline" className="space-y-4">
        <div className="space-y-3">
          {incident.timelineEntries.map((entry: any, index: number) => (
            <div key={index} className="border-l-2 border-muted pl-4 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{entry.time}</span>
                <span className="text-sm text-muted-foreground">by {entry.user}</span>
              </div>
              <p className="text-sm">{entry.action}</p>
            </div>
          ))}
        </div>
      </TabsContent>
      
      <TabsContent value="actions" className="space-y-4">
        <div className="space-y-4">
          <div>
            <Label>Add Update</Label>
            <Textarea placeholder="Add a status update or note..." rows={3} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Change Status</Label>
              <Select defaultValue={incident.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign To</Label>
              <Input placeholder="Add personnel" />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline">
              <Phone className="h-4 w-4 mr-2" />
              Contact Emergency Services
            </Button>
            <Button>
              Save Update
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
