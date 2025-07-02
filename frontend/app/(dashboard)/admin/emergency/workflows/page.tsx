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
import { 
  List, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Copy, 
  FileText, 
  Clock, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Settings,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Download
} from 'lucide-react';

// Mock workflow data
const workflowsData = [
  {
    id: 'WF-001',
    name: 'Fire Emergency Response',
    category: 'Safety',
    priority: 'Critical',
    status: 'Active',
    description: 'Complete fire emergency response protocol including evacuation and safety measures',
    steps: [
      { id: 1, title: 'Sound fire alarm', duration: '1 min', responsible: 'Any Staff' },
      { id: 2, title: 'Call fire department', duration: '2 min', responsible: 'Designated Staff' },
      { id: 3, title: 'Announce evacuation', duration: '1 min', responsible: 'Fire Warden' },
      { id: 4, title: 'Guide people to exits', duration: '5 min', responsible: 'All Staff' },
      { id: 5, title: 'Check all areas', duration: '3 min', responsible: 'Fire Warden' },
      { id: 6, title: 'Account for all personnel', duration: '5 min', responsible: 'HR Manager' },
      { id: 7, title: 'Meet fire department', duration: '2 min', responsible: 'Building Manager' },
      { id: 8, title: 'Coordinate response', duration: 'Ongoing', responsible: 'Incident Commander' }
    ],
    estimatedTime: '15-20 minutes',
    lastUpdated: '2024-01-08',
    createdBy: 'Sarah Johnson',
    usageCount: 3
  },
  {
    id: 'WF-002',
    name: 'Medical Emergency Protocol',
    category: 'Health',
    priority: 'High',
    status: 'Active',
    description: 'Immediate response protocol for medical emergencies on premises',
    steps: [
      { id: 1, title: 'Assess the situation', duration: '1 min', responsible: 'First Responder' },
      { id: 2, title: 'Call emergency services', duration: '2 min', responsible: 'Any Staff' },
      { id: 3, title: 'Provide first aid if trained', duration: '5 min', responsible: 'Certified Staff' },
      { id: 4, title: 'Clear the area', duration: '2 min', responsible: 'Any Staff' },
      { id: 5, title: 'Meet paramedics', duration: '3 min', responsible: 'Designated Staff' },
      { id: 6, title: 'Document incident', duration: '10 min', responsible: 'Manager' }
    ],
    estimatedTime: '10-15 minutes',
    lastUpdated: '2024-01-07',
    createdBy: 'Dr. Wilson',
    usageCount: 1
  },
  {
    id: 'WF-003',
    name: 'Evacuation Procedure',
    category: 'Safety',
    priority: 'Critical',
    status: 'Active',
    description: 'General evacuation procedure for various emergency situations',
    steps: [
      { id: 1, title: 'Activate alarm system', duration: '1 min', responsible: 'Security' },
      { id: 2, title: 'Announce evacuation', duration: '2 min', responsible: 'Management' },
      { id: 3, title: 'Assist disabled persons', duration: '3 min', responsible: 'Designated Staff' },
      { id: 4, title: 'Check all rooms', duration: '5 min', responsible: 'Floor Wardens' },
      { id: 5, title: 'Proceed to assembly point', duration: '5 min', responsible: 'All Staff' },
      { id: 6, title: 'Take attendance', duration: '3 min', responsible: 'Department Heads' },
      { id: 7, title: 'Report to emergency services', duration: '2 min', responsible: 'Building Manager' }
    ],
    estimatedTime: '20-25 minutes',
    lastUpdated: '2024-01-05',
    createdBy: 'Security Team',
    usageCount: 0
  },
  {
    id: 'WF-004',
    name: 'IT System Failure Response',
    category: 'Technical',
    priority: 'Medium',
    status: 'Draft',
    description: 'Response protocol for critical IT system failures',
    steps: [
      { id: 1, title: 'Identify affected systems', duration: '2 min', responsible: 'IT Staff' },
      { id: 2, title: 'Activate backup systems', duration: '5 min', responsible: 'IT Manager' },
      { id: 3, title: 'Notify stakeholders', duration: '3 min', responsible: 'IT Manager' },
      { id: 4, title: 'Begin system recovery', duration: '15 min', responsible: 'IT Team' },
      { id: 5, title: 'Test system functionality', duration: '5 min', responsible: 'IT Staff' }
    ],
    estimatedTime: '30-45 minutes',
    lastUpdated: '2024-01-03',
    createdBy: 'IT Department',
    usageCount: 2
  }
];

const categories = ['All', 'Safety', 'Health', 'Technical', 'Security'];
const priorities = ['Critical', 'High', 'Medium', 'Low'];
const statuses = ['Active', 'Draft', 'Archived'];

export default function EmergencyWorkflows() {
  const [workflows, setWorkflows] = useState(workflowsData);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || workflow.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
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
        return 'default';
      case 'draft':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <List className="h-8 w-8" />
            Emergency Workflows
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage emergency response procedures and protocols
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Emergency Workflow</DialogTitle>
                <DialogDescription>
                  Define a new emergency response procedure
                </DialogDescription>
              </DialogHeader>
              <CreateWorkflowForm onClose={() => setIsCreateDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.filter(w => w.status === 'Active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.filter(w => w.priority === 'Critical').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.reduce((sum, w) => sum + w.usageCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search workflows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Workflows List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredWorkflows.map((workflow) => (
          <Card key={workflow.id} className="h-fit">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {workflow.description}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getPriorityColor(workflow.priority)}>
                    {workflow.priority}
                  </Badge>
                  <Badge variant={getStatusColor(workflow.status)}>
                    {workflow.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{workflow.steps.length} steps</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{workflow.estimatedTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Used {workflow.usageCount} times</span>
                </div>
                <div className="text-muted-foreground">
                  Updated: {workflow.lastUpdated}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedWorkflow(workflow)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>{selectedWorkflow?.name}</DialogTitle>
                      <DialogDescription>
                        {selectedWorkflow?.description}
                      </DialogDescription>
                    </DialogHeader>
                    {selectedWorkflow && <WorkflowDetails workflow={selectedWorkflow} />}
                  </DialogContent>
                </Dialog>
                
                <Button size="sm" variant="outline">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="outline">
                  <Copy className="h-3 w-3 mr-1" />
                  Clone
                </Button>
                <Button size="sm">
                  <Play className="h-3 w-3 mr-1" />
                  Start
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CreateWorkflowForm({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Workflow Name</Label>
          <Input id="name" placeholder="Enter workflow name" />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.slice(1).map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {priorities.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="estimatedTime">Estimated Time</Label>
          <Input id="estimatedTime" placeholder="e.g., 15-20 minutes" />
        </div>
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea 
          id="description" 
          placeholder="Describe the purpose and scope of this workflow"
          rows={3}
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onClose}>
          Create Workflow
        </Button>
      </div>
    </div>
  );
}

function WorkflowDetails({ workflow }: { workflow: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <p className="text-sm text-muted-foreground">{workflow.category}</p>
        </div>
        <div>
          <Label>Priority</Label>
          <Badge variant={workflow.priority === 'Critical' ? 'destructive' : 'default'}>
            {workflow.priority}
          </Badge>
        </div>
        <div>
          <Label>Estimated Time</Label>
          <p className="text-sm text-muted-foreground">{workflow.estimatedTime}</p>
        </div>
        <div>
          <Label>Usage Count</Label>
          <p className="text-sm text-muted-foreground">{workflow.usageCount} times</p>
        </div>
      </div>
      
      <div>
        <Label>Workflow Steps</Label>
        <div className="space-y-3 mt-2">
          {workflow.steps.map((step: any, index: number) => (
            <div key={step.id} className="border rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{step.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Duration: {step.duration} • Responsible: {step.responsible}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
