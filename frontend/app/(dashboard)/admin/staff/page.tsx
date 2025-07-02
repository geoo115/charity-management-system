'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Building2,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserCheck,
  Settings,
  Download,
  RefreshCw,
  Plus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';
import { 
  StaffProfile, 
  StaffDashboardData,
  getStaffList, 
  getStaffDashboard,
  deleteStaff,
  getStaffDepartments,
  getStaffStatuses
} from '@/lib/api/staff';

export default function StaffManagementPage() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [dashboardData, setDashboardData] = useState<StaffDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; staff: StaffProfile | null }>({
    open: false,
    staff: null
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load staff list
      const staffParams = {
        page: currentPage,
        pageSize: 20,
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined,
      };

      const [staffResponse, dashboardResponse] = await Promise.all([
        getStaffList(staffParams),
        getStaffDashboard()
      ]);

      setStaff(staffResponse.staff);
      setTotalPages(staffResponse.pagination.total_pages);
      setDashboardData(dashboardResponse);
    } catch (error) {
      console.error('Error loading staff data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load staff data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, departmentFilter, statusFilter, searchTerm, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteStaff = async (staffMember: StaffProfile) => {
    try {
      await deleteStaff(staffMember.id);
      toast({
        title: 'Success',
        description: `${staffMember.user.first_name} ${staffMember.user.last_name} has been removed from staff.`,
      });
      setDeleteDialog({ open: false, staff: null });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete staff member. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      suspended: { color: 'bg-red-100 text-red-800', label: 'Suspended' },
      training: { color: 'bg-yellow-100 text-yellow-800', label: 'Training' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getDepartmentIcon = (department: string) => {
    switch (department) {
      case 'food': return '🍽️';
      case 'emergency': return '🚨';
      case 'admin': return '📋';
      case 'support': return '🤝';
      default: return '👥';
    }
  };

  if (loading && !dashboardData) {
    return <LoadingSpinner message="Loading staff management..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Users className="h-8 w-8 text-blue-600" />
              <span>Staff Management</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Manage staff members, assignments, and performance
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Link href="/admin/staff/create">
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Staff Member
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Dashboard Overview */}
        {dashboardData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.overview.total_staff}</div>
                <p className="text-xs text-muted-foreground">
                  Across {dashboardData.overview.departments} departments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{dashboardData.overview.active_staff}</div>
                <p className="text-xs text-muted-foreground">
                  Available for assignments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On Shift</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{dashboardData.overview.on_shift}</div>
                <p className="text-xs text-muted-foreground">
                  Currently working
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {dashboardData.performance_summary.average_performance}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Overall performance score
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {getStaffDepartments().map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept.charAt(0).toUpperCase() + dept.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {getStaffStatuses().map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Staff Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Staff Members ({staff.length})</CardTitle>
              <CardDescription>
                Manage your staff members and their information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hire Date</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((staffMember) => (
                    <TableRow key={staffMember.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {staffMember.user.first_name[0]}{staffMember.user.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {staffMember.user.first_name} {staffMember.user.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {staffMember.user.email}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ID: {staffMember.employee_id}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getDepartmentIcon(staffMember.department)}</span>
                          <span className="capitalize">{staffMember.department}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{staffMember.position}</span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(staffMember.status)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(staffMember.hire_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {staffMember.supervisor ? (
                          <div className="text-sm">
                            {staffMember.supervisor.user.first_name} {staffMember.supervisor.user.last_name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/admin/staff/${staffMember.id}`}>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/admin/staff/${staffMember.id}/edit`}>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/admin/staff/${staffMember.id}/schedule`}>
                              <DropdownMenuItem>
                                <Calendar className="mr-2 h-4 w-4" />
                                Schedule
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteDialog({ open: true, staff: staffMember })}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, staff: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Staff Member</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {deleteDialog.staff?.user.first_name} {deleteDialog.staff?.user.last_name} from staff?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialog({ open: false, staff: null })}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteDialog.staff && handleDeleteStaff(deleteDialog.staff)}
              >
                Remove Staff Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 