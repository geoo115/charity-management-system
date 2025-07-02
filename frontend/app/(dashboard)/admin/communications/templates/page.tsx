'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Eye,
  Search, 
  Filter,
  MoreHorizontal,
  Save,
  X,
  Tag,
  Mail,
  MessageSquare,
  Users,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Code,
  Palette,
  Globe,
  Settings,
  Bell,
  Monitor
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';
import { formatDistanceToNow } from 'date-fns';

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  content: string;
  variables: string[];
  isActive: boolean;
  usageCount: number;
  lastUsed?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  language: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
}

interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

const TEMPLATE_CATEGORIES = [
  'onboarding',
  'verification',
  'volunteers',
  'help-requests',
  'donations',
  'system',
  'general'
];

const COMMON_VARIABLES: TemplateVariable[] = [
  { name: 'name', description: 'User\'s full name', required: true },
  { name: 'first_name', description: 'User\'s first name', required: true },
  { name: 'email', description: 'User\'s email address', required: true },
  { name: 'date', description: 'Current date', required: false },
  { name: 'site_name', description: 'Website name', required: false, defaultValue: 'Lewishame Charity' },
  { name: 'support_email', description: 'Support email address', required: false, defaultValue: 'support@lewishamCharity.org' }
];

export default function TemplatesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<MessageTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: '',
    subject: '',
    content: '',
    type: 'email' as 'email' | 'sms' | 'push' | 'in_app',
    language: 'en',
    isActive: true,
    variables: [] as string[]
  });

  useEffect(() => {
    if (user?.role === 'Admin') {
      console.log('User is admin, loading templates...');
      loadTemplates();
    } else if (user && user.role) {
      console.log('User is not admin:', user.role);
      toast({
        title: 'Access Denied',
        description: 'Admin access required to view templates',
        variant: 'destructive',
      });
    } else if (user === null) {
      console.log('User is null, not authenticated');
    } else {
      console.log('User is still loading...');
    }
  }, [user]);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, categoryFilter, typeFilter, activeFilter]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      // Get token with better error handling
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (!token) {
        console.log('No authentication token found');
        setTemplates([]);
        return;
      }

      console.log('Loading templates for user:', user?.role);
      
      // Fetch real templates from API
      const response = await fetch('/api/v1/admin/communications/templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const templatesData = await response.json();
        console.log('Templates loaded successfully:', templatesData);
        setTemplates(templatesData.templates || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch templates:', response.status, errorData);
        
        if (response.status === 401) {
          toast({
            title: 'Authentication Error',
            description: 'Your session has expired. Please log in again.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: 'Failed to load templates',
            variant: 'destructive',
          });
        }
        setTemplates([]);
      }
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(template => template.category === categoryFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(template => template.type === typeFilter);
    }

    if (activeFilter !== 'all') {
      filtered = filtered.filter(template => 
        activeFilter === 'active' ? template.isActive : !template.isActive
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleCreateTemplate = async () => {
    try {
      // Check if user is authenticated
      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'Please log in to create templates',
          variant: 'destructive',
        });
        return;
      }

      // Get token with better error handling
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in again to continue',
          variant: 'destructive',
        });
        return;
      }

      console.log('Creating template with data:', templateForm);
      console.log('User role:', user.role);

      // API call to create template
      const response = await fetch('/api/v1/admin/communications/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(templateForm)
      });

      const responseData = await response.json();
      console.log('Template creation response:', responseData);

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Template created successfully',
        });
        setShowCreateDialog(false);
        resetForm();
        loadTemplates();
      } else {
        // Handle specific error cases
        if (response.status === 401) {
          toast({
            title: 'Authentication Error',
            description: 'Your session has expired. Please log in again.',
            variant: 'destructive',
          });
        } else if (response.status === 403) {
          toast({
            title: 'Permission Error',
            description: 'You do not have permission to create templates.',
            variant: 'destructive',
          });
        } else {
          throw new Error(responseData.error || 'Failed to create template');
        }
      }
    } catch (error: any) {
      console.error('Template creation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create template',
        variant: 'destructive',
      });
    }
  };

  const handleEditTemplate = async () => {
    try {
      if (!editingTemplate) return;

      // API call to update template
      const response = await fetch(`/api/v1/admin/communications/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(templateForm)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Template updated successfully',
        });
        setShowEditDialog(false);
        setEditingTemplate(null);
        resetForm();
        loadTemplates();
      } else {
        throw new Error('Failed to update template');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update template',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/v1/admin/communications/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Template deleted successfully',
        });
        loadTemplates();
      } else {
        throw new Error('Failed to delete template');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateTemplate = (template: MessageTemplate) => {
    setTemplateForm({
      name: `${template.name} (Copy)`,
      category: template.category,
      subject: template.subject,
      content: template.content,
      type: template.type,
      language: template.language,
      isActive: template.isActive,
      variables: [...template.variables]
    });
    setShowCreateDialog(true);
  };

  const openEditDialog = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      category: template.category,
      subject: template.subject,
      content: template.content,
      type: template.type,
      language: template.language,
      isActive: template.isActive,
      variables: [...template.variables]
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setTemplateForm({
      name: '',
      category: '',
      subject: '',
      content: '',
      type: 'email',
      language: 'en',
      isActive: true,
      variables: []
    });
  };

  const extractVariables = (content: string): string[] => {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    let match;
    
    while ((match = variableRegex.exec(content)) !== null) {
      variables.add(match[1].trim());
    }
    
    return Array.from(variables);
  };

  const handleContentChange = (content: string) => {
    const variables = extractVariables(content);
    setTemplateForm({
      ...templateForm,
      content,
      variables
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'push':
        return <Bell className="h-4 w-4" />;
      case 'in_app':
        return <Monitor className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email':
        return 'default';
      case 'sms':
        return 'secondary';
      case 'push':
        return 'outline';
      case 'in_app':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading templates..." />;
  }

  return (
    <div className="space-y-6">
      {/* Debug Section - Remove after fixing */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>User:</strong> {user ? `${user.first_name} ${user.last_name}` : 'Not loaded'}
              </div>
              <div>
                <strong>Role:</strong> {user?.role || 'Unknown'}
              </div>
              <div>
                <strong>User ID:</strong> {user?.id || 'Not set'}
              </div>
              <div>
                <strong>Token Available:</strong> {(localStorage.getItem('token') || localStorage.getItem('auth_token')) ? 'Yes' : 'No'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Message Templates</h1>
          <p className="text-muted-foreground">
            Create and manage reusable message templates for communications
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" asChild>
            <Link href="/admin/communications">
              ← Back to Communications
            </Link>
          </Button>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="category-filter">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {TEMPLATE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
                  <SelectItem value="in_app">In-App</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="active-filter">Status</Label>
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={loadTemplates}>
                <Search className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            {filteredTemplates.length} of {templates.length} templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {template.subject}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {template.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTypeColor(template.type) as any} className="flex items-center gap-1 w-fit">
                      {getTypeIcon(template.type)}
                      {template.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.slice(0, 3).map((variable, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                      {template.variables.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.variables.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{template.usageCount} times</div>
                      {template.lastUsed && (
                        <div className="text-xs text-muted-foreground">
                          Last: {formatDistanceToNow(new Date(template.lastUsed), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {template.isActive ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm">
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
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
                        <DropdownMenuItem onClick={() => openEditDialog(template)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
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

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a reusable message template with variables
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                  placeholder="Enter template name..."
                />
              </div>

              <div>
                <Label htmlFor="template-category">Category</Label>
                <Select 
                  value={templateForm.category} 
                  onValueChange={(value) => setTemplateForm({...templateForm, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="template-type">Template Type</Label>
                <Select 
                  value={templateForm.type} 
                  onValueChange={(value: any) => setTemplateForm({...templateForm, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="push">Push Notification</SelectItem>
                    <SelectItem value="in_app">In-App Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="template-subject">Subject</Label>
                <Input
                  id="template-subject"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({...templateForm, subject: e.target.value})}
                  placeholder="Enter subject line..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={templateForm.isActive}
                  onCheckedChange={(checked) => setTemplateForm({...templateForm, isActive: checked})}
                />
                <Label>Active Template</Label>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-content">Template Content</Label>
                <Textarea
                  id="template-content"
                  value={templateForm.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Enter template content with {{variables}}..."
                  rows={10}
                />
              </div>

              {templateForm.variables.length > 0 && (
                <div>
                  <Label>Detected Variables</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {templateForm.variables.map((variable, index) => (
                      <Badge key={index} variant="secondary">
                        <Code className="h-3 w-3 mr-1" />
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Common Variables</Label>
                <div className="grid gap-2 mt-2">
                  {COMMON_VARIABLES.map((variable) => (
                    <div key={variable.name} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium text-sm">{variable.name}</div>
                        <div className="text-xs text-muted-foreground">{variable.description}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newContent = templateForm.content + `{{${variable.name}}}`;
                          handleContentChange(newContent);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate}>
              <Save className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update the template content and settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-template-name">Template Name</Label>
                <Input
                  id="edit-template-name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                  placeholder="Enter template name..."
                />
              </div>

              <div>
                <Label htmlFor="edit-template-category">Category</Label>
                <Select 
                  value={templateForm.category} 
                  onValueChange={(value) => setTemplateForm({...templateForm, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-template-type">Template Type</Label>
                <Select 
                  value={templateForm.type} 
                  onValueChange={(value: any) => setTemplateForm({...templateForm, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="push">Push Notification</SelectItem>
                    <SelectItem value="in_app">In-App Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-template-subject">Subject</Label>
                <Input
                  id="edit-template-subject"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({...templateForm, subject: e.target.value})}
                  placeholder="Enter subject line..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={templateForm.isActive}
                  onCheckedChange={(checked) => setTemplateForm({...templateForm, isActive: checked})}
                />
                <Label>Active Template</Label>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-template-content">Template Content</Label>
                <Textarea
                  id="edit-template-content"
                  value={templateForm.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Enter template content with {{variables}}..."
                  rows={10}
                />
              </div>

              {templateForm.variables.length > 0 && (
                <div>
                  <Label>Detected Variables</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {templateForm.variables.map((variable, index) => (
                      <Badge key={index} variant="secondary">
                        <Code className="h-3 w-3 mr-1" />
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditingTemplate(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditTemplate}>
              <Save className="h-4 w-4 mr-2" />
              Update Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
