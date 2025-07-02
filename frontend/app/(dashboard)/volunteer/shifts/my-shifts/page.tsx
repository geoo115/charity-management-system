'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarX,
  Plus,
  Filter,
  Download,
  Search,
  RefreshCw,
  TrendingUp,
  Target,
  Award,
  Star,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Heart,
  Timer,
  MapIcon,
  Phone,
  Mail,
  ArrowUpDown,
  FileText,
  Trophy,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { 
  fetchAssignedShifts, 
  fetchShiftHistory, 
  cancelShift 
} from '@/lib/api/volunteer';
import { VolunteerShift } from '@/lib/types/volunteer';
import { formatDate, formatTime } from '@/lib/utils/date-utils';
import LoadingSpinner from '@/components/common/loading-spinner';
import EnhancedShiftCard from '@/components/volunteer/enhanced-shift-card';
import ShiftConflictDialog from '@/components/volunteer/shift-conflict-dialog';

export default function MyShiftsPageEnhanced() {
  const [upcomingShifts, setUpcomingShifts] = useState<VolunteerShift[]>([]);
  const [pastShifts, setPastShifts] = useState<VolunteerShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'location' | 'role'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [shiftToCancel, setShiftToCancel] = useState<VolunteerShift | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const loadShifts = async () => {
      setLoading(true);
      try {
        const [assignedShifts, historyShifts] = await Promise.all([
          fetchAssignedShifts(),
          fetchShiftHistory()
        ]);

        const now = new Date();
        const upcoming = (assignedShifts as VolunteerShift[]).filter(
          shift => new Date(shift.date) >= now
        );
        const past = (historyShifts as VolunteerShift[]).filter(
          shift => new Date(shift.date) < now
        );

        setUpcomingShifts(upcoming);
        setPastShifts(past);
      } catch (err: any) {
        console.error('Error loading shifts:', err);
        setError(err.message || 'Failed to load shifts');
        
        // Set empty states instead of mock data
        setUpcomingShifts([]);
        setPastShifts([]);
      } finally {
        setLoading(false);
      }
    };

    loadShifts();
  }, []);

  const refreshData = async () => {
    setRefreshing(true);
    try {
      const [assignedShifts, historyShifts] = await Promise.all([
        fetchAssignedShifts(),
        fetchShiftHistory()
      ]);

      const now = new Date();
      const upcoming = (assignedShifts as VolunteerShift[]).filter(
        shift => new Date(shift.date) >= now
      );
      const past = (historyShifts as VolunteerShift[]).filter(
        shift => new Date(shift.date) < now
      );

      setUpcomingShifts(upcoming);
      setPastShifts(past);
      
      toast({
        title: "Refreshed",
        description: "Your shifts have been updated."
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to refresh shifts",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCompleted = pastShifts.length;
    const totalUpcoming = upcomingShifts.length;
    const totalHours = pastShifts.reduce((total, shift) => {
      const start = new Date(`2000-01-01T${shift.startTime}`);
      const end = new Date(`2000-01-01T${shift.endTime}`);
      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
    
    // Get unique roles
    const allRoles = [...pastShifts, ...upcomingShifts].map(shift => shift.role);
    const uniqueRoles = [...new Set(allRoles)].length;
    
    // Calculate impact score based on hours and variety
    const impactScore = Math.round((totalHours * 10) + (uniqueRoles * 5));
    
    return {
      totalCompleted,
      totalUpcoming,
      totalHours: Math.round(totalHours),
      uniqueRoles,
      impactScore
    };
  }, [pastShifts, upcomingShifts]);

  // Enhanced filtering
  const filteredUpcoming = useMemo(() => {
    return upcomingShifts.filter(shift => {
      const matchesSearch = !searchTerm || 
        shift.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || shift.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'location':
          comparison = a.location.localeCompare(b.location);
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [upcomingShifts, searchTerm, statusFilter, sortBy, sortOrder]);

  const filteredPast = useMemo(() => {
    return pastShifts.filter(shift => {
      const matchesSearch = !searchTerm || 
        shift.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    }).sort((a, b) => {
      let comparison = new Date(b.date).getTime() - new Date(a.date).getTime(); // Most recent first
      return sortOrder === 'asc' ? -comparison : comparison;
    });
  }, [pastShifts, searchTerm, sortOrder]);

  const handleCancelShift = async (shift: VolunteerShift) => {
    // Check if shift is too close (less than 24 hours)
    const shiftTime = new Date(`${shift.date} ${shift.startTime}`);
    const hoursUntilShift = (shiftTime.getTime() - Date.now()) / (1000 * 60 * 60);
    
    setShiftToCancel(shift);
    
    if (hoursUntilShift < 24) {
      // Show warning in dialog
      setShowCancelDialog(true);
    } else {
      // Direct cancellation for shifts with sufficient notice
      const reason = window.prompt('Please provide a reason for cancellation (optional):') || 'Personal reasons';
      await performCancellation(shift.id, reason);
    }
  };

  const performCancellation = async (shiftId: number, reason: string) => {
    setCancelling(shiftId);
    try {
      await cancelShift(shiftId, reason);
      
      // Update local state
      setUpcomingShifts(prev => prev.filter(shift => shift.id !== shiftId));
      
      toast({
        title: "Shift Cancelled",
        description: "Your shift has been successfully cancelled.",
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to cancel shift';
      
      if (errorMessage.includes('past')) {
        toast({
          variant: "destructive",
          title: "Cannot Cancel",
          description: "Cannot cancel shifts that have already started or passed.",
        });
      } else if (errorMessage.includes('not found')) {
        toast({
          variant: "destructive", 
          title: "Shift Not Found",
          description: "This shift assignment could not be found.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Cancellation Failed",
          description: errorMessage,
        });
      }
    } finally {
      setCancelling(null);
      setShowCancelDialog(false);
      setShiftToCancel(null);
      setCancelReason('');
    }
  };

  const handleExport = async () => {
    try {
      const allShifts = [...upcomingShifts, ...pastShifts];
      const csvContent = [
        'Date,Title,Role,Location,Start Time,End Time,Status,Hours,Coordinator',
        ...allShifts.map(shift => {
          const start = new Date(`2000-01-01T${shift.startTime}`);
          const end = new Date(`2000-01-01T${shift.endTime}`);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          const status = new Date(shift.date) < new Date() ? 'Completed' : shift.status;
          
          return [
            formatDate(shift.date),
            `"${shift.title}"`,
            shift.role,
            `"${shift.location}"`,
            formatTime(shift.startTime),
            formatTime(shift.endTime),
            status,
            hours.toFixed(1),
            shift.coordinator
          ].join(',');
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-volunteer-shifts-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Your shifts have been exported to CSV."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export shifts data."
      });
    }
  };

  const getShiftStatusIcon = (status: string, date: string) => {
    const isPast = new Date(date) < new Date();
    
    if (isPast) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    switch (status) {
      case 'open':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'full':
        return <Users className="h-4 w-4 text-orange-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getShiftStatusBadge = (status: string, date: string) => {
    const isPast = new Date(date) < new Date();
    
    if (isPast) {
      return <Badge variant="outline" className="text-green-600 border-green-600">Completed</Badge>;
    }
    
    switch (status) {
      case 'open':
        return <Badge variant="default">Scheduled</Badge>;
      case 'full':
        return <Badge variant="secondary">Full</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your shifts..." />;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Statistics */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Volunteer Shifts</h1>
          <p className="text-muted-foreground">
            Manage your volunteer schedule and track your impact
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={upcomingShifts.length === 0 && pastShifts.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button size="sm" asChild>
            <Link href="/volunteer/shifts/available">
              <Plus className="h-4 w-4 mr-2" />
              Find Shifts
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-full">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Upcoming</p>
                <p className="text-2xl font-bold text-blue-700">{stats.totalUpcoming}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-full">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Completed</p>
                <p className="text-2xl font-bold text-green-700">{stats.totalCompleted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-full">
                <Timer className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Hours</p>
                <p className="text-2xl font-bold text-purple-700">{stats.totalHours}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-full">
                <Target className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Roles</p>
                <p className="text-2xl font-bold text-orange-700">{stats.uniqueRoles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500 rounded-full">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-pink-600 font-medium">Impact</p>
                <p className="text-2xl font-bold text-pink-700">{stats.impactScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Enhanced Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search shifts by title, location, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="location">Sort by Location</SelectItem>
                  <SelectItem value="role">Sort by Role</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Shifts
            {stats.totalUpcoming > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.totalUpcoming}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed Shifts
            {stats.totalCompleted > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.totalCompleted}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-6">
          {filteredUpcoming.length > 0 ? (
            <div className="space-y-4">
              {filteredUpcoming.map(shift => (
                <div key={shift.id} className="space-y-3">
                  <EnhancedShiftCard
                    shift={shift}
                    onSignUp={() => {}} // Not applicable for assigned shifts
                    isBookmarked={false}
                    compact={viewMode === 'compact'}
                    showCoordinator={true}
                    userStatus="signed_up"
                  />
                  
                  {/* Action Buttons for Assigned Shifts */}
                  {shift.status !== 'cancelled' && new Date(shift.date) > new Date() && (
                    <div className="flex gap-2 px-4 pb-4">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/volunteer/shifts/${shift.id}`}>
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Link>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelShift(shift)}
                        disabled={cancelling === shift.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        {cancelling === shift.id ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <CalendarX className="h-3 w-3 mr-1" />
                            Cancel Shift
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Upcoming Shifts</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm || statusFilter !== 'all' 
                      ? "No shifts match your current filters."
                      : "You don't have any upcoming volunteer shifts scheduled."
                    }
                  </p>
                  <Button asChild>
                    <Link href="/volunteer/shifts/available">
                      <Plus className="h-4 w-4 mr-2" />
                      Find Available Shifts
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          {filteredPast.length > 0 ? (
            <div className="space-y-4">
              {filteredPast.map(shift => {
                const shiftHours = (() => {
                  const start = new Date(`2000-01-01T${shift.startTime}`);
                  const end = new Date(`2000-01-01T${shift.endTime}`);
                  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
                })();

                return (
                  <div key={shift.id} className="space-y-3">
                    <EnhancedShiftCard
                      shift={shift}
                      onSignUp={() => {}} // Not applicable for completed shifts
                      isBookmarked={false}
                      compact={viewMode === 'compact'}
                      showCoordinator={true}
                      userStatus="signed_up"
                    />
                    
                    {/* Action Buttons for Completed Shifts */}
                    <div className="flex gap-2 px-4 pb-4">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/volunteer/shifts/${shift.id}`}>
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Link>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Certificate Download",
                            description: "Certificate download feature coming soon!"
                          });
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Certificate
                      </Button>
                      
                      <Badge variant="secondary" className="bg-green-100 text-green-700 px-3 py-1">
                        {shiftHours}h contributed
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Completed Shifts</h3>
                  <p className="text-muted-foreground">
                    Your completed shifts will appear here once you start volunteering.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancellation Dialog */}
      {showCancelDialog && shiftToCancel && (
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Shift</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this shift?
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold">{shiftToCancel.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {formatDate(shiftToCancel.date)} • {formatTime(shiftToCancel.startTime)} - {formatTime(shiftToCancel.endTime)}
                </p>
                <p className="text-sm text-muted-foreground">{shiftToCancel.location}</p>
              </div>
              
              {(() => {
                const shiftTime = new Date(`${shiftToCancel.date} ${shiftToCancel.startTime}`);
                const hoursUntilShift = (shiftTime.getTime() - Date.now()) / (1000 * 60 * 60);
                if (hoursUntilShift < 24) {
                  return (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Warning: This shift starts in less than 24 hours ({Math.round(hoursUntilShift)} hours). 
                        Short notice cancellations may affect your volunteer rating.
                      </AlertDescription>
                    </Alert>
                  );
                }
                return null;
              })()}
              
              <div className="space-y-2">
                <label htmlFor="cancelReason" className="text-sm font-medium">
                  Reason for cancellation (optional)
                </label>
                <textarea
                  id="cancelReason"
                  placeholder="Please provide a reason for cancelling..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full min-h-[80px] p-3 border border-input rounded-md resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowCancelDialog(false);
                setShiftToCancel(null);
                setCancelReason('');
              }}>
                Keep Shift
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  const reason = cancelReason || 'No reason provided';
                  performCancellation(shiftToCancel.id, reason);
                }}
                disabled={cancelling === shiftToCancel.id}
              >
                {cancelling === shiftToCancel.id ? 'Cancelling...' : 'Cancel Shift'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
