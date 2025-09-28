'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { 
  getVolunteers, 
  approveVolunteer, 
  rejectVolunteer,
  Volunteer 
} from '@/lib/api/admin-comprehensive';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';
import { formatDistanceToNow } from 'date-fns';
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Search, 
  Filter,
  // Enhanced volunteer management icons
  UserCheck,
  UserPlus,
  UserX,
  Calendar,
  Clock,
  Award,
  Star,
  Target,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Settings,
  BookOpen,
  GraduationCap,
  Trophy,
  Medal,
  Zap,
  CheckCircle2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock4,
  Timer,
  MapPin,
  Phone,
  Mail,
  Globe,
  Heart,
  Users2,
  UserCog,
  Shield,
  ShieldCheck,
  Key,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Plus,
  Download,
  Upload,
  RefreshCw,
  MoreHorizontal,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Lightbulb,
  Brain,
  Workflow,
  Gauge,
  Database,
  Server,
  Wifi,
  Bell,
  BellOff,
  Flag,
  Tag,
  Bookmark,
  MessageSquare,
  FileText,
  Image,
  Video,
  Headphones,
  Mic,
  ChevronLeft,
  ChevronRight,
  CheckSquare
} from 'lucide-react';
import Link from 'next/link';

export default function AdminVolunteersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalVolunteers, setTotalVolunteers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkSelection, setBulkSelection] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    availability: 'all',
    skills: 'all',
  });
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (user?.role === 'Admin') {
      loadVolunteers();
    }
  }, [user, currentPage, filters]);

  const loadVolunteers = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await getVolunteers({
        page: currentPage,
        limit: 20,
        ...filters,
      });
      setVolunteers(response.data);
      setTotalVolunteers(response.pagination?.total || 0);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load volunteers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, filters, toast]);

  const handleApprove = async () => {
    if (!selectedVolunteer) return;

    try {
      // Use application_id if available, otherwise fallback to id
      const approvalId = selectedVolunteer.application_id || selectedVolunteer.id;
      await approveVolunteer(approvalId, approvalNotes);
      toast({
        title: 'Success',
        description: 'Volunteer approved successfully',
      });
      loadVolunteers();
      setShowApprovalDialog(false);
      setSelectedVolunteer(null);
      setApprovalNotes('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve volunteer',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!selectedVolunteer || !rejectionReason) return;

    try {
      // Use application_id if available, otherwise fallback to id
      const rejectionId = selectedVolunteer.application_id || selectedVolunteer.id;
      await rejectVolunteer(rejectionId, rejectionReason);
      toast({
        title: 'Success',
        description: 'Volunteer application rejected',
      });
      loadVolunteers();
      setShowRejectionDialog(false);
      setSelectedVolunteer(null);
      setRejectionReason('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject volunteer',
        variant: 'destructive',
      });
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || bulkSelection.length === 0) return;

    try {
      if (bulkAction === 'approve') {
        await Promise.all(
          bulkSelection.map((id: number) => {
            // Find the volunteer to get the application_id
            const volunteer = volunteers.find(v => v.id === id || v.user_id === id);
            const approvalId = volunteer?.application_id || id;
            return approveVolunteer(approvalId, 'Bulk approval');
          })
        );
        toast({
          title: 'Success',
          description: `${bulkSelection.length} volunteers approved successfully`,
        });
      } else if (bulkAction === 'reject') {
        await Promise.all(
          bulkSelection.map((id: number) => {
            // Find the volunteer to get the application_id
            const volunteer = volunteers.find(v => v.id === id || v.user_id === id);
            const rejectionId = volunteer?.application_id || id;
            return rejectVolunteer(rejectionId, 'Bulk rejection');
          })
        );
        toast({
          title: 'Success',
          description: `${bulkSelection.length} volunteers rejected`,
        });
      }
      
      setBulkSelection([]);
      setBulkAction('');
      setSelectAll(false);
      setShowBulkDialog(false);
      loadVolunteers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform bulk action',
        variant: 'destructive',
      });
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setBulkSelection([]);
      setSelectAll(false);
    } else {
      setBulkSelection(volunteers.map(vol => vol.id));
      setSelectAll(true);
    }
  };

  const handleSelectVolunteer = (id: number) => {
    setBulkSelection((prev: number[]) => {
      if (prev.includes(id)) {
        const newSelection = prev.filter((volId: number) => volId !== id);
        if (newSelection.length === 0) setSelectAll(false);
        return newSelection;
      } else {
        const newSelection = [...prev, id];
        if (newSelection.length === volunteers.length) setSelectAll(true);
        return newSelection;
      }
    });
  };

  const exportData = () => {
    if (!volunteers.length) return;
    
    const csvData = volunteers.map(vol => ({
      name: `${vol.user.first_name} ${vol.user.last_name}`,
      email: vol.user.email,
      phone: vol.user.phone,
      status: vol.status,
      skills: vol.skills?.join(', ') || '',
      availability: vol.availability?.join(', ') || '',
      created_at: vol.created_at,
    }));
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `volunteers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalVolunteers / 20);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading && volunteers.length === 0) {
    return <LoadingSpinner message="Loading volunteers..." />;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Volunteer Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage volunteer applications, assignments, and performance with advanced tools
          </p>
        </div>
        <div className="flex gap-2 mt-4 lg:mt-0">
          <Button 
            variant="outline" 
            onClick={loadVolunteers}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" onClick={exportData} disabled={!volunteers.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button asChild>
            <Link href="/admin/volunteers/shifts">
              <Calendar className="h-4 w-4 mr-2" />
              Manage Shifts
            </Link>
          </Button>
          {bulkSelection.length > 0 && (
            <Button variant="outline" onClick={() => setShowBulkDialog(true)}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Bulk Actions ({bulkSelection.length})
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volunteers</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{totalVolunteers}</div>
            <p className="text-xs text-muted-foreground">All registered volunteers</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {Array.isArray(volunteers) ? volunteers.filter(vol => vol.status === 'active' || vol.status === 'approved').length : 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              {Array.isArray(volunteers) ? volunteers.filter(vol => vol.status === 'pending').length : 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {Array.isArray(volunteers) ? volunteers.filter(vol => {
                const createdDate = new Date(vol.created_at);
                const now = new Date();
                return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
              }).length : 0}
            </div>
            <p className="text-xs text-muted-foreground">New volunteers</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Advanced Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
            <div>
              <Label className="text-sm font-medium mb-2 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Availability</Label>
              <Select
                value={filters.availability}
                onValueChange={(value) => setFilters({ ...filters, availability: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All availability</SelectItem>
                  <SelectItem value="weekends">Weekends</SelectItem>
                  <SelectItem value="weekdays">Weekdays</SelectItem>
                  <SelectItem value="evenings">Evenings</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Skills</Label>
              <Select
                value={filters.skills}
                onValueChange={(value) => setFilters({ ...filters, skills: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All skills" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All skills</SelectItem>
                  <SelectItem value="food_handling">Food Handling</SelectItem>
                  <SelectItem value="customer_service">Customer Service</SelectItem>
                  <SelectItem value="admin">Administration</SelectItem>
                  <SelectItem value="translation">Translation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Sort By</Label>
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Registration Date</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="last_active">Last Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Volunteers Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Volunteers ({totalVolunteers})
          </CardTitle>
          {volunteers.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectAll}
                onCheckedChange={handleSelectAll}
                id="select-all"
              />
              <Label htmlFor="select-all" className="text-sm">
                Select All
              </Label>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Select</TableHead>
                  <TableHead>Volunteer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(volunteers) && volunteers.length > 0 ? volunteers.map((volunteer) => (
                  <TableRow 
                    key={volunteer.id}
                    className={`hover:bg-muted/50 ${bulkSelection.includes(volunteer.id) ? 'bg-blue-50' : ''}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={bulkSelection.includes(volunteer.id)}
                        onCheckedChange={() => handleSelectVolunteer(volunteer.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-blue-700">
                          {volunteer.user.first_name} {volunteer.user.last_name}
                        </div>
                        {volunteer.user.address && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {volunteer.user.address}
                          </div>
                        )}
                        {volunteer.user.emergency_contact && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Emergency contact available
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {volunteer.user.email}
                        </div>
                        {volunteer.user.phone && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {volunteer.user.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(volunteer.status)}>
                        {volunteer.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {volunteer.skills && volunteer.skills.length > 0 ? (
                          volunteer.skills.slice(0, 2).map((skill, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No skills listed</span>
                        )}
                        {volunteer.skills && volunteer.skills.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{volunteer.skills.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {volunteer.availability && volunteer.availability.length > 0 
                          ? volunteer.availability.join(', ') 
                          : 'Not specified'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(volunteer.created_at), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-blue-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/volunteers/${volunteer.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/messages/${volunteer.id}`}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Message
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {volunteer.status === 'pending' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedVolunteer(volunteer);
                                  setShowApprovalDialog(true);
                                }}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedVolunteer(volunteer);
                                  setShowRejectionDialog(true);
                                }}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {(volunteer.status === 'approved' || volunteer.status === 'active') && (
                            <DropdownMenuItem className="text-blue-600">
                              <Award className="h-4 w-4 mr-2" />
                              Assign Shift
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">No volunteers found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalVolunteers)} of {totalVolunteers} volunteers
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>
              Perform actions on {bulkSelection.length} selected volunteers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="bulk-action">Select Action</Label>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Approve All</SelectItem>
                  <SelectItem value="reject">Reject All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAction} disabled={!bulkAction}>
              Apply to {bulkSelection.length} volunteers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Volunteer</DialogTitle>
            <DialogDescription>
              Approve {selectedVolunteer?.user.first_name} {selectedVolunteer?.user.last_name} as a volunteer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
              <Textarea
                id="approval-notes"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Volunteer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Volunteer Application</DialogTitle>
            <DialogDescription>
              Reject the application from {selectedVolunteer?.user.first_name} {selectedVolunteer?.user.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rejection reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="insufficient_experience">Insufficient Experience</SelectItem>
                  <SelectItem value="availability_mismatch">Availability Mismatch</SelectItem>
                  <SelectItem value="background_check">Background Check Issues</SelectItem>
                  <SelectItem value="capacity_full">Volunteer Capacity Full</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
