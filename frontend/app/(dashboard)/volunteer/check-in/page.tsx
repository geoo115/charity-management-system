'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  QrCode, 
  Camera,
  UserCheck,
  Search,
  Calendar,
  AlertCircle,
  Info
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

// Validation schemas
const checkInSchema = z.object({
  ticketNumber: z.string().min(3, 'Please enter a valid ticket number'),
});

const searchSchema = z.object({
  searchTerm: z.string().min(2, 'Please enter at least 2 characters'),
  searchType: z.enum(['name', 'email', 'phone', 'postcode']),
});

type CheckInFormData = z.infer<typeof checkInSchema>;
type SearchFormData = z.infer<typeof searchSchema>;

interface CheckInResult {
  success: boolean;
  visitor: {
    id: number;
    name: string;
    email: string;
    phone: string;
    category: string;
    ticket_number: string;
  };
  queue: {
    position: number;
    estimated_wait_time: string;
    category: string;
  };
  messages: string[];
}

interface VisitorSearchResult {
  id: number;
  name: string;
  email: string;
  phone: string;
  postcode: string;
  last_visit?: string;
  status: 'verified' | 'pending' | 'rejected';
  has_ticket: boolean;
  ticket_number?: string;
  visit_date?: string;
}

export default function VolunteerCheckInPage() {
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [searchResults, setSearchResults] = useState<VisitorSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ticket');
  const { toast } = useToast();

  const checkInForm = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: { ticketNumber: '' },
  });

  const searchForm = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: { 
      searchTerm: '', 
      searchType: 'name' 
    },
  });

  const handleTicketCheckIn = async (data: CheckInFormData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/visitors/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          ticket_number: data.ticketNumber,
          staff_id: 1, // Volunteer acting as staff
          check_in_method: 'volunteer_assisted',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Check-in failed');
      }

      const result = await response.json();
      
      const checkInData: CheckInResult = {
        success: true,
        visitor: {
          id: result.visitor?.id || 0,
          name: result.visitor?.name || 'Unknown',
          email: result.visitor?.email || '',
          phone: result.visitor?.phone || '',
          category: result.ticket?.category || 'general',
          ticket_number: data.ticketNumber,
        },
        queue: {
          position: result.queue?.position || 1,
          estimated_wait_time: result.queue?.estimated_wait_time || '15-25 minutes',
          category: result.ticket?.category || 'general',
        },
        messages: [
          'Visitor successfully checked in',
          'Added to queue',
          'Please provide queue position card',
        ],
      };

      setCheckInResult(checkInData);
      toast({
        title: "Check-in Successful",
        description: `${checkInData.visitor.name} has been checked in and added to the queue.`,
      });

    } catch (error: any) {
      toast({
        title: "Check-in Failed",
        description: error.message || 'Please try again or contact admin.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVisitorSearch = async (data: SearchFormData) => {
    setSearchLoading(true);
    try {
      // Search for visitors using the API
      const response = await fetch(`/api/v1/visitors/search?term=${encodeURIComponent(data.searchTerm)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        
        if (results.length === 0) {
          toast({
            title: "No Results",
            description: "No visitors found matching your search criteria.",
          });
        }
      } else {
        // Log error and show appropriate message
        console.error('Visitor search API unavailable:', response.status);
        toast({
          title: "Search Unavailable",
          description: "Visitor search is temporarily unavailable. Please try again later.",
          variant: "destructive",
        });
        setSearchResults([]);
      }
    } catch (error: any) {
      toast({
        title: "Search Failed",
        description: error.message || 'Please try again.',
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleManualCheckIn = async (visitor: VisitorSearchResult) => {
    if (!visitor.has_ticket || !visitor.ticket_number) {
      toast({
        title: "No Valid Ticket",
        description: "This visitor doesn't have a valid ticket for today.",
        variant: "destructive",
      });
      return;
    }

    // Use the ticket check-in flow
    await handleTicketCheckIn({ ticketNumber: visitor.ticket_number });
  };

  const resetCheckIn = () => {
    setCheckInResult(null);
    setSearchResults([]);
    checkInForm.reset();
    searchForm.reset();
    setActiveTab('ticket');
  };

  if (checkInResult) {
    return (
      <div className="container mx-auto max-w-2xl py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-green-600">Check-in Successful!</h1>
          <p className="text-muted-foreground mt-2">
            Visitor has been processed and added to the queue
          </p>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              Check-in Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Visitor Information */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-green-800">Visitor Details</h4>
                <div className="text-sm space-y-1 text-green-700">
                  <p><strong>Name:</strong> {checkInResult.visitor.name}</p>
                  <p><strong>Email:</strong> {checkInResult.visitor.email}</p>
                  <p><strong>Category:</strong> {checkInResult.visitor.category}</p>
                  <p><strong>Ticket:</strong> {checkInResult.visitor.ticket_number}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-green-800">Queue Information</h4>
                <div className="text-sm space-y-1 text-green-700">
                  <p><strong>Position:</strong> #{checkInResult.queue.position}</p>
                  <p><strong>Wait Time:</strong> {checkInResult.queue.estimated_wait_time}</p>
                  <p><strong>Category:</strong> {checkInResult.queue.category}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Next Steps */}
            <div>
              <h4 className="font-medium text-green-800 mb-2">Next Steps:</h4>
              <ul className="space-y-1 text-sm text-green-700">
                {checkInResult.messages.map((message, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-600">•</span>
                    <span>{message}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Volunteer Instructions */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Volunteer Instructions</AlertTitle>
              <AlertDescription>
                Please provide the visitor with their queue position number and direct them to the waiting area. 
                Update the queue display board with the current position.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button onClick={resetCheckIn} variant="outline" size="lg">
            Check in Another Visitor
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Volunteer Check-in Assistant</h1>
        <p className="text-muted-foreground mt-2">
          Help visitors check in for their appointments
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ticket" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Ticket Check-in
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Visitor Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ticket" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Ticket Number Check-in
              </CardTitle>
              <CardDescription>
                Enter the visitor's ticket number to check them in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={checkInForm.handleSubmit(handleTicketCheckIn)} className="space-y-4">
                <div>
                  <label htmlFor="ticketNumber" className="block text-sm font-medium mb-2">
                    Ticket Number
                  </label>
                  <Input
                    {...checkInForm.register('ticketNumber')}
                    id="ticketNumber"
                    placeholder="Enter ticket number (e.g., LDH240120001)"
                    className="uppercase text-center text-lg font-mono"
                    autoFocus
                  />
                  {checkInForm.formState.errors.ticketNumber && (
                    <p className="mt-1 text-sm text-red-600">
                      {checkInForm.formState.errors.ticketNumber.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Checking in...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Check In Visitor
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search for Visitor
              </CardTitle>
              <CardDescription>
                Search by name, email, phone, or postcode to find visitors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={searchForm.handleSubmit(handleVisitorSearch)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="searchTerm" className="block text-sm font-medium mb-2">
                      Search Term
                    </label>
                    <Input
                      {...searchForm.register('searchTerm')}
                      id="searchTerm"
                      placeholder="Enter name, email, phone, or postcode"
                    />
                    {searchForm.formState.errors.searchTerm && (
                      <p className="mt-1 text-sm text-red-600">
                        {searchForm.formState.errors.searchTerm.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="searchType" className="block text-sm font-medium mb-2">
                      Search Type
                    </label>
                    <select
                      {...searchForm.register('searchType')}
                      id="searchType"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="name">Name</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="postcode">Postcode</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={searchLoading}
                  className="w-full"
                >
                  {searchLoading ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search Visitors
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Found {searchResults.length} visitor{searchResults.length === 1 ? '' : 's'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {searchResults.map((visitor) => (
                    <div
                      key={visitor.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{visitor.name}</h4>
                            <Badge
                              variant={visitor.status === 'verified' ? 'default' : 'secondary'}
                            >
                              {visitor.status}
                            </Badge>
                            {visitor.has_ticket && (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                Has Ticket
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Email:</strong> {visitor.email}</p>
                            <p><strong>Phone:</strong> {visitor.phone}</p>
                            <p><strong>Postcode:</strong> {visitor.postcode}</p>
                            {visitor.last_visit && (
                              <p><strong>Last Visit:</strong> {visitor.last_visit}</p>
                            )}
                            {visitor.ticket_number && (
                              <p><strong>Ticket:</strong> {visitor.ticket_number}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {visitor.has_ticket ? (
                            <Button
                              onClick={() => handleManualCheckIn(visitor)}
                              disabled={loading}
                              size="sm"
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Check In
                            </Button>
                          ) : (
                            <div className="text-center">
                              <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-1" />
                              <p className="text-xs text-muted-foreground">No valid ticket</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Instructions for Volunteers */}
      <Card>
        <CardHeader>
          <CardTitle>Volunteer Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Check-in Process</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Ask visitor for their ticket number or QR code</li>
                <li>• Verify visitor identity with ID if needed</li>
                <li>• Use ticket check-in for fastest processing</li>
                <li>• Use visitor search if ticket is lost or unclear</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">After Check-in</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Provide queue position number to visitor</li>
                <li>• Direct visitor to appropriate waiting area</li>
                <li>• Update queue display board</li>
                <li>• Report any issues to duty manager</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
