'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { apiClient } from '@/lib/api/api-client';

// Icons
import { 
  Calendar, Clock, MapPin, Users, Star, CheckCircle, XCircle, AlertCircle,
  Phone, Mail, Navigation, ExternalLink, Download, FileText, Camera,
  ChevronRight, Timer, Award, TrendingUp, BarChart3, CalendarDays,
  MessageSquare, ThumbsUp, ThumbsDown, BookOpen, Shield, Zap, Target,
  RefreshCw, Settings, Filter, Search, Grid3X3, List, Eye, Edit,
  UserCheck, UserX, Clock4, MapPin as LocationIcon, Info, AlertTriangle
} from 'lucide-react';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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

// Helper functions to transform backend data
const calculateTimeCommitment = (startTime: string, endTime: string): string => {
  if (!startTime || !endTime) return 'Time TBD';
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  
  return `${diffHours} hours`;
};

const getCategoryFromRole = (role: string): string => {
  if (!role) return 'General';
  
  const roleMap: { [key: string]: string } = {
    'Food Distribution': 'Food & Nutrition',
    'Reception and Check-in': 'Administration',
    'Community Outreach': 'Community Engagement',
    'Administrative Support': 'Administration',
    'Companion': 'Care & Support',
    'Mentor': 'Education & Training',
    'Event Support': 'Events & Activities',
    'Fundraising': 'Fundraising & Development',
    'IT Support': 'Technical Support',
    'Maintenance': 'Facilities & Maintenance'
  };
  
  return roleMap[role] || 'General';
};

interface MyShift {
  id: number;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  coordinator: {
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  type: 'fixed' | 'flexible' | 'open';
  category: string;
  checkedIn?: boolean;
  checkedInTime?: string;
  checkedOut?: boolean;
  checkedOutTime?: string;
  hoursLogged?: number;
  feedback?: {
    rating: number;
    comment?: string;
  };
  requirements?: string[];
  notes?: string;
  distance?: string;
  canCancel?: boolean;
  cancellationDeadline?: string;
  isRecurring?: boolean;
  nextOccurrence?: string;
}

export default function EnhancedMyShifts() {
  const { toast } = useToast();
  const [shifts, setShifts] = useState<MyShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [cancellingShift, setCancellingShift] = useState<number | null>(null);
  const [checkingIn, setCheckingIn] = useState<number | null>(null);
  const [checkingOut, setCheckingOut] = useState<number | null>(null);

  // Load my shifts data
  useEffect(() => {
    const loadMyShifts = async () => {
      try {
        const response = await apiClient.get('/api/v1/volunteer/shifts/assigned');
        if (response.ok) {
          const data = await response.json();
          // Backend returns shifts array directly, not wrapped in data.shifts
          const rawShifts = Array.isArray(data) ? data : [];
          // Transform backend shift data to frontend format
          const transformedShifts: MyShift[] = rawShifts.map(shift => ({
            id: shift.id,
            title: shift.description || 'Volunteer Shift',
            description: shift.description || 'No description available',
            date: shift.date ? new Date(shift.date).toISOString().split('T')[0] : '',
            startTime: shift.start_time ? new Date(shift.start_time).toISOString().split('T')[1].slice(0, 5) : '',
            endTime: shift.end_time ? new Date(shift.end_time).toISOString().split('T')[1].slice(0, 5) : '',
            location: shift.location || 'Location TBD',
            coordinator: {
              name: 'Volunteer Coordinator',
              email: 'coordinator@charity.org',
              phone: '+44 7123 456789',
              avatar: '/avatars/default.jpg'
            },
            status: 'upcoming',
            type: (shift.type === 'fixed' || shift.type === 'flexible' || shift.type === 'open') ? shift.type : 'fixed',
            category: getCategoryFromRole(shift.role || 'General'),
            priority: (shift.priority === 'urgent' || shift.priority === 'high' || shift.priority === 'normal' || shift.priority === 'low') ? shift.priority : 'normal',
            role: shift.role || 'Volunteer',
            impact: (shift.priority === 'urgent' || shift.priority === 'high') ? 'high' : shift.priority === 'normal' ? 'medium' : 'low',
            timeCommitment: calculateTimeCommitment(shift.start_time, shift.end_time),
            skills: shift.required_skills ? shift.required_skills.split(',').map((s: string) => s.trim()) : [],
            requirements: [],
            equipmentNeeded: [],
            transportation: 'Own transport',
            checkedIn: false,
            checkedOut: false,
            notes: ''
          }));
          setShifts(transformedShifts);
        } else {
          // Fallback to mock data
          const mockShifts: MyShift[] = [
            {
              id: 1,
              title: 'Food Distribution Support',
              description: 'Help distribute food packages to community members in need.',
              date: '2025-07-08',
              startTime: '14:00',
              endTime: '17:00',
              location: 'Main Community Center',
              coordinator: {
                name: 'Sarah Wilson',
                email: 'sarah@charity.org',
                phone: '+44 7123 456789',
                avatar: '/avatars/sarah.jpg'
              },
              status: 'upcoming',
              type: 'fixed',
              category: 'Food & Nutrition',
              requirements: ['Food Safety Training', 'Background Check'],
              notes: 'Please arrive 15 minutes early for briefing.',
              distance: '2.1 miles',
              canCancel: true,
              cancellationDeadline: '2025-07-07T12:00:00Z',
              isRecurring: false
            },
            {
              id: 2,
              title: 'Elderly Care Companion',
              description: 'Spend quality time with elderly residents.',
              date: '2025-07-06',
              startTime: '10:00',
              endTime: '14:00',
              location: 'Sunshine Care Home',
              coordinator: {
                name: 'Michael Chen',
                email: 'michael@charity.org',
                avatar: '/avatars/michael.jpg'
              },
              status: 'in_progress',
              type: 'flexible',
              category: 'Elderly Care',
              checkedIn: true,
              checkedInTime: '2025-07-06T10:00:00Z',
              requirements: ['DBS Check', 'Safeguarding Training'],
              distance: '1.8 miles',
              canCancel: false
            },
            {
              id: 3,
              title: 'Environmental Cleanup',
              description: 'Clean up local parks and green spaces.',
              date: '2025-07-05',
              startTime: '09:00',
              endTime: '13:00',
              location: 'Greenwich Park',
              coordinator: {
                name: 'Emma Thompson',
                email: 'emma@charity.org',
                avatar: '/avatars/emma.jpg'
              },
              status: 'completed',
              type: 'open',
              category: 'Environment',
              checkedIn: true,
              checkedInTime: '2025-07-05T09:00:00Z',
              checkedOut: true,
              checkedOutTime: '2025-07-05T13:00:00Z',
              hoursLogged: 4,
              feedback: {
                rating: 5,
                comment: 'Great team effort, very fulfilling day!'
              },
              distance: '3.2 miles'
            },
            {
              id: 4,
              title: 'Youth Mentoring Session',
              description: 'Support young people with homework and life skills.',
              date: '2025-07-12',
              startTime: '16:00',
              endTime: '18:00',
              location: 'Community Youth Center',
              coordinator: {
                name: 'David Johnson',
                email: 'david@charity.org',
                avatar: '/avatars/david.jpg'
              },
              status: 'upcoming',
              type: 'fixed',
              category: 'Youth & Education',
              requirements: ['Enhanced DBS', 'Safeguarding Training', 'Mentoring Training'],
              distance: '1.5 miles',
              canCancel: true,
              cancellationDeadline: '2025-07-11T16:00:00Z',
              isRecurring: true,
              nextOccurrence: '2025-07-19'
            }
          ];
          setShifts(mockShifts);
        }
      } catch (error) {
        console.error('My shifts loading error:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your shifts. Using offline data.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadMyShifts();
  }, [toast]);

  const filterShiftsByStatus = (status: string) => {
    if (status === 'upcoming') {
      return shifts.filter(shift => shift.status === 'upcoming');
    } else if (status === 'active') {
      return shifts.filter(shift => shift.status === 'in_progress');
    } else if (status === 'completed') {
      return shifts.filter(shift => shift.status === 'completed');
    } else if (status === 'cancelled') {
      return shifts.filter(shift => shift.status === 'cancelled');
    }
    return shifts;
  };

  const handleCheckIn = async (shiftId: number) => {
    setCheckingIn(shiftId);
    try {
      const response = await apiClient.post(`/api/v1/volunteer/shifts/${shiftId}/checkin`);

      if (response.ok) {
        toast({
          title: 'Checked In!',
          description: 'You have successfully checked in for your shift.',
        });
        
        setShifts(prev => prev.map(shift => 
          shift.id === shiftId 
            ? { 
                ...shift, 
                checkedIn: true, 
                checkedInTime: new Date().toISOString(),
                status: 'in_progress'
              }
            : shift
        ));
      } else {
        throw new Error('Failed to check in');
      }
    } catch (error) {
      console.error('Check in error:', error);
      toast({
        title: 'Error',
        description: 'Failed to check in. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setCheckingIn(null);
    }
  };

  const handleCheckOut = async (shiftId: number) => {
    setCheckingOut(shiftId);
    try {
      const response = await apiClient.post(`/api/v1/volunteer/shifts/${shiftId}/checkout`);

      if (response.ok) {
        toast({
          title: 'Checked Out!',
          description: 'Thank you for your volunteer service today!',
        });
        
        setShifts(prev => prev.map(shift => 
          shift.id === shiftId 
            ? { 
                ...shift, 
                checkedOut: true, 
                checkedOutTime: new Date().toISOString(),
                status: 'completed'
              }
            : shift
        ));
      } else {
        throw new Error('Failed to check out');
      }
    } catch (error) {
      console.error('Check out error:', error);
      toast({
        title: 'Error',
        description: 'Failed to check out. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setCheckingOut(null);
    }
  };

  const handleCancelShift = async (shiftId: number) => {
    setCancellingShift(shiftId);
    try {
      const response = await apiClient.post(`/api/v1/volunteer/shifts/${shiftId}/cancel`);

      if (response.ok) {
        toast({
          title: 'Shift Cancelled',
          description: 'Your shift has been cancelled successfully.',
        });
        
        setShifts(prev => prev.map(shift => 
          shift.id === shiftId 
            ? { ...shift, status: 'cancelled' }
            : shift
        ));
      } else {
        throw new Error('Failed to cancel shift');
      }
    } catch (error) {
      console.error('Cancel shift error:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel shift. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setCancellingShift(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming': return <Calendar className="h-4 w-4" />;
      case 'in_progress': return <Clock4 className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const renderShiftCard = (shift: MyShift) => (
    <motion.div
      key={shift.id}
      variants={cardHoverVariants}
      whileHover="hover"
      initial="rest"
      className="h-full"
    >
      <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${getStatusColor(shift.status)} text-xs`}>
                  {getStatusIcon(shift.status)}
                  <span className="ml-1">{shift.status.replace('_', ' ').toUpperCase()}</span>
                </Badge>
                {shift.isRecurring && (
                  <Badge variant="outline" className="text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Recurring
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {shift.title}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                {shift.category}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {shift.status === 'completed' && shift.feedback && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium">{shift.feedback.rating}</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {shift.description}
          </p>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>{new Date(shift.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span>{shift.startTime} - {shift.endTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-purple-600" />
              <span className="truncate">{shift.location}</span>
            </div>
            {shift.distance && (
              <div className="flex items-center gap-2">
                <LocationIcon className="h-4 w-4 text-orange-600" />
                <span>{shift.distance}</span>
              </div>
            )}
          </div>
          
          {shift.checkedIn && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    Checked In
                  </span>
                </div>
                <span className="text-xs text-green-600">
                  {shift.checkedInTime && new Date(shift.checkedInTime).toLocaleTimeString()}
                </span>
              </div>
              {shift.checkedOut && (
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Checked Out
                    </span>
                  </div>
                  <span className="text-xs text-green-600">
                    {shift.checkedOutTime && new Date(shift.checkedOutTime).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {shift.hoursLogged && (
            <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Hours Logged
              </span>
              <span className="text-sm font-bold text-blue-600">
                {shift.hoursLogged}h
              </span>
            </div>
          )}
          
          {shift.feedback && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-yellow-600 fill-current" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Your Feedback
                </span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {shift.feedback.comment}
              </p>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={shift.coordinator.avatar} alt={shift.coordinator.name} />
              <AvatarFallback className="text-xs">
                {shift.coordinator.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {shift.coordinator.name}
              </p>
              <p className="text-xs text-muted-foreground">Coordinator</p>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            {shift.status === 'upcoming' && !shift.checkedIn && (
              <>
                <Button
                  onClick={() => handleCheckIn(shift.id)}
                  disabled={checkingIn === shift.id}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {checkingIn === shift.id ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Checking In...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Check In
                    </>
                  )}
                </Button>
                {shift.canCancel && (
                  <Button
                    variant="outline"
                    onClick={() => handleCancelShift(shift.id)}
                    disabled={cancellingShift === shift.id}
                    className="text-red-600 hover:text-red-700"
                  >
                    {cancellingShift === shift.id ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <UserX className="h-4 w-4 mr-2" />
                        Cancel
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
            
            {shift.status === 'in_progress' && !shift.checkedOut && (
              <Button
                onClick={() => handleCheckOut(shift.id)}
                disabled={checkingOut === shift.id}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {checkingOut === shift.id ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Checking Out...
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Check Out
                  </>
                )}
              </Button>
            )}
            
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
          
          {shift.isRecurring && shift.nextOccurrence && (
            <div className="text-xs text-muted-foreground">
              Next occurrence: {new Date(shift.nextOccurrence).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your shifts...</p>
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
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm"
          variants={itemVariants}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                My Shifts
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your volunteer shifts and track your contributions
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                {shifts.length} total shifts
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
          variants={itemVariants}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 font-medium">Upcoming</p>
                  <p className="text-3xl font-bold">
                    {filterShiftsByStatus('upcoming').length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 font-medium">Active</p>
                  <p className="text-3xl font-bold">
                    {filterShiftsByStatus('active').length}
                  </p>
                </div>
                <Clock4 className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 font-medium">Completed</p>
                  <p className="text-3xl font-bold">
                    {filterShiftsByStatus('completed').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 font-medium">Total Hours</p>
                  <p className="text-3xl font-bold">
                    {shifts.reduce((total, shift) => total + (shift.hoursLogged || 0), 0)}
                  </p>
                </div>
                <Timer className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Shifts Tabs */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-xl">Your Shifts</CardTitle>
              <CardDescription>
                View and manage all your volunteer shifts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filterShiftsByStatus('upcoming').map(renderShiftCard)}
                  </div>
                  {filterShiftsByStatus('upcoming').length === 0 && (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No upcoming shifts</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="active" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filterShiftsByStatus('active').map(renderShiftCard)}
                  </div>
                  {filterShiftsByStatus('active').length === 0 && (
                    <div className="text-center py-12">
                      <Clock4 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No active shifts</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filterShiftsByStatus('completed').map(renderShiftCard)}
                  </div>
                  {filterShiftsByStatus('completed').length === 0 && (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No completed shifts</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="all" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {shifts.map(renderShiftCard)}
                  </div>
                  {shifts.length === 0 && (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No shifts found</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
