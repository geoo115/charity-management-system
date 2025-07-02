'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Search,
  Filter,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Star,
  TrendingUp,
  Activity,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { fetchAvailableShifts, fetchAssignedShifts, fetchDashboardStats } from '@/lib/api/volunteer';
import { VolunteerShift, VolunteerDashboardStats } from '@/lib/types/volunteer';
import { formatDate, formatTime } from '@/lib/utils/date-utils';
import LoadingSpinner from '@/components/common/loading-spinner';

export default function ShiftsOverviewPage() {
  const [availableShifts, setAvailableShifts] = useState<VolunteerShift[]>([]);
  const [myShifts, setMyShifts] = useState<VolunteerShift[]>([]);
  const [stats, setStats] = useState<VolunteerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadShiftData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [availableData, assignedData, statsData] = await Promise.all([
          fetchAvailableShifts(),
          fetchAssignedShifts(), 
          fetchDashboardStats()
        ]);

        setAvailableShifts(Array.isArray(availableData) ? availableData.slice(0, 3) : []);
        setMyShifts(Array.isArray(assignedData) ? assignedData.slice(0, 3) : []);
        setStats(statsData as VolunteerDashboardStats);
      } catch (err: any) {
        console.error('Error loading shift data:', err);
        setError(err.message || 'Failed to load shift data');
        
        // Set empty states instead of mock data
        setAvailableShifts([]);
        setMyShifts([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    loadShiftData();
  }, []);

  const getShiftStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading shift information..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Shift Management</h1>
          <p className="text-muted-foreground">
            Manage your volunteer shifts and discover new opportunities
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button asChild>
            <Link href="/volunteer/shifts/available">
              <Search className="h-4 w-4 mr-2" />
              Browse Available Shifts
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.upcomingShifts || 0}</p>
                  <p className="text-sm text-muted-foreground">Upcoming Shifts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.hoursThisMonth || 0}</p>
                  <p className="text-sm text-muted-foreground">Hours This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalHours || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.peopleHelped || 0}</p>
                  <p className="text-sm text-muted-foreground">People Helped</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="upcoming">My Upcoming Shifts</TabsTrigger>
          <TabsTrigger value="available">Available Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common shift management tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href="/volunteer/shifts/available">
                    <Search className="h-4 w-4 mr-2" />
                    Browse Available Shifts
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Link>
                </Button>
                
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href="/volunteer/shifts/my-shifts">
                    <Calendar className="h-4 w-4 mr-2" />
                    View My Shifts
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Link>
                </Button>
                
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href="/volunteer/profile">
                    <Star className="h-4 w-4 mr-2" />
                    Update Availability
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity or Next Shift */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Next Shift
                </CardTitle>
                <CardDescription>
                  Your upcoming volunteer commitment
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.nextShift ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{stats.nextShift.title}</h3>
                        <p className="text-sm text-muted-foreground">{stats.nextShift.description}</p>
                      </div>
                      <Badge className={getShiftStatusColor(stats.nextShift.status)}>
                        {stats.nextShift.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(stats.nextShift.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatTime(stats.nextShift.startTime)} - {formatTime(stats.nextShift.endTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{stats.nextShift.location}</span>
                      </div>
                    </div>
                    
                    <Button asChild className="w-full">
                      <Link href={`/volunteer/shifts/${stats.nextShift.id}`}>
                        View Details
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No upcoming shifts scheduled</p>
                    <Button asChild>
                      <Link href="/volunteer/shifts/available">
                        Browse Available Shifts
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">My Upcoming Shifts</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/volunteer/shifts/my-shifts">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>

          {myShifts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myShifts.map((shift) => (
                <Card key={shift.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{shift.title}</CardTitle>
                      <Badge className={getShiftStatusColor(shift.status)}>
                        {shift.status}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {shift.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{formatDate(shift.date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{formatTime(shift.startTime)}</span>
                      </div>
                      <div className="flex items-center gap-1 col-span-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{shift.location}</span>
                      </div>
                    </div>
                    
                    <Button asChild className="w-full" size="sm">
                      <Link href={`/volunteer/shifts/${shift.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Upcoming Shifts</h3>
                <p className="text-muted-foreground mb-6">
                  You don't have any shifts scheduled. Browse available opportunities to get started.
                </p>
                <Button asChild>
                  <Link href="/volunteer/shifts/available">
                    <Search className="h-4 w-4 mr-2" />
                    Find Shifts
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Available Opportunities</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/volunteer/shifts/available">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>

          {availableShifts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableShifts.map((shift) => (
                <Card key={shift.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{shift.title}</CardTitle>
                      {shift.priority && (
                        <Badge className={getPriorityColor(shift.priority)}>
                          {shift.priority}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {shift.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{formatDate(shift.date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{formatTime(shift.startTime)}</span>
                      </div>
                      <div className="flex items-center gap-1 col-span-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{shift.location}</span>
                      </div>
                    </div>
                    
                    <Button asChild className="w-full" size="sm">
                      <Link href={`/volunteer/shifts/${shift.id}`}>
                        View & Apply
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Available Shifts</h3>
                <p className="text-muted-foreground mb-6">
                  There are currently no shifts available that match your profile. Check back later or update your availability.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button asChild variant="outline">
                    <Link href="/volunteer/profile">
                      <Star className="h-4 w-4 mr-2" />
                      Update Profile
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/volunteer/shifts/available">
                      <Search className="h-4 w-4 mr-2" />
                      Browse All Shifts
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
