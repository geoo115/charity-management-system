'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  Users, 
  Calendar,
  Settings,
  Timer,
  Target,
  CheckCircle
} from 'lucide-react';

interface FlexibleShiftTemplate {
  id: number;
  name: string;
  description: string;
  minimumHours: number;
  maximumHours: number;
  timeSlotInterval: number; // in minutes
  allowedDays: string[];
  category: string;
  isActive: boolean;
  defaultCapacity: number;
  requirements?: string[];
  createdAt: string;
  usageCount: number;
}

export default function FlexibleShiftAdmin() {
  const [templates, setTemplates] = useState<FlexibleShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FlexibleShiftTemplate | null>(null);
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    minimumHours: 2,
    maximumHours: 8,
    timeSlotInterval: 30,
    allowedDays: [] as string[],
    category: 'general',
    isActive: true,
    defaultCapacity: 5,
    requirements: [] as string[]
  });

  const categories = [
    { value: 'general', label: 'General Support' },
    { value: 'events', label: 'Events & Programs' },
    { value: 'administrative', label: 'Administrative' },
    { value: 'community', label: 'Community Outreach' },
    { value: 'specialized', label: 'Specialized Tasks' }
  ];

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration - in real app, this would be an API call
      const mockTemplates: FlexibleShiftTemplate[] = [
        {
          id: 1,
          name: 'Food Bank Support',
          description: 'Flexible hours for food bank operations and distribution',
          minimumHours: 2,
          maximumHours: 6,
          timeSlotInterval: 30,
          allowedDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          category: 'general',
          isActive: true,
          defaultCapacity: 8,
          requirements: ['Physical tasks', 'Standing for extended periods'],
          createdAt: '2024-01-15',
          usageCount: 24
        },
        {
          id: 2,
          name: 'Administrative Tasks',
          description: 'Office work, data entry, and administrative support',
          minimumHours: 1,
          maximumHours: 4,
          timeSlotInterval: 60,
          allowedDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          category: 'administrative',
          isActive: true,
          defaultCapacity: 3,
          requirements: ['Computer literacy', 'Attention to detail'],
          createdAt: '2024-01-10',
          usageCount: 18
        },
        {
          id: 3,
          name: 'Community Events',
          description: 'Support for community events and special programs',
          minimumHours: 3,
          maximumHours: 8,
          timeSlotInterval: 30,
          allowedDays: ['Friday', 'Saturday', 'Sunday'],
          category: 'events',
          isActive: true,
          defaultCapacity: 12,
          requirements: ['Interpersonal skills', 'Flexibility'],
          createdAt: '2024-01-08',
          usageCount: 31
        }
      ];
      
      setTemplates(mockTemplates);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load flexible shift templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      // Validation
      if (!newTemplate.name.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Template name is required',
          variant: 'destructive'
        });
        return;
      }

      if (newTemplate.minimumHours >= newTemplate.maximumHours) {
        toast({
          title: 'Validation Error',
          description: 'Maximum hours must be greater than minimum hours',
          variant: 'destructive'
        });
        return;
      }

      // Mock creation - in real app, this would be an API call
      const template: FlexibleShiftTemplate = {
        id: Date.now(),
        ...newTemplate,
        createdAt: new Date().toISOString().split('T')[0],
        usageCount: 0
      };

      setTemplates(prev => [template, ...prev]);
      
      toast({
        title: 'Success',
        description: 'Flexible shift template created successfully'
      });
      
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateTemplate = async (template: FlexibleShiftTemplate) => {
    try {
      // Mock update - in real app, this would be an API call
      setTemplates(prev => prev.map(t => t.id === template.id ? template : t));
      
      toast({
        title: 'Success',
        description: 'Template updated successfully'
      });
      
      setEditingTemplate(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      // Mock deletion - in real app, this would be an API call
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
      toast({
        title: 'Success',
        description: 'Template deleted successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive'
      });
    }
  };

  const toggleTemplateStatus = async (templateId: number) => {
    try {
      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, isActive: !t.isActive } : t
      ));
      
      toast({
        title: 'Success',
        description: 'Template status updated'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update template status',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setNewTemplate({
      name: '',
      description: '',
      minimumHours: 2,
      maximumHours: 8,
      timeSlotInterval: 30,
      allowedDays: [],
      category: 'general',
      isActive: true,
      defaultCapacity: 5,
      requirements: []
    });
  };

  const handleDayToggle = (day: string, isSelected: boolean) => {
    if (editingTemplate) {
      setEditingTemplate(prev => {
        if (!prev) return null;
        const allowedDays = isSelected
          ? [...prev.allowedDays, day]
          : prev.allowedDays.filter(d => d !== day);
        return { ...prev, allowedDays };
      });
    } else {
      setNewTemplate(prev => {
        const allowedDays = isSelected
          ? [...prev.allowedDays, day]
          : prev.allowedDays.filter(d => d !== day);
        return { ...prev, allowedDays };
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Timer className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading flexible shift templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Flexible Shift Templates</h1>
          <p className="text-muted-foreground">
            Create and manage templates for flexible volunteer shifts
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Flexible Shift Template</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Food Bank Support"
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newTemplate.category} 
                    onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the shift type"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="minHours">Minimum Hours</Label>
                  <Input
                    id="minHours"
                    type="number"
                    min="1"
                    max="12"
                    value={newTemplate.minimumHours}
                    onChange={(e) => setNewTemplate(prev => ({ 
                      ...prev, 
                      minimumHours: parseInt(e.target.value) || 1 
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="maxHours">Maximum Hours</Label>
                  <Input
                    id="maxHours"
                    type="number"
                    min="1"
                    max="12"
                    value={newTemplate.maximumHours}
                    onChange={(e) => setNewTemplate(prev => ({ 
                      ...prev, 
                      maximumHours: parseInt(e.target.value) || 8 
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="capacity">Default Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    max="50"
                    value={newTemplate.defaultCapacity}
                    onChange={(e) => setNewTemplate(prev => ({ 
                      ...prev, 
                      defaultCapacity: parseInt(e.target.value) || 5 
                    }))}
                  />
                </div>
              </div>
              
              <div>
                <Label>Time Slot Interval</Label>
                <Select 
                  value={newTemplate.timeSlotInterval.toString()} 
                  onValueChange={(value) => setNewTemplate(prev => ({ 
                    ...prev, 
                    timeSlotInterval: parseInt(value) 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Allowed Days</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {daysOfWeek.map(day => (
                    <Label key={day} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTemplate.allowedDays.includes(day)}
                        onChange={(e) => handleDayToggle(day, e.target.checked)}
                      />
                      <span className="text-sm">{day.substring(0, 3)}</span>
                    </Label>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newTemplate.isActive}
                  onCheckedChange={(checked) => setNewTemplate(prev => ({ 
                    ...prev, 
                    isActive: checked 
                  }))}
                />
                <Label>Active Template</Label>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate}>
                  Create Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map(template => (
          <Card key={template.id} className={`relative ${!template.isActive ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {template.description}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingTemplate(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{categories.find(c => c.value === template.category)?.label}</Badge>
                {template.isActive ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{template.minimumHours}-{template.maximumHours}h</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{template.defaultCapacity} capacity</span>
                </div>
                <div className="flex items-center gap-1">
                  <Timer className="h-4 w-4" />
                  <span>{template.timeSlotInterval}min slots</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  <span>{template.usageCount} used</span>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Allowed Days:</p>
                <div className="flex flex-wrap gap-1">
                  {template.allowedDays.map(day => (
                    <Badge key={day} variant="outline" className="text-xs">
                      {day.substring(0, 3)}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-muted-foreground">
                  Created {template.createdAt}
                </span>
                <Switch
                  checked={template.isActive}
                  onCheckedChange={() => toggleTemplateStatus(template.id)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card className="p-8 text-center">
          <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first flexible shift template to get started
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </Card>
      )}

      {/* Edit Template Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template: {editingTemplate.name}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Template Name</Label>
                  <Input
                    id="edit-name"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate(prev => 
                      prev ? { ...prev, name: e.target.value } : null
                    )}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Select 
                    value={editingTemplate.category} 
                    onValueChange={(value) => setEditingTemplate(prev => 
                      prev ? { ...prev, category: value } : null
                    )}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate(prev => 
                    prev ? { ...prev, description: e.target.value } : null
                  )}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-minHours">Minimum Hours</Label>
                  <Input
                    id="edit-minHours"
                    type="number"
                    min="1"
                    max="12"
                    value={editingTemplate.minimumHours}
                    onChange={(e) => setEditingTemplate(prev => 
                      prev ? { 
                        ...prev, 
                        minimumHours: parseInt(e.target.value) || 1 
                      } : null
                    )}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-maxHours">Maximum Hours</Label>
                  <Input
                    id="edit-maxHours"
                    type="number"
                    min="1"
                    max="12"
                    value={editingTemplate.maximumHours}
                    onChange={(e) => setEditingTemplate(prev => 
                      prev ? { 
                        ...prev, 
                        maximumHours: parseInt(e.target.value) || 8 
                      } : null
                    )}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-capacity">Default Capacity</Label>
                  <Input
                    id="edit-capacity"
                    type="number"
                    min="1"
                    max="50"
                    value={editingTemplate.defaultCapacity}
                    onChange={(e) => setEditingTemplate(prev => 
                      prev ? { 
                        ...prev, 
                        defaultCapacity: parseInt(e.target.value) || 5 
                      } : null
                    )}
                  />
                </div>
              </div>
              
              <div>
                <Label>Allowed Days</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {daysOfWeek.map(day => (
                    <Label key={day} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTemplate.allowedDays.includes(day)}
                        onChange={(e) => handleDayToggle(day, e.target.checked)}
                      />
                      <span className="text-sm">{day.substring(0, 3)}</span>
                    </Label>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateTemplate(editingTemplate)}>
                  Update Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
