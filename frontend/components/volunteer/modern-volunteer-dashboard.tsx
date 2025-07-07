'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  Users, 
  CalendarCheck2, 
  ClipboardCheck, 
  Bell,
  UserCheck,
  Award,
  TrendingUp,
  Settings,
  Star,
  Zap,
  Target,
  CheckSquare,
  AlertTriangle,
  Activity,
  MapPin,
  Phone,
  Mail,
  Heart,
  Sparkles,
  ArrowUp,
  ArrowDown,
  BarChart3,
  RefreshCw,
  Filter,
  Search,
  Calendar as CalendarIcon,
  ChevronRight,
  Timer,
  Trophy,
  Flame,
  CheckCircle,
  Plus,
  ExternalLink,
  Shield,
  Crown,
  UserCog,
  ChevronDown,
  ChevronLeft,
  LogOut,
  CalendarPlus
} from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth/auth-context';
import { apiClient } from '@/lib/api/api-client';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
};

const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: { 
    scale: 1.02, 
    y: -5,
    transition: {
      duration: 0.3
    }
  }
};

interface DashboardStats {
  totalHours: number;
  shiftsCompleted: number;
  upcomingShifts: number;
  achievements: number;
  currentStreak: number;
  impactScore: number;
}

interface UpcomingShift {
  id: number;
  title: string;
  date: string;
  time: string;
  startTime: string;
  endTime: string;
  location: string;
  role: string;
  type: 'fixed' | 'flexible' | 'open';
  status: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  badge?: string;
  urgent?: boolean;
}

interface Activity {
  id: string;
  type: 'shift' | 'achievement' | 'training' | 'feedback';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
}

export default function ModernVolunteerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<UpcomingShift[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Load dashboard data from API
  const loadDashboardData = async () => {
    try {
      // Fetch real data from API endpoints using authenticated client
      const [statsResponse, activityResponse, shiftsResponse] = await Promise.all([
        apiClient.get('/api/v1/volunteer/dashboard/stats'),
        apiClient.get('/api/v1/volunteer/activity'),
        apiClient.get('/api/v1/volunteer/shifts/my-shifts')
      ]);

      let stats = null;
      let activity: Activity[] = [];
      let shifts: UpcomingShift[] = [];

      if (statsResponse.ok) {
        stats = await statsResponse.json();
      }

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        activity = (activityData.recent_shifts?.map((shift: any) => ({
          id: shift.id || `activity-${Date.now()}-${Math.random()}`,
          type: 'shift',
          title: `${shift.status === 'completed' ? 'Shift Completed' : 'Shift Assigned'}`,
          description: shift.Shift?.title || 'Volunteer Shift',
          timestamp: new Date(shift.created_at).toLocaleString(),
          icon: <CheckCircle className="h-4 w-4" />,
          color: shift.status === 'completed' ? 'text-green-500' : 'text-blue-500'
        })) || [])
        // Remove duplicates by ID
        .filter((activity: Activity, index: number, array: Activity[]) => array.findIndex((a: Activity) => a.id === activity.id) === index);
      }

      if (shiftsResponse.ok) {
        const shiftsData = await shiftsResponse.json();
        console.log('My shifts API response:', shiftsData);
        
        // Filter for upcoming shifts only
        const currentDate = new Date();
        const rawShifts = Array.isArray(shiftsData) ? shiftsData : [];
        
        shifts = rawShifts
          .filter((shift: any) => {
            const shiftDate = new Date(shift.date);
            return shiftDate >= currentDate && (shift.status === 'Confirmed' || shift.status === 'confirmed' || shift.status === 'pending');
          })
          .map((shift: any) => ({
            id: shift.id || `shift-${Date.now()}-${Math.random()}`,
            title: shift.description || 'Volunteer Shift',
            date: shift.date || '',
            time: `${shift.start_time || '09:00'} - ${shift.end_time || '17:00'}`,
            startTime: shift.start_time || '09:00',
            endTime: shift.end_time || '17:00',
            location: shift.location || 'Location TBD',
            role: shift.role || 'Volunteer',
            type: shift.type || 'fixed',
            status: shift.status || 'pending'
          }))
          // Remove duplicates by ID
          .filter((shift: UpcomingShift, index: number, array: UpcomingShift[]) => array.findIndex((s: UpcomingShift) => s.id === shift.id) === index)
          .sort((a: UpcomingShift, b: UpcomingShift) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }

      // Only use real data from API
      if (!stats) {
        stats = {
          totalHours: 0,
          shiftsCompleted: 0,
          upcomingShifts: shifts.length,
          achievements: 0,
          currentStreak: 0,
          impactScore: 0
        };
      } else {
        // Update upcoming shifts count with real data
        stats.upcomingShifts = shifts.length;
      }

      setDashboardStats(stats);
      setUpcomingShifts(shifts);
      setRecentActivity(activity);
    } catch (error) {
      console.error('Dashboard data loading error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data. Please try again.',
        variant: 'destructive'
      });
      
      // Initialize with empty data
      setDashboardStats({
        totalHours: 0,
        shiftsCompleted: 0,
        upcomingShifts: 0,
        achievements: 0,
        currentStreak: 0,
        impactScore: 0
      });
      
      setUpcomingShifts([]);
      setRecentActivity([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadDashboardData();
      setIsLoading(false);
    };

    loadData();
  }, [toast]);

  const quickActions: QuickAction[] = [
    {
      id: 'find-shifts',
      title: 'Find Shifts',
      description: 'Browse available volunteer opportunities',
      icon: <Search className="h-5 w-5" />,
      href: '/volunteer/shifts/available',
      color: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
    },
    {
      id: 'my-shifts',
      title: 'My Shifts',
      description: 'View and manage your scheduled shifts',
      icon: <CalendarCheck2 className="h-5 w-5" />,
      href: '/volunteer/shifts/my-shifts',
      color: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
      badge: dashboardStats?.upcomingShifts ? `${dashboardStats.upcomingShifts} upcoming` : undefined
    },
    {
      id: 'profile',
      title: 'My Profile',
      description: 'Update your volunteer profile and preferences',
      icon: <UserCog className="h-5 w-5" />,
      href: '/volunteer/profile',
      color: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
    }
  ];

  const handleRefresh = async () => {
    setIsLoading(true);
    // Reload the actual data instead of just waiting
    try {
      await loadDashboardData();
      toast({
        title: 'Data Refreshed',
        description: 'Dashboard data has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh dashboard data.',
        variant: 'destructive'
      });
    }
    setIsLoading(false);
  };

  // Helper function to generate calendar data
  const generateCalendarData = (upcomingShifts: UpcomingShift[]) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Get first day of the month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Generate calendar grid
    const calendarDays = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateString = date.toISOString().split('T')[0];
      
      // Find shifts for this day
      const dayShifts = upcomingShifts.filter(shift => 
        shift.date.startsWith(dateString)
      );
      
      calendarDays.push({
        day,
        date: dateString,
        shifts: dayShifts,
        isToday: day === today.getDate() && 
                 currentMonth === today.getMonth() && 
                 currentYear === today.getFullYear(),
        isPast: date < today
      });
    }
    
    return {
      monthName: firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      calendarDays
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div 
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border-0"
          variants={itemVariants}
        >
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xl shadow-lg">
              {user?.first_name?.[0] || 'V'}
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user?.first_name || 'Volunteer'}! 👋
              </h1>
              <p className="text-muted-foreground mt-1 text-sm lg:text-base">
                Ready to make a difference today? Here's your volunteer dashboard
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Menu
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
          variants={itemVariants}
        >
          <motion.div 
            variants={cardHoverVariants} 
            whileHover="hover" 
            initial="rest"
            className="h-full"
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 font-medium">Total Hours</p>
                    <p className="text-3xl font-bold mt-1">
                      {dashboardStats?.totalHours || 0}
                    </p>
                    <p className="text-blue-100 text-sm mt-2 flex items-center">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      {(dashboardStats?.totalHours && dashboardStats.totalHours > 0) ? `+${Math.round(dashboardStats.totalHours * 0.1)} this month` : 'No data yet'}
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                    <Clock className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={cardHoverVariants} 
            whileHover="hover" 
            initial="rest"
            className="h-full"
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 font-medium">Shifts Completed</p>
                    <p className="text-3xl font-bold mt-1">
                      {dashboardStats?.shiftsCompleted || 0}
                    </p>
                    <p className="text-green-100 text-sm mt-2 flex items-center">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      {(dashboardStats?.shiftsCompleted && dashboardStats.shiftsCompleted > 0) ? `+${Math.round(dashboardStats.shiftsCompleted * 0.2)} this month` : 'No data yet'}
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                    <CheckCircle className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={cardHoverVariants} 
            whileHover="hover" 
            initial="rest"
            className="h-full"
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 font-medium">Upcoming Shifts</p>
                    <p className="text-3xl font-bold mt-1">
                      {dashboardStats?.upcomingShifts || 0}
                    </p>
                    <p className="text-purple-100 text-sm mt-2">
                      {upcomingShifts.length > 0 ? `Next: ${new Date(upcomingShifts[0].date).toLocaleDateString()}` : 'No upcoming shifts'}
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                    <Calendar className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={cardHoverVariants} 
            whileHover="hover" 
            initial="rest"
            className="h-full"
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 font-medium">Impact Score</p>
                    <p className="text-3xl font-bold mt-1">
                      {dashboardStats?.impactScore || 0}%
                    </p>
                    <p className="text-orange-100 text-sm mt-2 flex items-center">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      {(dashboardStats?.impactScore && dashboardStats.impactScore > 0) ? `+${Math.round(dashboardStats.impactScore * 0.06)}% this month` : 'No data yet'}
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                    <TrendingUp className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Zap className="h-6 w-6 text-yellow-500" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Jump to the most important tasks and get things done
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                  3 Actions
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickActions.map((action) => (
                  <motion.div
                    key={action.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="h-full"
                  >
                    <Link href={action.href} className="block h-full">
                      <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer h-full group">
                        <CardContent className="p-5">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <div className={`p-3 rounded-lg ${action.color} shadow-sm group-hover:shadow-md transition-shadow`}>
                                {action.icon}
                              </div>
                              {action.badge && (
                                <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                                  {action.badge}
                                </Badge>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                {action.title}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {action.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Next Shift & Progress */}
          <div className="xl:col-span-2 space-y-6">
            {/* Upcoming Shifts with Calendar */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CalendarCheck2 className="h-6 w-6 text-green-600" />
                    My Shifts Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const { monthName, calendarDays } = generateCalendarData(upcomingShifts);
                    
                    return upcomingShifts.length > 0 ? (
                      <div className="space-y-6">
                        {/* Next Shift Highlight */}
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-green-200 dark:border-green-700">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-xl text-gray-900 dark:text-white">
                                {upcomingShifts[0].title}
                              </h3>
                              <p className="text-muted-foreground text-lg mt-1">
                                {upcomingShifts[0].time}
                              </p>
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-sm px-3 py-1">
                              Next Shift
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-5 w-5 text-green-600" />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">Date</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(upcomingShifts[0].date).toLocaleDateString('en-GB', {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <MapPin className="h-5 w-5 text-purple-600" />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">Location</p>
                                <p className="text-sm text-muted-foreground">{upcomingShifts[0].location}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Clock className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">Duration</p>
                                <p className="text-sm text-muted-foreground">
                                  {Math.round((new Date(`2000-01-01 ${upcomingShifts[0].endTime}`).getTime() - 
                                              new Date(`2000-01-01 ${upcomingShifts[0].startTime}`).getTime()) / (1000 * 60 * 60))} hours
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-3">
                            <Button className="flex-1 bg-green-600 hover:bg-green-700">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Check In
                            </Button>
                            <Button variant="outline" className="flex-1">
                              <MapPin className="h-4 w-4 mr-2" />
                              Get Directions
                            </Button>
                          </div>
                        </div>

                        {/* Calendar Grid */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-lg flex items-center gap-2">
                              <CalendarIcon className="h-5 w-5 text-blue-600" />
                              {monthName}
                            </h4>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Calendar Header */}
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                                {day}
                              </div>
                            ))}
                          </div>
                          
                          {/* Calendar Grid */}
                          <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((dayData, index) => (
                              <div
                                key={dayData ? `day-${dayData.date}` : `empty-${index}`}
                                className={`
                                  min-h-[80px] border rounded-lg p-2 
                                  ${dayData ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-900'}
                                  ${dayData?.isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-700'}
                                  ${dayData?.isPast ? 'opacity-50' : ''}
                                `}
                              >
                                {dayData && (
                                  <>
                                    <div className={`text-sm font-medium mb-1 ${dayData.isToday ? 'text-blue-600' : 'text-gray-900 dark:text-white'}`}>
                                      {dayData.day}
                                    </div>
                                    {dayData.shifts.map((shift, shiftIndex) => (
                                      <div
                                        key={`${dayData.date}-${shift.id}-${shiftIndex}`}
                                        className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded px-1 py-0.5 mb-1 truncate"
                                        title={`${shift.title} - ${shift.time}`}
                                      >
                                        {shift.startTime}
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* All Shifts List */}
                        {upcomingShifts.length > 1 && (
                          <div>
                            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                              <CalendarIcon className="h-5 w-5 text-blue-600" />
                              All Upcoming Shifts
                            </h4>
                            <div className="space-y-3">
                              {upcomingShifts.slice(1).map((shift, index) => (
                                <motion.div
                                  key={shift.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-blue-600">
                                        {new Date(shift.date).getDate()}
                                      </div>
                                      <div className="text-xs text-muted-foreground uppercase">
                                        {new Date(shift.date).toLocaleDateString('en-GB', { month: 'short' })}
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <h5 className="font-medium text-gray-900 dark:text-white">{shift.title}</h5>
                                      <p className="text-sm text-muted-foreground">{shift.time} • {shift.location}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs">
                                          {shift.type}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">
                                          {shift.role}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {new Date(shift.date).toLocaleDateString('en-GB', { weekday: 'short' })}
                                    </p>
                                    <Badge 
                                      variant={shift.status === 'confirmed' ? 'default' : 'secondary'}
                                      className="text-xs mt-1"
                                    >
                                      {shift.status}
                                    </Badge>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-3 pt-4 border-t">
                          <Button variant="outline" className="flex-1" asChild>
                            <Link href="/volunteer/shifts/my-shifts">
                              <CalendarCheck2 className="h-4 w-4 mr-2" />
                              View All My Shifts
                            </Link>
                          </Button>
                          <Button className="flex-1 bg-blue-600 hover:bg-blue-700" asChild>
                            <Link href="/volunteer/shifts/available">
                              <Search className="h-4 w-4 mr-2" />
                              Find More Shifts
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Calendar Grid for Empty State */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-lg flex items-center gap-2">
                              <CalendarIcon className="h-5 w-5 text-blue-600" />
                              {monthName}
                            </h4>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Calendar Header */}
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                                {day}
                              </div>
                            ))}
                          </div>
                          
                          {/* Calendar Grid */}
                          <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((dayData, index) => (
                              <div
                                key={dayData ? `cal2-day-${dayData.date}` : `cal2-empty-${index}`}
                                className={`
                                  min-h-[80px] border rounded-lg p-2 
                                  ${dayData ? 'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors' : 'bg-gray-50 dark:bg-slate-900'}
                                  ${dayData?.isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-700'}
                                  ${dayData?.isPast ? 'opacity-50' : ''}
                                `}
                              >
                                {dayData && (
                                  <>
                                    <div className={`text-sm font-medium mb-1 ${dayData.isToday ? 'text-blue-600' : 'text-gray-900 dark:text-white'}`}>
                                      {dayData.day}
                                    </div>
                                    {!dayData.isPast && dayData.shifts.length === 0 && (
                                      <div className="text-xs text-muted-foreground hover:text-blue-600 transition-colors">
                                        Available
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Call to Action */}
                        <div className="text-center py-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                            <CalendarPlus className="h-8 w-8 text-blue-600" />
                          </div>
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                            Ready to Get Started?
                          </h3>
                          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            Your calendar is ready for volunteer shifts! Browse available opportunities and start making a difference in your community.
                          </p>
                          <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                            <Link href="/volunteer/shifts/available">
                              <Search className="h-4 w-4 mr-2" />
                              Browse Available Shifts
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </motion.div>

            {/* Achievements */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Trophy className="h-6 w-6 text-yellow-600" />
                    Recent Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <Award className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Dedicated Volunteer</p>
                        <p className="text-xs text-muted-foreground">Completed 20+ hours</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Safety Champion</p>
                        <p className="text-xs text-muted-foreground">Completed safety training</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <Heart className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Community Helper</p>
                        <p className="text-xs text-muted-foreground">Helped 50+ people</p>
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full mt-6">
                    View All Achievements
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Activity className="h-6 w-6 text-blue-600" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          <div className={`p-2 rounded-full ${activity.color} bg-opacity-10`}>
                            {activity.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white">{activity.title}</p>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                          <Activity className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">No recent activity</p>
                        <p className="text-sm text-muted-foreground mt-1">Your volunteer activity will appear here</p>
                      </div>
                    )}
                  </div>
                  
                  {recentActivity.length > 0 && (
                    <Button variant="outline" className="w-full mt-6">
                      View All Activity
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
