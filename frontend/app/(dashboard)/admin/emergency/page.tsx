'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Siren, 
  AlertTriangle, 
  Shield, 
  Users, 
  Clock, 
  Phone, 
  MessageSquare,
  Zap,
  Eye,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Settings,
  Bell,
  FileText,
  Activity,
  MapPin,
  User
} from 'lucide-react';

// Mock data - would come from API
const emergencyData = {
  activeIncidents: [
    {
      id: 'INC-001',
      type: 'Fire Emergency',
      severity: 'Critical',
      location: 'Main Building - Ground Floor',
      startTime: '2024-01-10T14:30:00Z',
      status: 'Active',
      assignedPersonnel: ['John Smith', 'Sarah Connor'],
      description: 'Smoke detected in storage area'
    },
    {
      id: 'INC-002',
      type: 'Medical Emergency',
      severity: 'High',
      location: 'Distribution Center',
      startTime: '2024-01-10T15:45:00Z',
      status: 'Responding',
      assignedPersonnel: ['Dr. Wilson'],
      description: 'Volunteer injured during goods sorting'
    }
  ],
  recentIncidents: [
    {
      id: 'INC-003',
      type: 'Power Outage',
      severity: 'Medium',
      location: 'IT Server Room',
      startTime: '2024-01-09T10:15:00Z',
      endTime: '2024-01-09T11:30:00Z',
      status: 'Resolved',
      duration: '1h 15m'
    }
  ],
  workflows: [
    {
      id: 'WF-001',
      name: 'Fire Emergency Response',
      category: 'Safety',
      lastUpdated: '2024-01-08',
      status: 'Active',
      steps: 8,
      estimatedTime: '15 minutes'
    },
    {
      id: 'WF-002',
      name: 'Medical Emergency Protocol',
      category: 'Health',
      lastUpdated: '2024-01-07',
      status: 'Active',
      steps: 6,
      estimatedTime: '10 minutes'
    },
    {
      id: 'WF-003',
      name: 'Evacuation Procedure',
      category: 'Safety',
      lastUpdated: '2024-01-05',
      status: 'Active',
      steps: 12,
      estimatedTime: '20 minutes'
    },
    {
      id: 'WF-004',
      name: 'IT System Failure Response',
      category: 'Technical',
      lastUpdated: '2024-01-03',
      status: 'Draft',
      steps: 10,
      estimatedTime: '30 minutes'
    }
  ],
  stats: {
    totalIncidents: 15,
    resolvedToday: 3,
    averageResponseTime: '8 minutes',
    activeWorkflows: 12
  }
};

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
    case 'resolved':
      return 'secondary';
    default:
      return 'default';
  }
};

export default function EmergencyDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Siren className="h-8 w-8 text-red-500" />
            Emergency Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage emergency procedures and incidents
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Test Alert System
          </Button>
          <Button size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {emergencyData.activeIncidents.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-800">
            <strong>{emergencyData.activeIncidents.length} active incident(s)</strong> require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emergencyData.stats.totalIncidents}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emergencyData.stats.resolvedToday}</div>
            <p className="text-xs text-muted-foreground">Incidents closed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emergencyData.stats.averageResponseTime}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emergencyData.stats.activeWorkflows}</div>
            <p className="text-xs text-muted-foreground">Ready for use</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="incidents">Active Incidents</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Incidents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-red-500" />
                  Active Incidents
                </CardTitle>
                <CardDescription>Incidents requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emergencyData.activeIncidents.map((incident) => (
                    <div key={incident.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getSeverityColor(incident.severity)}>
                              {incident.severity}
                            </Badge>
                            <span className="font-medium">{incident.type}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            {incident.location}
                          </div>
                        </div>
                        <Badge variant={getStatusColor(incident.status)}>
                          {incident.status}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2">{incident.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Started: {new Date(incident.startTime).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        {incident.assignedPersonnel.join(', ')}
                      </div>
                    </div>
                  ))}
                  {emergencyData.activeIncidents.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      No active incidents
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Workflows */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Emergency Workflows
                </CardTitle>
                <CardDescription>Available emergency response procedures</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emergencyData.workflows.slice(0, 3).map((workflow) => (
                    <div key={workflow.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{workflow.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {workflow.steps} steps • {workflow.estimatedTime}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={workflow.status === 'Active' ? 'default' : 'secondary'}>
                            {workflow.status}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Play className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full">
                    View All Workflows
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Incidents</CardTitle>
              <CardDescription>Monitor and manage ongoing emergency situations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emergencyData.activeIncidents.map((incident) => (
                  <div key={incident.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getSeverityColor(incident.severity)}>
                            {incident.severity}
                          </Badge>
                          <span className="font-semibold">{incident.id}</span>
                          <span className="font-medium">{incident.type}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {incident.location}
                        </div>
                      </div>
                      <Badge variant={getStatusColor(incident.status)}>
                        {incident.status}
                      </Badge>
                    </div>
                    <p className="mb-3">{incident.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(incident.startTime).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {incident.assignedPersonnel.join(', ')}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Update
                        </Button>
                        <Button size="sm">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Workflows</CardTitle>
              <CardDescription>Manage emergency response procedures and protocols</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {emergencyData.workflows.map((workflow) => (
                  <div key={workflow.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold">{workflow.name}</div>
                        <div className="text-sm text-muted-foreground">{workflow.category}</div>
                      </div>
                      <Badge variant={workflow.status === 'Active' ? 'default' : 'secondary'}>
                        {workflow.status}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div>{workflow.steps} steps</div>
                      <div>Est. time: {workflow.estimatedTime}</div>
                      <div>Updated: {workflow.lastUpdated}</div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm">
                        <Play className="h-3 w-3 mr-1" />
                        Start
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Incident History</CardTitle>
              <CardDescription>Review past emergency incidents and responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emergencyData.recentIncidents.map((incident) => (
                  <div key={incident.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">Resolved</Badge>
                          <span className="font-semibold">{incident.id}</span>
                          <span className="font-medium">{incident.type}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-2">
                          <MapPin className="h-4 w-4" />
                          {incident.location}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Duration: {incident.duration}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <FileText className="h-3 w-3 mr-1" />
                        Report
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
