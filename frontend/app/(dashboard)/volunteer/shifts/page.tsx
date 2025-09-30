'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
  ArrowRight,
  Heart,
  Target,
  Zap,
  Award,
  CalendarDays,
  Timer,
  UserCheck,
  Sparkles
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100
      }
    }
  };

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
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <motion.div 
          className="text-center space-y-4"
          variants={itemVariants}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-full text-blue-600 dark:text-blue-400 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Volunteer Impact Hub
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Your Shift Management Center
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover meaningful opportunities, track your impact, and connect with your community
          </p>
        </motion.div>

        {error && (
          <motion.div variants={itemVariants}>
            <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to Load Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Enhanced Stats Grid */}
        {stats && (
          <motion.div 
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
            variants={itemVariants}
          >
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
                    <CalendarDays className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.upcomingShifts || 0}</p>
                    <p className="text-sm text-blue-600/70 dark:text-blue-400/70 font-medium">Upcoming Shifts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500 rounded-xl shadow-lg">
                    <Timer className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.hoursThisMonth || 0}</p>
                    <p className="text-sm text-green-600/70 dark:text-green-400/70 font-medium">Hours This Month</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500 rounded-xl shadow-lg">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.totalHours || 0}</p>
                    <p className="text-sm text-purple-600/70 dark:text-purple-400/70 font-medium">Total Hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500 rounded-xl shadow-lg">
                    <Heart className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.peopleHelped || 0}</p>
                    <p className="text-sm text-orange-600/70 dark:text-orange-400/70 font-medium">People Helped</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Enhanced Main Content */}
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
              <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <Target className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <Calendar className="h-4 w-4 mr-2" />
                My Shifts
              </TabsTrigger>
              <TabsTrigger value="available" className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <Zap className="h-4 w-4 mr-2" />
                Opportunities
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Enhanced Quick Actions */}
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      Quick Actions
                    </CardTitle>
                    <CardDescription>
                      Get started with these common tasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button asChild className="w-full justify-start h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg">
                      <Link href="/volunteer/shifts/available">
                        <Search className="h-5 w-5 mr-3" />
                        Browse Available Shifts
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </Link>
                    </Button>
                    
                    <Button asChild className="w-full justify-start h-12" variant="outline">
                      <Link href="/volunteer/shifts/my-shifts">
                        <Calendar className="h-5 w-5 mr-3" />
                        View My Shifts
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </Link>
                    </Button>
                    
                    <Button asChild className="w-full justify-start h-12" variant="outline">
                      <Link href="/volunteer/profile">
                        <UserCheck className="h-5 w-5 mr-3" />
                        Update Availability
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Enhanced Next Shift */}
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      Next Shift
                    </CardTitle>
                    <CardDescription>
                      Your upcoming volunteer commitment
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats?.nextShift ? (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{stats.nextShift.title}</h3>
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
                        
                        <Button asChild className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white">
                          <Link href={`/volunteer/shifts/${stats.nextShift.id}`}>
                            View Details
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-2xl w-fit mx-auto mb-4">
                          <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">No Upcoming Shifts</h3>
                        <p className="text-muted-foreground mb-6">Ready to make a difference? Browse available opportunities</p>
                        <Button asChild className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
                          <Link href="/volunteer/shifts/available">
                            <Search className="h-4 w-4 mr-2" />
                            Find Opportunities
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">My Upcoming Shifts</h2>
                  <p className="text-muted-foreground">Your committed volunteer activities</p>
                </div>
                <Button asChild variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                  <Link href="/volunteer/shifts/my-shifts">
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>

              {myShifts.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {myShifts.map((shift) => (
                    <Card key={shift.id} className="hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg text-slate-900 dark:text-slate-100">{shift.title}</CardTitle>
                          <Badge className={getShiftStatusColor(shift.status)}>
                            {shift.status}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2 text-slate-600 dark:text-slate-400">
                          {shift.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <span>{formatDate(shift.date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-green-500" />
                            <span>{formatTime(shift.startTime)}</span>
                          </div>
                          <div className="flex items-center gap-2 col-span-2">
                            <MapPin className="h-4 w-4 text-orange-500" />
                            <span className="truncate">{shift.location}</span>
                          </div>
                        </div>
                        
                        <Button asChild className="w-full h-10" size="sm">
                          <Link href={`/volunteer/shifts/${shift.id}`}>
                            View Details
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <CardContent className="text-center py-16">
                    <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-2xl w-fit mx-auto mb-6">
                      <Calendar className="h-16 w-16 text-blue-600 dark:text-blue-400 mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">No Upcoming Shifts</h3>
                    <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                      You don&apos;t have any shifts scheduled. Browse available opportunities to get started making a difference.
                    </p>
                    <Button asChild className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
                      <Link href="/volunteer/shifts/available">
                        <Search className="h-4 w-4 mr-2" />
                        Find Opportunities
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="available" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Available Opportunities</h2>
                  <p className="text-muted-foreground">Discover new ways to make an impact</p>
                </div>
                <Button asChild variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                  <Link href="/volunteer/shifts/available">
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>

              {availableShifts.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {availableShifts.map((shift) => (
                    <Card key={shift.id} className="hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {shift.title}
                          </CardTitle>
                          {shift.priority && (
                            <Badge className={getPriorityColor(shift.priority)}>
                              {shift.priority}
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="line-clamp-2 text-slate-600 dark:text-slate-400">
                          {shift.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <span>{formatDate(shift.date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-green-500" />
                            <span>{formatTime(shift.startTime)}</span>
                          </div>
                          <div className="flex items-center gap-2 col-span-2">
                            <MapPin className="h-4 w-4 text-orange-500" />
                            <span className="truncate">{shift.location}</span>
                          </div>
                        </div>
                        
                        <Button asChild className="w-full h-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white group-hover:shadow-md transition-all" size="sm">
                          <Link href={`/volunteer/shifts/${shift.id}`}>
                            View & Apply
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <CardContent className="text-center py-16">
                    <div className="p-4 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-2xl w-fit mx-auto mb-6">
                      <Search className="h-16 w-16 text-purple-600 dark:text-purple-400 mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">No Available Opportunities</h3>
                    <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                      There are currently no shifts available that match your profile. Check back later or update your availability.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button asChild variant="outline" className="border-purple-200 text-purple-600 hover:bg-purple-50">
                        <Link href="/volunteer/profile">
                          <UserCheck className="h-4 w-4 mr-2" />
                          Update Profile
                        </Link>
                      </Button>
                      <Button asChild className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white">
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
        </motion.div>
      </div>
    </motion.div>
  );
}
