'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { apiClient } from '@/lib/api/api-client';
import FlexibleShiftSignupDialog from './flexible-shift-signup-dialog';

// Icons
import { 
  Calendar, Clock, MapPin, Users, Phone, Star, BookmarkCheck, Bookmark,
  Search, Filter, SlidersHorizontal, ArrowUpDown, RefreshCw, AlertTriangle,
  Grid3X3, List, Heart, Zap, Target, CheckCircle, Loader2, InfoIcon, Globe,
  ChevronRight, Plus, User, Coffee, Briefcase, Timer, Award, UserCheck,
  CalendarDays, TrendingUp, Eye, ExternalLink, ChevronDown, SortAsc, SortDesc
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

interface VolunteerShift {
  id: number;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  enrolled: number;
  role: string;
  coordinator: {
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  type: 'fixed' | 'flexible' | 'open';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  skills?: string[];
  requirements?: string[];
  impact: 'low' | 'medium' | 'high';
  timeCommitment: string;
  isBookmarked?: boolean;
  distance?: string;
  category: string;
}

export default function EnhancedAvailableShifts() {
  const { toast } = useToast();
  const [shifts, setShifts] = useState<VolunteerShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedImpact, setSelectedImpact] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [signingUp, setSigningUp] = useState<number | null>(null);
  const [selectedShift, setSelectedShift] = useState<VolunteerShift | null>(null);
  const [showShiftDetails, setShowShiftDetails] = useState(false);
  const [showFlexibleSignup, setShowFlexibleSignup] = useState(false);

  // Load shifts data
  useEffect(() => {
    const loadShifts = async () => {
      try {
        const response = await apiClient.get('/api/v1/volunteer/shifts/available');
        if (response.ok) {
          const data = await response.json();
          console.log('Available shifts API response:', data);
          // Backend returns shifts array directly, not wrapped in data.shifts
          const rawShifts = Array.isArray(data) ? data : [];
          console.log('Raw shifts count:', rawShifts.length);
          // Transform backend shift data to frontend format
          const transformedShifts: VolunteerShift[] = rawShifts.map(shift => ({
            id: shift.id,
            title: shift.description || 'Volunteer Shift',
            description: shift.description || 'No description available',
            date: shift.date ? new Date(shift.date).toISOString().split('T')[0] : '',
            startTime: shift.start_time ? (shift.start_time.includes('T') ? shift.start_time.split('T')[1].slice(0, 5) : '09:00') : '09:00',
            endTime: shift.end_time ? (shift.end_time.includes('T') ? shift.end_time.split('T')[1].slice(0, 5) : '17:00') : '17:00',
            location: shift.location || 'Location TBD',
            capacity: shift.max_volunteers || 1,
            enrolled: shift.flexible_slots_used || 0,
            role: shift.role || 'Volunteer',
            coordinator: {
              name: 'Volunteer Coordinator',
              email: 'coordinator@charity.org',
              phone: '+44 7123 456789',
              avatar: '/avatars/default.jpg'
            },
            type: (shift.type === 'fixed' || shift.type === 'flexible' || shift.type === 'open') ? shift.type : 'fixed',
            priority: (shift.priority === 'urgent' || shift.priority === 'high' || shift.priority === 'normal' || shift.priority === 'low') ? shift.priority : 'normal',
            skills: shift.required_skills ? shift.required_skills.split(',').map((s: string) => s.trim()) : [],
            requirements: [],
            impact: (shift.priority === 'urgent' || shift.priority === 'high') ? 'high' : shift.priority === 'normal' ? 'medium' : 'low',
            timeCommitment: calculateTimeCommitment(shift.start_time, shift.end_time),
            isBookmarked: false,
            distance: 'Distance TBD',
            category: getCategoryFromRole(shift.role)
          }));
          console.log('Transformed shifts count:', transformedShifts.length);
          if (transformedShifts.length === 0) {
            console.warn('No shifts available or transformation failed');
          }
          setShifts(transformedShifts);
        } else {
          // Fallback to mock data
          const mockShifts: VolunteerShift[] = [
            {
              id: 1,
              title: 'Food Distribution Support',
              description: 'Help distribute food packages to community members in need. Training provided on-site.',
              date: '2025-07-08',
              startTime: '14:00',
              endTime: '17:00',
              location: 'Main Community Center',
              capacity: 8,
              enrolled: 5,
              role: 'Food Distribution',
              coordinator: {
                name: 'Sarah Wilson',
                email: 'sarah@charity.org',
                phone: '+44 7123 456789',
                avatar: '/avatars/sarah.jpg'
              },
              type: 'fixed',
              priority: 'high',
              skills: ['Communication', 'Physical Fitness'],
              requirements: ['Background Check', 'Food Safety Training'],
              impact: 'high',
              timeCommitment: '3 hours',
              isBookmarked: false,
              distance: '2.1 miles',
              category: 'Food & Nutrition'
            },
            {
              id: 2,
              title: 'Elderly Care Companion',
              description: 'Spend quality time with elderly residents, engage in activities and provide companionship.',
              date: '2025-07-09',
              startTime: '10:00',
              endTime: '14:00',
              location: 'Sunshine Care Home',
              capacity: 4,
              enrolled: 2,
              role: 'Companion',
              coordinator: {
                name: 'Michael Chen',
                email: 'michael@charity.org',
                avatar: '/avatars/michael.jpg'
              },
              type: 'flexible',
              priority: 'normal',
              skills: ['Empathy', 'Communication'],
              requirements: ['DBS Check', 'Safeguarding Training'],
              impact: 'medium',
              timeCommitment: '4 hours',
              isBookmarked: true,
              distance: '1.8 miles',
              category: 'Elderly Care'
            },
            {
              id: 3,
              title: 'Environmental Cleanup',
              description: 'Join our team to clean up local parks and green spaces. Help make our community beautiful.',
              date: '2025-07-10',
              startTime: '09:00',
              endTime: '13:00',
              location: 'Greenwich Park',
              capacity: 15,
              enrolled: 12,
              role: 'Environmental Volunteer',
              coordinator: {
                name: 'Emma Thompson',
                email: 'emma@charity.org',
                avatar: '/avatars/emma.jpg'
              },
              type: 'open',
              priority: 'normal',
              skills: ['Physical Fitness'],
              requirements: ['Safety Briefing'],
              impact: 'medium',
              timeCommitment: '4 hours',
              isBookmarked: false,
              distance: '3.2 miles',
              category: 'Environment'
            },
            {
              id: 4,
              title: 'Youth Mentoring Session',
              description: 'Support young people with homework, career guidance, and life skills development.',
              date: '2025-07-11',
              startTime: '16:00',
              endTime: '18:00',
              location: 'Community Youth Center',
              capacity: 6,
              enrolled: 3,
              role: 'Mentor',
              coordinator: {
                name: 'David Johnson',
                email: 'david@charity.org',
                avatar: '/avatars/david.jpg'
              },
              type: 'fixed',
              priority: 'urgent',
              skills: ['Communication', 'Leadership', 'Patience'],
              requirements: ['Enhanced DBS', 'Safeguarding Training', 'Mentoring Training'],
              impact: 'high',
              timeCommitment: '2 hours',
              isBookmarked: true,
              distance: '1.5 miles',
              category: 'Youth & Education'
            },
            {
              id: 5,
              title: 'Administrative Support',
              description: 'Help with data entry, filing, and general office tasks to support our charity operations.',
              date: '2025-07-12',
              startTime: '09:00',
              endTime: '12:00',
              location: 'Charity Main Office',
              capacity: 3,
              enrolled: 1,
              role: 'Admin Support',
              coordinator: {
                name: 'Lisa Rodriguez',
                email: 'lisa@charity.org',
                avatar: '/avatars/lisa.jpg'
              },
              type: 'flexible',
              priority: 'low',
              skills: ['Computer Skills', 'Attention to Detail'],
              requirements: ['Basic Computer Skills'],
              impact: 'low',
              timeCommitment: '3 hours',
              isBookmarked: false,
              distance: '2.8 miles',
              category: 'Administration'
            }
          ];
          setShifts(mockShifts);
        }
      } catch (error) {
        console.error('Shifts loading error:', error);
        toast({
          title: 'Error',
          description: 'Failed to load shifts. Using offline data.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadShifts();
  }, [toast]);

  // Filter and sort shifts
  const filteredShifts = useMemo(() => {
    let filtered = shifts.filter(shift => {
      const matchesSearch = shift.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           shift.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           shift.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || shift.category === selectedCategory;
      const matchesLocation = selectedLocation === 'all' || shift.location === selectedLocation;
      const matchesType = selectedType === 'all' || shift.type === selectedType;
      const matchesImpact = selectedImpact === 'all' || shift.impact === selectedImpact;
      
      return matchesSearch && matchesCategory && matchesLocation && matchesType && matchesImpact;
    });

    // Sort shifts
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date + ' ' + a.startTime);
          bValue = new Date(b.date + ' ' + b.startTime);
          break;
        case 'capacity':
          aValue = (a.capacity - a.enrolled) / a.capacity;
          bValue = (b.capacity - b.enrolled) / b.capacity;
          break;
        case 'distance':
          aValue = parseFloat(a.distance?.replace(' miles', '') || '0');
          bValue = parseFloat(b.distance?.replace(' miles', '') || '0');
          break;
        case 'impact':
          const impactOrder = { low: 1, medium: 2, high: 3 };
          aValue = impactOrder[a.impact];
          bValue = impactOrder[b.impact];
          break;
        default:
          aValue = a.title;
          bValue = b.title;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [shifts, searchTerm, selectedCategory, selectedLocation, selectedType, selectedImpact, sortBy, sortOrder]);

  const handleSignUp = async (shiftId: number) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;

    // If it's a flexible shift, show the time picker dialog
    if (shift.type === 'flexible') {
      setSelectedShift(shift);
      setShowFlexibleSignup(true);
      return;
    }

    // For fixed shifts, proceed with direct signup
    setSigningUp(shiftId);
    try {
      const response = await apiClient.post(`/api/v1/volunteer/shifts/${shiftId}/signup`);

      if (response.ok) {
        toast({
          title: 'Success!',
          description: 'You have successfully signed up for this shift.',
        });
        
        // Update shifts data
        setShifts(prev => prev.map(shift => 
          shift.id === shiftId 
            ? { ...shift, enrolled: shift.enrolled + 1 }
            : shift
        ));
      } else {
        throw new Error('Failed to sign up');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign up for shift. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSigningUp(null);
    }
  };

  const handleFlexibleSignup = async (shiftId: number, timeSelection: {
    startTime: string;
    endTime: string;
    duration: number;
  }) => {
    try {
      const response = await apiClient.post(`/api/v1/volunteer/shifts/${shiftId}/signup`, {
        flexible_start_time: timeSelection.startTime,
        flexible_end_time: timeSelection.endTime,
        flexible_duration: timeSelection.duration
      });

      if (response.ok) {
        toast({
          title: 'Success!',
          description: `You've signed up for ${timeSelection.duration} hours from ${timeSelection.startTime} to ${timeSelection.endTime}.`,
        });
        
        // Update shifts data
        setShifts(prev => prev.map(shift => 
          shift.id === shiftId 
            ? { ...shift, enrolled: shift.enrolled + 1 }
            : shift
        ));
      } else {
        throw new Error('Failed to sign up for flexible shift');
      }
    } catch (error) {
      console.error('Flexible shift signup error:', error);
      toast({
        title: 'Sign-up Failed',
        description: 'Failed to sign up for this flexible shift. Please try again.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleViewDetails = (shift: VolunteerShift) => {
    setSelectedShift(shift);
    setShowShiftDetails(true);
  };

  const toggleBookmark = (shiftId: number) => {
    setShifts(prev => prev.map(shift => 
      shift.id === shiftId 
        ? { ...shift, isBookmarked: !shift.isBookmarked }
        : shift
    ));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fixed': return <Calendar className="h-4 w-4" />;
      case 'flexible': return <Clock className="h-4 w-4" />;
      case 'open': return <Users className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading available shifts...</p>
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
                Available Shifts
              </h1>
              <p className="text-muted-foreground mt-1">
                Discover volunteer opportunities that match your interests and skills
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                {filteredShifts.length} shifts found
              </Badge>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : ''}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-blue-50 text-blue-600' : ''}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div 
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm"
          variants={itemVariants}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search shifts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Food & Nutrition">Food & Nutrition</SelectItem>
                <SelectItem value="Elderly Care">Elderly Care</SelectItem>
                <SelectItem value="Environment">Environment</SelectItem>
                <SelectItem value="Youth & Education">Youth & Education</SelectItem>
                <SelectItem value="Administration">Administration</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="fixed">Fixed Schedule</SelectItem>
                <SelectItem value="flexible">Flexible</SelectItem>
                <SelectItem value="open">Open</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedImpact} onValueChange={setSelectedImpact}>
              <SelectTrigger>
                <SelectValue placeholder="Impact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Impact</SelectItem>
                <SelectItem value="high">High Impact</SelectItem>
                <SelectItem value="medium">Medium Impact</SelectItem>
                <SelectItem value="low">Low Impact</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="capacity">Availability</SelectItem>
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="impact">Impact</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Shifts Grid/List */}
        <AnimatePresence mode="wait">
          {filteredShifts.length === 0 ? (
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                No shifts found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or check back later for new opportunities
              </p>
            </motion.div>
          ) : (
            <motion.div 
              className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}
              variants={itemVariants}
            >
              {filteredShifts.map((shift) => (
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
                            <Badge className={`${getPriorityColor(shift.priority)} text-xs`}>
                              {shift.priority.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {shift.type}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            {shift.title}
                          </CardTitle>
                          <CardDescription className="text-sm text-muted-foreground mt-1">
                            {shift.category}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleBookmark(shift.id)}
                          className="text-muted-foreground hover:text-yellow-500"
                        >
                          {shift.isBookmarked ? (
                            <BookmarkCheck className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">
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
                          {shift.type === 'flexible' && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                              Choose your hours
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-purple-600" />
                          <span className="truncate">{shift.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-orange-600" />
                          <span>{shift.enrolled}/{shift.capacity} signed up</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={`${getImpactColor(shift.impact)} text-xs`}>
                            {shift.impact.toUpperCase()} IMPACT
                          </Badge>
                          {shift.distance && (
                            <span className="text-xs text-muted-foreground">
                              {shift.distance}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {shift.timeCommitment}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Availability</span>
                          <span className="font-medium">
                            {shift.capacity - shift.enrolled} spots left
                          </span>
                        </div>
                        <Progress 
                          value={(shift.enrolled / shift.capacity) * 100} 
                          className="h-2"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2">
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
                        <Button
                          onClick={() => handleSignUp(shift.id)}
                          disabled={signingUp === shift.id || shift.enrolled >= shift.capacity}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          {signingUp === shift.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Signing up...
                            </>
                          ) : shift.enrolled >= shift.capacity ? (
                            'Full'
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
                              {shift.type === 'flexible' ? 'Choose Time & Sign Up' : 'Sign Up'}
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(shift)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Shift Details Dialog */}
      <Dialog open={showShiftDetails} onOpenChange={setShowShiftDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Shift Details</DialogTitle>
            <DialogDescription>
              Complete information about this volunteer opportunity
            </DialogDescription>
          </DialogHeader>
          
          {selectedShift && (
            <div className="space-y-6 mt-4">
              {/* Header Section */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{selectedShift.title}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`${getPriorityColor(selectedShift.priority)}`}>
                      {selectedShift.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">
                      {selectedShift.type}
                    </Badge>
                    <Badge className={`${getImpactColor(selectedShift.impact)}`}>
                      {selectedShift.impact.toUpperCase()} IMPACT
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{selectedShift.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleBookmark(selectedShift.id)}
                  className="text-muted-foreground hover:text-yellow-500"
                >
                  {selectedShift.isBookmarked ? (
                    <BookmarkCheck className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Bookmark className="h-5 w-5" />
                  )}
                </Button>
              </div>

              {/* Key Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Date</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedShift.date).toLocaleDateString('en-GB', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Time</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedShift.startTime} - {selectedShift.endTime}
                        {selectedShift.type === 'flexible' && (
                          <span className="text-blue-600 ml-2">(Flexible timing available)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{selectedShift.location}</p>
                      {selectedShift.distance && (
                        <p className="text-xs text-muted-foreground">Distance: {selectedShift.distance}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium">Availability</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedShift.enrolled}/{selectedShift.capacity} signed up
                      </p>
                      <div className="mt-2">
                        <Progress 
                          value={(selectedShift.enrolled / selectedShift.capacity) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Timer className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">Time Commitment</p>
                      <p className="text-sm text-muted-foreground">{selectedShift.timeCommitment}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Award className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">Role</p>
                      <p className="text-sm text-muted-foreground">{selectedShift.role}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills & Requirements */}
              {(selectedShift.skills && selectedShift.skills.length > 0) && (
                <div>
                  <h4 className="font-semibold mb-3">Skills Needed</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedShift.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(selectedShift.requirements && selectedShift.requirements.length > 0) && (
                <div>
                  <h4 className="font-semibold mb-3">Requirements</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedShift.requirements.map((req, index) => (
                      <Badge key={index} variant="outline">
                        {req}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Coordinator Information */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Shift Coordinator</h4>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedShift.coordinator.avatar} alt={selectedShift.coordinator.name} />
                    <AvatarFallback>
                      {selectedShift.coordinator.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedShift.coordinator.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedShift.coordinator.email}</p>
                    {selectedShift.coordinator.phone && (
                      <p className="text-sm text-muted-foreground">{selectedShift.coordinator.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowShiftDetails(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowShiftDetails(false);
                    handleSignUp(selectedShift.id);
                  }}
                  disabled={selectedShift.enrolled >= selectedShift.capacity}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {selectedShift.enrolled >= selectedShift.capacity ? 'Full' : 'Sign Up'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Flexible Shift Signup Dialog */}
      <FlexibleShiftSignupDialog
        shift={selectedShift}
        open={showFlexibleSignup}
        onClose={() => {
          setShowFlexibleSignup(false);
          setSelectedShift(null);
        }}
        onConfirm={handleFlexibleSignup}
      />
    </motion.div>
  );
}
