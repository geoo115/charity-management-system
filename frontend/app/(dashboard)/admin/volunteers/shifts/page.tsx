'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Upload,
  UserPlus,
  UserMinus,
  RotateCcw,
  Send,
  Eye,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/common/loading-spinner';
import { 
  getShifts,
  createShift,
  updateShift, 
  deleteShift,
  getShiftById,
  assignVolunteerToShift,
  reassignShift,
  markNoShow,
  bulkUpdateShifts,
  getVolunteerShiftHistory,
  getCoverageGaps,
  bulkAssignVolunteers,
  type Shift as ShiftType,
  type ShiftFilters as ShiftFiltersType,
  type CreateShiftData
} from '@/lib/api/shifts';
import { getVolunteers } from '@/lib/api/admin-comprehensive';

interface Shift {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  role: string;
  max_volunteers: number;
  required_skills: string;
  assigned_volunteer_id: number | null;
  assigned_volunteer?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  type: string;
  open_ended: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Volunteer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  skills: string[];
}

interface ShiftFilters {
  date?: Date;
  location?: string;
  role?: string;
  status?: string;
  volunteer?: string;
}

export default function ShiftManagementPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [filters, setFilters] = useState<ShiftFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showBulkDialog, setBulkDialog] = useState(false);
  const [selectedShifts, setSelectedShifts] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newShift, setNewShift] = useState({
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
    role: '',
    max_volunteers: 1,
    required_skills: '',
    type: 'fixed',
    open_ended: false
  });

  const [assignmentData, setAssignmentData] = useState({
    volunteer_id: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shiftsData, volunteersData] = await Promise.all([
        getShifts(),
        getVolunteers({ status: 'active' })
      ]);
      
      setShifts(shiftsData?.data || shiftsData || []);
      // Transform volunteers data to match local interface
      const transformedVolunteers = (volunteersData?.data || []).map((v: any) => ({
        id: v.user?.id || v.id,
        first_name: v.user?.first_name || v.first_name || '',
        last_name: v.user?.last_name || v.last_name || '',
        email: v.user?.email || v.email || '',
        status: v.status || 'active',
        skills: Array.isArray(v.skills) ? v.skills : []
      }));
      setVolunteers(transformedVolunteers);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async () => {
    try {
      const shiftData = {
        date: format(new Date(newShift.date), 'yyyy-MM-dd'),
        start_time: newShift.start_time,
        end_time: newShift.end_time,
        location: newShift.location,
        description: newShift.description,
        role: newShift.role,
        maxVolunteers: newShift.max_volunteers,
        requiredSkills: newShift.required_skills,
        type: newShift.type,
        openEnded: newShift.open_ended
      };

      await createShift(shiftData);
      setSuccess('Shift created successfully');
      setShowCreateDialog(false);
      setNewShift({
        date: '',
        start_time: '',
        end_time: '',
        location: '',
        description: '',
        role: '',
        max_volunteers: 1,
        required_skills: '',
        type: 'fixed',
        open_ended: false
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create shift');
    }
  };

  const handleAssignVolunteer = async () => {
    if (!selectedShift || !assignmentData.volunteer_id) return;

    try {
      await assignVolunteerToShift(selectedShift.id, parseInt(assignmentData.volunteer_id), assignmentData.notes);
      setSuccess('Volunteer assigned successfully');
      setShowAssignDialog(false);
      setAssignmentData({ volunteer_id: '', notes: '' });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to assign volunteer');
    }
  };

  const handleDeleteShift = async (shiftId: number) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;

    try {
      await deleteShift(shiftId);
      setSuccess('Shift deleted successfully');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete shift');
    }
  };

  const handleBulkUpdate = async (action: 'unassign' | 'cancel' | 'delete' | 'duplicate') => {
    if (selectedShifts.length === 0) return;

    try {
      await bulkUpdateShifts(selectedShifts, action);
      setSuccess(`${action} applied to ${selectedShifts.length} shifts`);
      setSelectedShifts([]);
      setBulkDialog(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update shifts');
    }
  };

  const filteredShifts = shifts.filter(shift => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        shift.location.toLowerCase().includes(searchLower) ||
        shift.role.toLowerCase().includes(searchLower) ||
        shift.description.toLowerCase().includes(searchLower) ||
        (shift.assigned_volunteer?.first_name || '').toLowerCase().includes(searchLower) ||
        (shift.assigned_volunteer?.last_name || '').toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Date filter
    if (filters.date) {
      const shiftDate = new Date(shift.date).toDateString();
      const filterDate = filters.date.toDateString();
      if (shiftDate !== filterDate) return false;
    }

    // Location filter
    if (filters.location && shift.location !== filters.location) return false;

    // Role filter
    if (filters.role && shift.role !== filters.role) return false;

    // Status filter
    if (filters.status) {
      const shiftStatus = shift.assigned_volunteer_id ? 'assigned' : 'unassigned';
      if (shiftStatus !== filters.status) return false;
    }

    // Tab filter
    if (activeTab === 'assigned' && !shift.assigned_volunteer_id) return false;
    if (activeTab === 'unassigned' && shift.assigned_volunteer_id) return false;
    if (activeTab === 'today') {
      const today = new Date().toDateString();
      const shiftDate = new Date(shift.date).toDateString();
      if (shiftDate !== today) return false;
    }

    return true;
  });

  const getShiftStatusBadge = (shift: Shift) => {
    if (shift.assigned_volunteer_id) {
      return <Badge variant="secondary">Assigned</Badge>;
    }
    const shiftDate = new Date(shift.date);
    const now = new Date();
    if (shiftDate < now) {
      return <Badge variant="destructive">Past</Badge>;
    }
    return <Badge variant="outline">Open</Badge>;
  };

  const getShiftTypeIcon = (type: string) => {
    switch (type) {
      case 'fixed': return <Clock className="h-4 w-4" />;
      case 'flexible': return <RotateCcw className="h-4 w-4" />;
      case 'open': return <Users className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const uniqueLocations = [...new Set(shifts.map(s => s.location))];
  const uniqueRoles = [...new Set(shifts.map(s => s.role))];

  if (loading) {
    return <LoadingSpinner message="Loading shift management..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shift Management</h1>
          <p className="text-muted-foreground">
            Manage volunteer shifts, assignments, and scheduling
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Button>
          <Button variant="outline" onClick={() => setBulkDialog(true)} disabled={selectedShifts.length === 0}>
            <Edit className="h-4 w-4 mr-2" />
            Bulk Actions ({selectedShifts.length})
          </Button>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search shifts, locations, roles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {filters.date ? format(filters.date, 'MMM dd, yyyy') : 'Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.date}
                    onSelect={(date) => setFilters({ ...filters, date: date || undefined })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Select value={filters.location || 'all'} onValueChange={(value) => setFilters({ ...filters, location: value === 'all' ? undefined : value })}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocations.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.role || 'all'} onValueChange={(value) => setFilters({ ...filters, role: value === 'all' ? undefined : value })}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.status || 'all'} onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value })}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => setFilters({})}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Shift Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Shifts ({shifts.length})</TabsTrigger>
          <TabsTrigger value="assigned">Assigned ({shifts.filter(s => s.assigned_volunteer_id).length})</TabsTrigger>
          <TabsTrigger value="unassigned">Unassigned ({shifts.filter(s => !s.assigned_volunteer_id).length})</TabsTrigger>
          <TabsTrigger value="today">Today ({shifts.filter(s => new Date(s.date).toDateString() === new Date().toDateString()).length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Shifts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShifts.map((shift) => (
              <Card key={shift.id} className={cn(
                "relative cursor-pointer transition-all hover:shadow-md",
                selectedShifts.includes(shift.id) && "ring-2 ring-primary"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedShifts.includes(shift.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedShifts([...selectedShifts, shift.id]);
                          } else {
                            setSelectedShifts(selectedShifts.filter(id => id !== shift.id));
                          }
                        }}
                        className="rounded"
                      />
                      {getShiftTypeIcon(shift.type)}
                      <div>
                        <CardTitle className="text-lg">{shift.role}</CardTitle>
                        <CardDescription>{format(new Date(shift.date), 'MMM dd, yyyy')}</CardDescription>
                      </div>
                    </div>
                    {getShiftStatusBadge(shift)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {shift.start_time} - {shift.end_time}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {shift.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {shift.assigned_volunteer_id ? 1 : 0} / {shift.max_volunteers} volunteers
                  </div>
                  
                  {shift.assigned_volunteer && (
                    <div className="p-2 bg-muted rounded-lg">
                      <p className="text-sm font-medium">
                        {shift.assigned_volunteer.first_name} {shift.assigned_volunteer.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{shift.assigned_volunteer.email}</p>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground line-clamp-2">{shift.description}</p>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedShift(shift);
                        setShowAssignDialog(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      {shift.assigned_volunteer_id ? 'Reassign' : 'Assign'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteShift(shift.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredShifts.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  <p>No shifts found matching your criteria</p>
                  <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                    Create First Shift
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Shift Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Shift</DialogTitle>
            <DialogDescription>
              Create a new volunteer shift with details and requirements.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={newShift.date}
                onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={newShift.role}
                onChange={(e) => setNewShift({ ...newShift, role: e.target.value })}
                placeholder="e.g., Food Distribution"
              />
            </div>
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={newShift.start_time}
                onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={newShift.end_time}
                onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={newShift.location}
                onChange={(e) => setNewShift({ ...newShift, location: e.target.value })}
                placeholder="e.g., Main Hall"
              />
            </div>
            <div>
              <Label htmlFor="max_volunteers">Max Volunteers</Label>
              <Input
                id="max_volunteers"
                type="number"
                min="1"
                max="20"
                value={newShift.max_volunteers}
                onChange={(e) => setNewShift({ ...newShift, max_volunteers: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newShift.description}
                onChange={(e) => setNewShift({ ...newShift, description: e.target.value })}
                placeholder="Describe the shift responsibilities..."
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="required_skills">Required Skills</Label>
              <Input
                id="required_skills"
                value={newShift.required_skills}
                onChange={(e) => setNewShift({ ...newShift, required_skills: e.target.value })}
                placeholder="e.g., Food handling, Customer service"
              />
            </div>
            <div>
              <Label htmlFor="type">Shift Type</Label>
              <Select value={newShift.type} onValueChange={(value) => setNewShift({ ...newShift, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Schedule</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                  <SelectItem value="open">Open Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="open_ended"
                checked={newShift.open_ended}
                onChange={(e) => setNewShift({ ...newShift, open_ended: e.target.checked })}
              />
              <Label htmlFor="open_ended">Open-ended shift</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateShift}>
              Create Shift
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Volunteer Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedShift?.assigned_volunteer_id ? 'Reassign' : 'Assign'} Volunteer
            </DialogTitle>
            <DialogDescription>
              {selectedShift?.assigned_volunteer_id 
                ? `Reassign this shift to a different volunteer` 
                : `Assign a volunteer to this shift`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedShift && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">{selectedShift.role}</h4>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedShift.date), 'MMM dd, yyyy')} • {selectedShift.start_time} - {selectedShift.end_time}
                </p>
                <p className="text-sm text-muted-foreground">{selectedShift.location}</p>
              </div>
            )}
            <div>
              <Label htmlFor="volunteer">Select Volunteer</Label>
              <Select value={assignmentData.volunteer_id} onValueChange={(value) => setAssignmentData({ ...assignmentData, volunteer_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a volunteer..." />
                </SelectTrigger>
                <SelectContent>
                  {volunteers.map(volunteer => (
                    <SelectItem key={volunteer.id} value={volunteer.id.toString()}>
                      {volunteer.first_name} {volunteer.last_name} ({volunteer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={assignmentData.notes}
                onChange={(e) => setAssignmentData({ ...assignmentData, notes: e.target.value })}
                placeholder="Any additional notes for this assignment..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignVolunteer}>
              {selectedShift?.assigned_volunteer_id ? 'Reassign' : 'Assign'} Volunteer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>
              Apply actions to {selectedShifts.length} selected shifts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handleBulkUpdate('unassign')}>
                <UserMinus className="h-4 w-4 mr-2" />
                Unassign All
              </Button>
              <Button variant="outline" onClick={() => handleBulkUpdate('cancel')}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel All
              </Button>
              <Button variant="outline" onClick={() => handleBulkUpdate('delete')}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </Button>
              <Button variant="outline" onClick={() => handleBulkUpdate('duplicate')}>
                <Plus className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBulkDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
