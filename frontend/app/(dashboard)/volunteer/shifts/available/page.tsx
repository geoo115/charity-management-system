'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';
import EnhancedShiftCard from '@/components/volunteer/enhanced-shift-card';
import FlexibleShiftSignupDialog from '@/components/volunteer/flexible-shift-signup-dialog';

// Icons
import { 
  Calendar, Clock, MapPin, Users, Phone, Star, BookmarkCheck, Bookmark,
  Search, Filter, SlidersHorizontal, ArrowUpDown, RefreshCw, AlertTriangle,
  Grid3X3, List, Heart, Zap, Target, CheckCircle, Loader2, InfoIcon, Globe
} from 'lucide-react';

// Types
import { VolunteerShift } from '@/lib/types/volunteer';
import { formatDate, formatTime } from '@/lib/utils/date-utils';
import { fetchAvailableShifts, signupForShift, validateShiftAvailability, cancelShift } from '@/lib/api/volunteer';
import ShiftConflictDialog from '@/components/volunteer/shift-conflict-dialog';

interface FilterState {
  roles: string[];
  locations: string[];
  timeSlots: string[];
  skills: string[];
  priorities: string[];
}


export default function AvailableShiftsPage() {
  // State management
  const [shifts, setShifts] = useState<VolunteerShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [signingUp, setSigningUp] = useState<number | null>(null);
  const [bookmarkedShifts, setBookmarkedShifts] = useState<Set<number>>(new Set());
  
  // Conflict resolution state
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [targetShift, setTargetShift] = useState<VolunteerShift | null>(null);
  const [conflictingShifts, setConflictingShifts] = useState<VolunteerShift[]>([]);
  
  // Flexible shift signup state
  const [showFlexibleSignupDialog, setShowFlexibleSignupDialog] = useState(false);
  const [flexibleShift, setFlexibleShift] = useState<VolunteerShift | null>(null);
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'capacity' | 'location'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [quickFilters, setQuickFilters] = useState({
    today: false,
    thisWeek: false,
    remote: false,
    mealProvided: false
  });

  const [filters, setFilters] = useState<FilterState>({
    roles: [],
    locations: [],
    timeSlots: [],
    skills: [],
    priorities: []
  });

  const { toast } = useToast();

  // Load shifts data
  useEffect(() => {
    const loadShifts = async () => {
      try {
        setLoading(true);
        const shiftsData = await fetchAvailableShifts();
        setShifts(shiftsData);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load shifts');
        setShifts([]);
        toast({
          title: 'Error',
          description: 'Failed to load available shifts',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadShifts();
  }, [toast]);

  // Refresh data function
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const shiftsData = await fetchAvailableShifts();
      setShifts(shiftsData);
      toast({
        title: 'Success',
        description: 'Shifts refreshed successfully'
      });
    } catch (err: any) {
      setShifts([]);
      toast({
        title: 'Error',
        description: 'Failed to refresh shifts',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  }, [toast]);

  // Enhanced filtering and sorting logic
  const uniqueRoles = useMemo(() => shifts ? [...new Set(shifts.map(shift => shift.role))] : [], [shifts]);
  const uniqueLocations = useMemo(() => shifts ? [...new Set(shifts.map(shift => shift.location))] : [], [shifts]);
  const uniqueSkills = useMemo(() => {
    const allSkills = shifts.flatMap((shift: any) => shift.skills || []);
    return [...new Set(allSkills)];
  }, [shifts]);
  const uniquePriorities = useMemo(() => {
    const priorities = shifts.map((shift: any) => shift.priority || 'normal');
    return [...new Set(priorities)];
  }, [shifts]);

  // Advanced filtering
  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      const shiftData = shift as any;
      
      // Text search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const searchMatch = 
          shift.title.toLowerCase().includes(searchLower) ||
          shift.description.toLowerCase().includes(searchLower) ||
          shift.location.toLowerCase().includes(searchLower) ||
          shift.role.toLowerCase().includes(searchLower) ||
          (shiftData.skills && shiftData.skills.some((skill: string) => 
            skill.toLowerCase().includes(searchLower)
          ));
        if (!searchMatch) return false;
      }

      // Date filter
      if (selectedDate) {
        const shiftDate = new Date(shift.date);
        const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        const shiftDateOnly = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate());
        if (shiftDateOnly.getTime() !== selectedDateOnly.getTime()) return false;
      }

      // Urgent only filter
      if (showUrgentOnly && shiftData.priority !== 'urgent') return false;

      // Role filter
      if (filters.roles.length > 0 && !filters.roles.includes(shift.role)) return false;

      // Location filter
      if (filters.locations.length > 0 && !filters.locations.includes(shift.location)) return false;

      // Skills filter
      if (filters.skills.length > 0) {
        const hasRequiredSkill = filters.skills.some(skill => 
          shiftData.skills && shiftData.skills.includes(skill)
        );
        if (!hasRequiredSkill) return false;
      }

      // Priority filter
      if (filters.priorities.length > 0 && !filters.priorities.includes(shiftData.priority || 'normal')) return false;

      return true;
    });
  }, [shifts, searchTerm, selectedDate, filters, showUrgentOnly]);

  // Enhanced sorting
  const sortedShifts = useMemo(() => {
    return [...filteredShifts].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'priority':
          const priorityOrder = { urgent: 3, high: 2, normal: 1, low: 0 };
          const aPriority = (a as any).priority || 'normal';
          const bPriority = (b as any).priority || 'normal';
          comparison = priorityOrder[bPriority as keyof typeof priorityOrder] - priorityOrder[aPriority as keyof typeof priorityOrder];
          break;
        case 'capacity':
          const aAvailable = a.capacity - a.enrolled;
          const bAvailable = b.capacity - b.enrolled;
          comparison = bAvailable - aAvailable;
          break;
        case 'location':
          comparison = a.location.localeCompare(b.location);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredShifts, sortBy, sortOrder]);

  const handleSignup = async (shiftId: number) => {
    setSigningUp(shiftId);
    try {
      // Find the shift to determine if it's flexible
      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) {
        toast({
          title: 'Error',
          description: 'Shift not found.',
          variant: 'destructive'
        });
        return;
      }

      // Check if this is a flexible shift
      if ((shift as any).type === 'flexible') {
        setFlexibleShift(shift);
        setShowFlexibleSignupDialog(true);
        setSigningUp(null); // Reset signing up state since dialog will handle it
        return;
      }

      // First validate shift availability for fixed shifts
      const validationResult = await validateShiftAvailability(shiftId) as any;
      if (!validationResult.available) {
        // Check if it's a conflict error
        if (validationResult.conflicts && validationResult.conflicts.length > 0) {
          // Show conflict resolution dialog
          if (shift) {
            setTargetShift(shift);
            setConflictingShifts(validationResult.conflicts);
            setShowConflictDialog(true);
          }
          return;
        }
        
        toast({
          title: 'Shift Unavailable',
          description: validationResult.reason || 'This shift is no longer available.',
          variant: 'destructive'
        });
        return;
      }

      // Proceed with sign-up
      const result = await signupForShift(shiftId) as any;
      
      // Update local state to remove the shift from available shifts
      setShifts(prev => prev.filter(shift => shift.id !== shiftId));
      
      toast({
        title: 'Success!',
        description: result.message || 'You have successfully signed up for this shift.',
      });

      // Optional: Refresh shifts to get updated list
      setTimeout(() => {
        refreshData();
      }, 1000);
      
    } catch (err: any) {
      // Enhanced error handling
      const errorMessage = err.message || 'Failed to sign up for shift';
      
      if (errorMessage.includes('conflict')) {
        toast({
          title: 'Schedule Conflict',
          description: 'You have another shift scheduled at this time. Please check your schedule.',
          variant: 'destructive'
        });
      } else if (errorMessage.includes('assigned')) {
        toast({
          title: 'Shift Already Assigned',
          description: 'This shift has been assigned to another volunteer.',
          variant: 'destructive'
        });
      } else if (errorMessage.includes('past')) {
        toast({
          title: 'Past Shift',
          description: 'Cannot sign up for shifts that have already passed.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Sign-up Failed',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    } finally {
      setSigningUp(null);
    }
  };

  const handleConflictResolution = async (resolution: any) => {
    try {
      if (resolution.action === 'cancel_conflicting' && resolution.shiftToCancel) {
        // Cancel the conflicting shift first
        await cancelShift(resolution.shiftToCancel, resolution.reason);
        
        // Then try to sign up for the target shift
        if (targetShift) {
          await handleSignup(targetShift.id);
        }
      } else if (resolution.action === 'choose_different') {
        // User chose to pick a different shift - just close dialog
        toast({
          title: 'No Action Taken',
          description: 'Choose a different shift that doesn\'t conflict with your schedule.',
        });
      } else {
        // For other actions, show info message
        toast({
          title: 'Request Submitted',
          description: 'Your request has been noted. A volunteer coordinator will contact you.',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to resolve conflict',
        variant: 'destructive'
      });
    } finally {
      setShowConflictDialog(false);
      setTargetShift(null);
      setConflictingShifts([]);
    }
  };

  const handleFlexibleShiftSignup = async (shiftId: number, timeSelection: {
    startTime: string;
    endTime: string;
    duration: number;
  }) => {
    try {
      // Sign up with flexible time selection
      const result = await signupForShift(shiftId, timeSelection) as any;
      
      // Update local state to remove the shift from available shifts
      setShifts(prev => prev.filter(shift => shift.id !== shiftId));
      
      toast({
        title: 'Success!',
        description: `You've signed up for ${timeSelection.duration} hours from ${timeSelection.startTime} to ${timeSelection.endTime}.`,
      });

      // Refresh shifts to get updated list
      setTimeout(() => {
        refreshData();
      }, 1000);
      
    } catch (err: any) {
      // Enhanced error handling for flexible shifts
      const errorMessage = err.message || 'Failed to sign up for flexible shift';
      
      if (errorMessage.includes('conflict')) {
        toast({
          title: 'Schedule Conflict',
          description: 'Your selected time conflicts with another shift. Please choose different hours.',
          variant: 'destructive'
        });
      } else if (errorMessage.includes('assigned') || errorMessage.includes('full')) {
        toast({
          title: 'Shift Capacity Reached',
          description: 'This shift has reached its capacity. Please try a different shift.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Sign-up Failed',
          description: errorMessage,
          variant: 'destructive'
        });
      }
      throw err; // Re-throw to let the dialog handle the error state
    }
  };

  const toggleBookmark = (shiftId: number) => {
    setBookmarkedShifts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shiftId)) {
        newSet.delete(shiftId);
      } else {
        newSet.add(shiftId);
      }
      return newSet;
    });
  };

  const toggleRoleFilter = (role: string) => {
    setFilters(prev => {
      const roles = prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role];
      return { ...prev, roles };
    });
  };

  const toggleLocationFilter = (location: string) => {
    setFilters(prev => {
      const locations = prev.locations.includes(location)
        ? prev.locations.filter(l => l !== location)
        : [...prev.locations, location];
      return { ...prev, locations };
    });
  };

  const toggleSkillFilter = (skill: string) => {
    setFilters(prev => {
      const skills = prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill];
      return { ...prev, skills };
    });
  };

  const togglePriorityFilter = (priority: string) => {
    setFilters(prev => {
      const priorities = prev.priorities.includes(priority)
        ? prev.priorities.filter(p => p !== priority)
        : [...prev.priorities, priority];
      return { ...prev, priorities };
    });
  };

  const clearAllFilters = () => {
    setFilters({ roles: [], locations: [], timeSlots: [], skills: [], priorities: [] });
    setSelectedDate(undefined);
    setSearchTerm('');
    setShowUrgentOnly(false);
    setQuickFilters({ today: false, thisWeek: false, remote: false, mealProvided: false });
  };

  const applyQuickFilter = (filterName: string) => {
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    setQuickFilters(prev => ({ ...prev, [filterName]: !prev[filterName as keyof typeof prev] }));
    
    // Apply filter logic based on type
    switch (filterName) {
      case 'today':
        setSelectedDate(today);
        break;
      case 'thisWeek':
        // Filter for this week in filteredShifts logic
        break;
      case 'remote':
      case 'mealProvided':
        // These will be handled in the filtering logic
        break;
    }
  };

  // Enhanced filtering logic
  const enhancedFilteredShifts = useMemo(() => {
    let result = filteredShifts;

    // Apply quick filters
    if (quickFilters.thisWeek) {
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      result = result.filter(shift => {
        const shiftDate = new Date(shift.date);
        return shiftDate >= today && shiftDate <= weekFromNow;
      });
    }

    if (quickFilters.remote) {
      result = result.filter(shift => (shift as any).remote === true);
    }

    if (quickFilters.mealProvided) {
      result = result.filter(shift => (shift as any).mealProvided === true);
    }

    return result;
  }, [filteredShifts, quickFilters]);

  // Enhanced sorting - apply to enhanced filtered shifts
  const sortedEnhancedShifts = useMemo(() => {
    return [...enhancedFilteredShifts].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'priority':
          const priorityOrder = { urgent: 3, high: 2, normal: 1, low: 0 };
          const aPriority = (a as any).priority || 'normal';
          const bPriority = (b as any).priority || 'normal';
          comparison = priorityOrder[bPriority as keyof typeof priorityOrder] - priorityOrder[aPriority as keyof typeof priorityOrder];
          break;
        case 'capacity':
          const aAvailable = a.capacity - a.enrolled;
          const bAvailable = b.capacity - b.enrolled;
          comparison = bAvailable - aAvailable;
          break;
        case 'location':
          comparison = a.location.localeCompare(b.location);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [enhancedFilteredShifts, sortBy, sortOrder]);

  // Group shifts by date for calendar view
  const shiftsByDate = useMemo(() => {
    return sortedEnhancedShifts.reduce((acc, shift) => {
      const dateKey = formatDate(shift.date, { dateFormat: 'yyyy-MM-dd' });
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(shift);
      return acc;
    }, {} as Record<string, VolunteerShift[]>);
  }, [sortedEnhancedShifts]);

  // Render shifts based on view mode
  const renderShiftsGrid = () => {
    return (
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {sortedEnhancedShifts.map((shift) => (
          <EnhancedShiftCard
            key={shift.id}
            shift={shift}
            onSignUp={handleSignup}
            onBookmark={(shiftId) => {
              setBookmarkedShifts(prev => {
                const newSet = new Set(prev);
                if (newSet.has(shiftId)) {
                  newSet.delete(shiftId);
                } else {
                  newSet.add(shiftId);
                }
                return newSet;
              });
            }}
            isBookmarked={bookmarkedShifts.has(shift.id)}
            showCoordinator={true}
            userStatus={
              signingUp === shift.id ? 'available' : 
              bookmarkedShifts.has(shift.id) ? 'available' : 'available'
            }
          />
        ))}
      </div>
    );
  };

  const renderShiftsList = () => {
    return (
      <div className="space-y-3">
        {sortedEnhancedShifts.map((shift) => (
          <EnhancedShiftCard
            key={shift.id}
            shift={shift}
            onSignUp={handleSignup}
            onBookmark={(shiftId) => {
              setBookmarkedShifts(prev => {
                const newSet = new Set(prev);
                if (newSet.has(shiftId)) {
                  newSet.delete(shiftId);
                } else {
                  newSet.add(shiftId);
                }
                return newSet;
              });
            }}
            isBookmarked={bookmarkedShifts.has(shift.id)}
            compact={true}
            userStatus='available'
          />
        ))}
      </div>
    );
  };

  const renderCalendarView = () => {
    return (
      <div className="space-y-6">
        {Object.entries(shiftsByDate).map(([date, dayShifts]) => (
          <Card key={date}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {formatDate(date, { dateFormat: 'EEEE, MMMM d, yyyy' })}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''} available
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 lg:grid-cols-2">
                {dayShifts.map((shift: VolunteerShift) => (
                  <EnhancedShiftCard
                    key={shift.id}
                    shift={shift}
                    onSignUp={handleSignup}
                    onBookmark={(shiftId) => {
                      setBookmarkedShifts(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(shiftId)) {
                          newSet.delete(shiftId);
                        } else {
                          newSet.add(shiftId);
                        }
                        return newSet;
                      });
                    }}
                    isBookmarked={bookmarkedShifts.has(shift.id)}
                    compact={true}
                    userStatus='available'
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading available shifts..." />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Available Shifts</h1>
          <p className="text-muted-foreground">
            Find volunteer opportunities that match your skills and availability
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Badge variant="outline" className="font-normal">
            {sortedEnhancedShifts.length} shift{sortedEnhancedShifts.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <Card>
        <CardContent className="p-6">
          {/* Search Bar */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search shifts by title, location, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center rounded-lg border p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 p-0"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className="h-8 w-8 p-0"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>

              {/* Sort Options */}
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [newSortBy, newSortOrder] = value.split('-') as [typeof sortBy, typeof sortOrder];
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}>
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-asc">Date (Earliest)</SelectItem>
                  <SelectItem value="date-desc">Date (Latest)</SelectItem>
                  <SelectItem value="priority-desc">Priority (High to Low)</SelectItem>
                  <SelectItem value="capacity-desc">Most Spots Available</SelectItem>
                  <SelectItem value="location-asc">Location (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quick Filters</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={quickFilters.today ? "default" : "outline"}
                size="sm"
                onClick={() => applyQuickFilter('today')}
                className="h-8"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Today
              </Button>
              <Button
                variant={quickFilters.thisWeek ? "default" : "outline"}
                size="sm"
                onClick={() => applyQuickFilter('thisWeek')}
                className="h-8"
              >
                <Clock className="h-3 w-3 mr-1" />
                This Week
              </Button>
              <Button
                variant={showUrgentOnly ? "destructive" : "outline"}
                size="sm"
                onClick={() => setShowUrgentOnly(!showUrgentOnly)}
                className="h-8"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Urgent Only
              </Button>
              <Button
                variant={quickFilters.remote ? "default" : "outline"}
                size="sm"
                onClick={() => applyQuickFilter('remote')}
                className="h-8"
              >
                <Globe className="h-3 w-3 mr-1" />
                Remote
              </Button>
              <Button
                variant={quickFilters.mealProvided ? "default" : "outline"}
                size="sm"
                onClick={() => applyQuickFilter('mealProvided')}
                className="h-8"
              >
                <Heart className="h-3 w-3 mr-1" />
                Meal Provided
              </Button>
            </div>
          </div>

          {/* Advanced Filters - Collapsible */}
          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Filters</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Filters</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-3">
                {/* Date Filter */}
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        {selectedDate ? formatDate(selectedDate.toString()) : 'Any date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Location Filter */}
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select value={filters.locations[0] || undefined} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, locations: value ? [value] : [] }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Any location" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueLocations.map(location => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role Filter */}
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={filters.roles[0] || undefined} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, roles: value ? [value] : [] }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Any role" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueRoles.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Skills Filter */}
                <div className="space-y-2">
                  <Label>Skills Required</Label>
                  <Select value={filters.skills[0] || undefined} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, skills: value ? [value] : [] }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Any skills" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueSkills.map(skill => (
                        <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Filter */}
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={filters.priorities[0] || undefined} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, priorities: value ? [value] : [] }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Any priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniquePriorities.map(priority => (
                        <SelectItem key={priority} value={priority} className="capitalize">{priority}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Time Slot Filter */}
                <div className="space-y-2">
                  <Label>Time Preference</Label>
                  <Select value={filters.timeSlots[0] || undefined} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, timeSlots: value ? [value] : [] }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Any time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (6AM-12PM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12PM-6PM)</SelectItem>
                      <SelectItem value="evening">Evening (6PM-10PM)</SelectItem>
                      <SelectItem value="weekend">Weekend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration Filter */}
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={undefined} onValueChange={() => {}}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (1-3 hours)</SelectItem>
                      <SelectItem value="medium">Medium (3-6 hours)</SelectItem>
                      <SelectItem value="long">Long (6+ hours)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilters({ roles: [], locations: [], timeSlots: [], skills: [], priorities: [] });
                    setSelectedDate(undefined);
                    setShowUrgentOnly(false);
                    setQuickFilters({ today: false, thisWeek: false, remote: false, mealProvided: false });
                    setSearchTerm('');
                  }}
                  className="text-sm"
                >
                  Clear All Filters
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results Section */}
      <div className="space-y-4">
        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {sortedEnhancedShifts.length} of {shifts.length} shifts
            {searchTerm && ` for "${searchTerm}"`}
          </div>
          
          {sortedEnhancedShifts.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {sortedEnhancedShifts.filter(shift => (shift as any).priority === 'urgent').length} urgent shifts
            </div>
          )}
        </div>

        {/* Shifts Display */}
        {sortedEnhancedShifts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No shifts found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or search terms to find more opportunities.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({ roles: [], locations: [], timeSlots: [], skills: [], priorities: [] });
                    setSelectedDate(undefined);
                    setShowUrgentOnly(false);
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'grid' && renderShiftsGrid()}
            {viewMode === 'list' && renderShiftsList()}
            {viewMode === 'calendar' && renderCalendarView()}
          </>
        )}
      </div>

      {/* Conflict Resolution Dialog */}
      <ShiftConflictDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        targetShift={targetShift}
        conflictingShifts={conflictingShifts}
        onResolve={async (resolution) => {
          // Handle conflict resolution
          console.log('Conflict resolution:', resolution);
          setShowConflictDialog(false);
        }}
        onCancel={() => {
          setShowConflictDialog(false);
          setTargetShift(null);
          setConflictingShifts([]);
        }}
      />

      {/* Flexible Shift Signup Dialog */}
      <FlexibleShiftSignupDialog
        shift={flexibleShift}
        open={showFlexibleSignupDialog}
        onClose={() => {
          setShowFlexibleSignupDialog(false);
          setFlexibleShift(null);
        }}
        onConfirm={handleFlexibleShiftSignup}
      />
    </div>
  );
}
