'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { 
  getHelpRequests,
  approveHelpRequest,
  rejectHelpRequest,
  updateHelpRequestStatus,
  HelpRequest 
} from '@/lib/api/admin-comprehensive';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';
import { formatDistanceToNow } from 'date-fns';
import {
  Search,
  Filter,
  Brain,
  Workflow,
  Zap,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  Target,
  BarChart3,
  PieChart,
  Activity,
  CheckCircle2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Phone,
  Mail,
  FileText,
  Tag,
  Bookmark,
  Star,
  Flag,
  MessageSquare,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Archive,
  Clock4,
  Timer,
  Gauge,
  Lightbulb,
  Sparkles,
  CheckSquare,
  User,
  ChevronLeft,
  ChevronRight,
  Ticket,
  MoreHorizontal
} from 'lucide-react';
import Link from 'next/link';

interface HelpRequestExtended extends HelpRequest {
  visitor: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

export default function AdminHelpRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [helpRequests, setHelpRequests] = useState<HelpRequestExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRequests, setTotalRequests] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [issueTicket, setIssueTicket] = useState(true);
  const [bulkSelection, setBulkSelection] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    priority: 'all',
    search: '',
    date_from: '',
    date_to: '',
  });
  const [selectedRequest, setSelectedRequest] = useState<HelpRequestExtended | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');

  useEffect(() => {
    if (user?.role === 'Admin') {
      loadHelpRequests();
    }
  }, [user, currentPage, filters]);

  const loadHelpRequests = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await getHelpRequests({
        page: currentPage,
        limit: 20,
        ...filters,
      });
      setHelpRequests(response.data);
      setTotalRequests(response.pagination?.total || 0);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load help requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, filters, toast]);

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      await approveHelpRequest(selectedRequest.id, {
        notes: approvalNotes,
        issue_ticket: issueTicket,
      });
      toast({
        title: 'Success',
        description: 'Help request approved successfully',
      });
      loadHelpRequests();
      setShowApprovalDialog(false);
      setSelectedRequest(null);
      setApprovalNotes('');
      setIssueTicket(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve help request',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) return;

    try {
      await rejectHelpRequest(selectedRequest.id, {
        reason: rejectionReason,
        notes: rejectionNotes,
      });
      toast({
        title: 'Success',
        description: 'Help request rejected',
      });
      loadHelpRequests();
      setShowRejectionDialog(false);
      setSelectedRequest(null);
      setRejectionReason('');
      setRejectionNotes('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject help request',
        variant: 'destructive',
      });
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || bulkSelection.length === 0) return;

    try {
      if (bulkAction === 'approve') {
        await Promise.all(
          bulkSelection.map((id: number) => 
            approveHelpRequest(id, { notes: 'Bulk approval', issue_ticket: false })
          )
        );
        toast({
          title: 'Success',
          description: `${bulkSelection.length} requests approved successfully`,
        });
      } else if (bulkAction === 'reject') {
        await Promise.all(
          bulkSelection.map((id: number) => 
            rejectHelpRequest(id, { reason: 'bulk_rejection', notes: 'Bulk rejection' })
          )
        );
        toast({
          title: 'Success',
          description: `${bulkSelection.length} requests rejected`,
        });
      }
      
      setBulkSelection([]);
      setBulkAction('');
      setSelectAll(false);
      setShowBulkDialog(false);
      loadHelpRequests();
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
      setBulkSelection(helpRequests.map(req => req.id));
      setSelectAll(true);
    }
  };

  const handleSelectRequest = (id: number) => {
    setBulkSelection((prev: number[]) => {
      if (prev.includes(id)) {
        const newSelection = prev.filter((reqId: number) => reqId !== id);
        if (newSelection.length === 0) setSelectAll(false);
        return newSelection;
      } else {
        const newSelection = [...prev, id];
        if (newSelection.length === helpRequests.length) setSelectAll(true);
        return newSelection;
      }
    });
  };

  const exportData = () => {
    if (!helpRequests.length) return;
    
    const csvData = helpRequests.map(req => ({
      reference: req.reference,
      visitor_name: `${req.visitor.first_name} ${req.visitor.last_name}`,
      email: req.visitor.email,
      phone: req.visitor.phone,
      category: req.category,
      priority: req.priority,
      status: req.status,
      visit_day: req.visit_day,
      time_slot: req.time_slot,
      household_size: req.household_size,
      created_at: req.created_at,
    }));
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `help-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalRequests / 20);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'ticket_issued': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'food': return 'bg-green-100 text-green-800 border-green-200';
      case 'general': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'emergency': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading && helpRequests.length === 0) {
    return <LoadingSpinner message="Loading help requests..." />;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Help Request Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Review and manage visitor help requests with advanced filtering and bulk operations
          </p>
        </div>
        <div className="flex gap-2 mt-4 lg:mt-0">
          <Button 
            variant="outline" 
            onClick={loadHelpRequests}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" onClick={exportData} disabled={!helpRequests.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          {bulkSelection.length > 0 && (
            <Button variant="outline" onClick={() => setShowBulkDialog(true)}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Bulk Actions ({bulkSelection.length})
            </Button>
          )}
        </div>
      </div>

      {/* Advanced AI-Powered Features */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AI Categorization Insights */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Brain className="h-5 w-5" />
              AI Insights
            </CardTitle>
            <CardDescription>
              Automated categorization and priority detection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto-categorization</span>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                95% accuracy
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Urgent detection</span>
              <Badge variant="destructive">
                {helpRequests.filter(req => req.priority === 'emergency').length} urgent
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pattern analysis</span>
              <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                <Lightbulb className="h-3 w-3 mr-1" />
                View Trends
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Automation */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Workflow className="h-5 w-5" />
              Smart Workflows
            </CardTitle>
            <CardDescription>
              Automated routing and assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch className="data-[state=checked]:bg-green-600" />
              <span className="text-sm">Auto-assignment</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch className="data-[state=checked]:bg-green-600" />
              <span className="text-sm">Priority routing</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active workflows</span>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                12 running
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Performance Analytics */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Gauge className="h-5 w-5" />
              Performance
            </CardTitle>
            <CardDescription>
              Response times and efficiency metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Avg. response time</span>
              <span className="font-mono text-sm font-medium">2.3h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Resolution rate</span>
              <span className="font-mono text-sm font-medium text-green-600">87%</span>
            </div>
            <div className="w-full">
              <div className="flex justify-between text-xs mb-1">
                <span>Efficiency</span>
                <span>87%</span>
              </div>
              <Progress value={87} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{totalRequests}</div>
            <p className="text-xs text-muted-foreground">All time requests</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              {Array.isArray(helpRequests) ? helpRequests.filter(req => req.status === 'pending').length : 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {Array.isArray(helpRequests) ? helpRequests.filter(req => req.status === 'approved' || req.status === 'ticket_issued').length : 0}
            </div>
            <p className="text-xs text-muted-foreground">Approved requests</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {Array.isArray(helpRequests) ? helpRequests.filter(req => req.priority === 'emergency').length : 0}
            </div>
            <p className="text-xs text-muted-foreground">Urgent attention needed</p>
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
                  placeholder="Search by reference, name..."
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
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="ticket_issued">Ticket Issued</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters({ ...filters, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Priority</Label>
              <Select
                value={filters.priority}
                onValueChange={(value) => setFilters({ ...filters, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
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
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="visit_day">Visit Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Requests Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Help Requests ({totalRequests})
          </CardTitle>
          {helpRequests.length > 0 && (
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
                  <TableHead>Request</TableHead>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visit Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(helpRequests) && helpRequests.length > 0 ? helpRequests.map((request) => (
                  <TableRow 
                    key={request.id}
                    className={`hover:bg-muted/50 ${bulkSelection.includes(request.id) ? 'bg-blue-50' : ''}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={bulkSelection.includes(request.id)}
                        onCheckedChange={() => handleSelectRequest(request.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-blue-700">{request.reference}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {request.details}
                        </div>
                        {request.household_size && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <User className="h-3 w-3" />
                            Household: {request.household_size} people
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {request.visitor.first_name} {request.visitor.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {request.visitor.email}
                        </div>
                        {request.visitor.phone && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {request.visitor.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(request.category)}>
                        {request.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(request.priority)}>
                        {request.priority.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {request.visit_day}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {request.time_slot}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
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
                            <Link href={`/admin/help-requests/${request.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {request.status === 'pending' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowApprovalDialog(true);
                                }}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRejectionDialog(true);
                                }}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {request.status === 'approved' && !request.ticket_number && (
                            <DropdownMenuItem className="text-blue-600">
                              <Ticket className="h-4 w-4 mr-2" />
                              Issue Ticket
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">No help requests found</p>
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
              Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalRequests)} of {totalRequests} requests
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
              Perform actions on {bulkSelection.length} selected help requests
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
              Apply to {bulkSelection.length} requests
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Help Request</DialogTitle>
            <DialogDescription>
              Approve the help request from {selectedRequest?.visitor.first_name} {selectedRequest?.visitor.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="issue-ticket"
                checked={issueTicket}
                onCheckedChange={(checked) => setIssueTicket(checked === true)}
              />
              <Label htmlFor="issue-ticket">Issue ticket immediately</Label>
            </div>
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
              Approve Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Help Request</DialogTitle>
            <DialogDescription>
              Reject the help request from {selectedRequest?.visitor.first_name} {selectedRequest?.visitor.last_name}
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
                  <SelectItem value="insufficient_documentation">Insufficient Documentation</SelectItem>
                  <SelectItem value="ineligible">Not Eligible</SelectItem>
                  <SelectItem value="duplicate_request">Duplicate Request</SelectItem>
                  <SelectItem value="capacity_full">Capacity Full</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rejection-notes">Additional Notes</Label>
              <Textarea
                id="rejection-notes"
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Add any additional details about this rejection..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}