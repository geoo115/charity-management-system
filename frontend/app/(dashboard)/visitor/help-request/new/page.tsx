'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Clock, FileText, CheckCircle2, Loader2, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams } from 'next/navigation';
import { 
  createHelpRequest,
  getAvailableDays,
  getTimeSlots,
  canCreateNewHelpRequest
} from '@/lib/api/help-requests';
import { formatDate } from '@/lib/utils/date-utils';
import { PendingRequestWarning } from '@/components/visitor/pending-request-warning';
import { HelpRequest } from '@/lib/types/visitor';
import { submitHelpRequest } from '@/lib/api/visitor';

const formSchema = z.object({
  category: z.enum(['Food', 'General']),
  details: z.string().min(10, 'Please provide more details about your needs'),
  visit_day: z.string({ required_error: 'Please select a date' }),
  time_slot: z.string({ required_error: 'Please select a time slot' }),
  urgency_level: z.enum(['Low', 'Medium', 'High']).optional(),
  household_size: z.number().min(1, 'Household size must be at least 1').max(20, 'Household size cannot exceed 20').optional(),
  special_needs: z.string().optional(),
});

export default function NewHelpRequest() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDays, setLoadingDays] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Pending request check state
  const [canCreate, setCanCreate] = useState<boolean | null>(null);
  const [pendingRequests, setPendingRequests] = useState<HelpRequest[]>([]);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [eligibilityData, setEligibilityData] = useState<any>(null);

  // Get category from URL parameters
  const categoryParam = searchParams.get('category');
  const defaultCategory = (categoryParam === 'Food' || categoryParam === 'General') 
    ? categoryParam 
    : 'Food' as const;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: defaultCategory,
      details: '',
      visit_day: '',
      time_slot: '',
      urgency_level: 'Medium',
      household_size: 1,
      special_needs: '',
    },
  });


  // Check if user can create new request on component mount and when category changes
  useEffect(() => {
    const checkEligibility = async () => {
      setCheckingEligibility(true);
      try {
        // Use category-specific eligibility checking
        const eligibilityCheck = await canCreateNewHelpRequest(defaultCategory);
        setCanCreate(eligibilityCheck.canCreate);
        setEligibilityData(eligibilityCheck.eligibilityData);
        
        if (!eligibilityCheck.canCreate) {
          if (eligibilityCheck.pendingRequests) {
            setPendingRequests(eligibilityCheck.pendingRequests);
          }
        }
      } catch (error) {
        console.error('Error checking eligibility:', error);
        // If check fails, allow creation (fail-safe approach)
        setCanCreate(true);
      } finally {
        setCheckingEligibility(false);
      }
    };

    checkEligibility();
  }, [defaultCategory]);

  // Re-check eligibility when category changes in the form
  const selectedCategory = form.watch('category');
  useEffect(() => {
    const recheckEligibility = async () => {
      if (selectedCategory !== defaultCategory) {
        try {
          const eligibilityCheck = await canCreateNewHelpRequest(selectedCategory);
          setCanCreate(eligibilityCheck.canCreate);
          setEligibilityData(eligibilityCheck.eligibilityData);
          
          if (!eligibilityCheck.canCreate) {
            if (eligibilityCheck.pendingRequests) {
              setPendingRequests(eligibilityCheck.pendingRequests);
            }
          }
        } catch (error) {
          console.error('Error re-checking eligibility:', error);
        }
      }
    };

    recheckEligibility();
  }, [selectedCategory, defaultCategory]);

  // Load available days when category changes
  useEffect(() => {
    const loadAvailableDays = async () => {
      setLoadingDays(true);
      try {
        const days = await getAvailableDays(selectedCategory);
        setAvailableDays(days);
        // Reset form fields when category changes
        form.setValue('visit_day', '');
        form.setValue('time_slot', '');
        setTimeSlots([]);
      } catch (err: any) {
        console.error('Error loading available days:', err);
        toast({
          title: "Error loading available days",
          description: "Using default operating schedule (Tuesday, Wednesday, Thursday)",
          variant: "destructive",
        });
        // The API function now provides its own fallback
        setAvailableDays([]);
      } finally {
        setLoadingDays(false);
      }
    };

    loadAvailableDays();
  }, [selectedCategory, toast, form]);

  // Load time slots when date changes
  const selectedVisitDay = form.watch('visit_day');
  useEffect(() => {
    if (!selectedVisitDay) {
      setTimeSlots([]);
      return;
    }
    
    const loadTimeSlots = async (selectedDate: string) => {
      setLoadingSlots(true);
      // Reset time slot when date changes
      form.setValue('time_slot', '');
      try {
        console.log('Loading time slots for date:', selectedDate, 'category:', selectedCategory);
        const slots = await getTimeSlots(selectedDate, selectedCategory);
        console.log('Loaded time slots:', slots);
        setTimeSlots(slots);
      } catch (err: any) {
        console.error('Error loading time slots:', err);
        toast({
          title: "Error loading time slots",
          description: err.message || "Could not load available time slots",
          variant: "destructive",
        });
        setTimeSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    
    loadTimeSlots(selectedVisitDay);
  }, [selectedVisitDay, selectedCategory, toast, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      // Double-check category-specific eligibility before submission
      const eligibilityCheck = await canCreateNewHelpRequest(values.category);
      if (!eligibilityCheck.canCreate) {
        toast({
          title: "Cannot Submit Request",
          description: eligibilityCheck.reason || "You are not currently eligible for this service category.",
          variant: "destructive",
        });
        setCanCreate(false);
        if (eligibilityCheck.pendingRequests) {
          setPendingRequests(eligibilityCheck.pendingRequests);
        }
        return;
      }

      // Send all fields required by backend
      const payload = {
        category: values.category,
        details: values.details,
        visit_day: values.visit_day,
        time_slot: values.time_slot,
        urgency_level: values.urgency_level,
        household_size: values.household_size,
        special_needs: values.special_needs,
      };

      console.log('Submitting form with payload:', payload);
      const response = await submitHelpRequest(payload);
      
      toast({
        title: "Request Submitted",
        description: `Your help request has been submitted with reference ${response.reference}`,
      });
      
      router.push('/visitor');
    } catch (error: any) {
      // Handle authentication errors (401)
      if (error?.response?.status === 401 || error?.status === 401 || error?.message?.toLowerCase().includes('unauthorized')) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again to continue.",
          variant: "destructive",
        });
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/auth/login');
        }, 1500);
        return;
      }
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit your request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Request Help</h1>
      
      {/* Show loading state while checking eligibility */}
      {checkingEligibility && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Checking your eligibility...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show warning if user has pending requests */}
      {!checkingEligibility && canCreate === false && (
        <PendingRequestWarning 
          pendingRequests={pendingRequests} 
          eligibilityData={eligibilityData}
          requestedCategory={selectedCategory}
        />
      )}

      {/* Show form if user can create new requests */}
      {!checkingEligibility && canCreate === true && (
        <Card>
          <CardHeader>
            <CardTitle>Help Request Form</CardTitle>
            <CardDescription>
              Please provide details about the help you need, and select a convenient time to visit.
            </CardDescription>
          </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {/* Category Selection */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What kind of help do you need?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Food">Food Support</SelectItem>
                        <SelectItem value="General">General Support</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Details */}
              <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provide details about your needs</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please describe what you need help with"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Urgency Level */}
              <FormField
                control={form.control}
                name="urgency_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgency Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select urgency level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Please indicate how urgent your request is
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Household Size */}
              <FormField
                control={form.control}
                name="household_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Household Size</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        placeholder="Number of people in your household"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>
                      How many people are in your household?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Special Needs */}
              <FormField
                control={form.control}
                name="special_needs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Needs (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please describe any special requirements or accessibility needs"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Let us know if you have any special requirements, dietary restrictions, or accessibility needs
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Visit Day */}
              <FormField
                control={form.control}
                name="visit_day"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Preferred visit day</FormLabel>
                    <div className="mb-2">
                      {loadingDays && (
                        <div className="text-sm text-muted-foreground">
                          Loading available dates...
                        </div>
                      )}
                      {!loadingDays && availableDays.length === 0 && (
                        <div className="text-sm text-destructive">
                          No available dates found. Please try again or contact support.
                        </div>
                      )}
                      {!loadingDays && availableDays.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {availableDays.length} dates available (Tuesday, Wednesday, Thursday)
                        </div>
                      )}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={loadingDays || availableDays.length === 0}
                          >
                            {loadingDays ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : field.value ? (
                              formatDate(new Date(field.value))
                            ) : (
                              <span>Select visit date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const formattedDate = formatDate(date, { dateFormat: 'yyyy-MM-dd' });
                              field.onChange(formattedDate);
                            }
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            
                            const formattedDate = formatDate(date, { dateFormat: 'yyyy-MM-dd' });
                            const isPastDate = date < today;
                            const isNotAvailable = !availableDays.includes(formattedDate);
                            
                            // Allow selection only for available operating days
                            
                            // Disable past dates and dates not in available days
                            return isPastDate || isNotAvailable;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time Slot */}
              <FormField
                control={form.control}
                name="time_slot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred time slot</FormLabel>
                    {loadingSlots && (
                      <div className="text-sm text-muted-foreground mb-2">
                        Loading available time slots...
                      </div>
                    )}
                    {!loadingSlots && timeSlots.length === 0 && selectedVisitDay && (
                      <div className="text-sm text-destructive mb-2">
                        No time slots available for this date.
                      </div>
                    )}
                    {!loadingSlots && timeSlots.length > 0 && (
                      <div className="text-sm text-muted-foreground mb-2">
                        {timeSlots.filter(slot => slot.available).length} of {timeSlots.length} slots available
                      </div>
                    )}
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loadingSlots || !selectedVisitDay}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingSlots ? "Loading time slots..." : "Select time slot"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.length > 0 ? (
                          timeSlots.map((slot, index) => (
                            <SelectItem
                              key={`slot-${index}-${slot.time}`}
                              value={slot.time}
                              disabled={!slot.available}
                            >
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                <span>{slot.time}</span>
                                {!slot.available && (
                                  <span className="text-xs text-red-500 ml-2">(Full)</span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-slots" disabled>
                            {selectedVisitDay ? "No time slots available" : "Select a date first"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <div className="flex justify-end space-x-2 p-6 pt-0">
              <Button 
                variant="outline" 
                onClick={() => router.back()} 
                type="button"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Help Request
              </Button>
            </div>
          </form>
        </Form>
      </Card>
      )}
    </div>
  );
}
