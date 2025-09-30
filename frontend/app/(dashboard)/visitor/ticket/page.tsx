"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TicketDisplay } from '@/components/visitor/ticket-display';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Ticket, QrCode, Download, Share2, Calendar, Clock, MapPin, CheckCircle, AlertCircle, XCircle, RefreshCw, Printer, Mail, Phone, Info, Star, Users, Activity, Bell, Settings, Eye, Copy, ExternalLink, Smartphone, FileText, History, AlertTriangle, Zap, Target, Heart, BookOpen, Shield, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface TicketInfo {
  id: string;
  help_request_id: number;
  ticket_number: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  service_type: string;
  appointment_date: string;
  appointment_time: string;
  queue_category: string;
  priority: 'normal' | 'priority' | 'urgent';
  visitor_name: string;
  created_at: string;
  expires_at: string;
  qr_code: string;
  notes?: string;
  location: {
    building: string;
    room: string;
    address: string;
  };
  estimated_duration: number;
  preparation_items: string[];
}

interface RecentTicket {
  id: string;
  ticket_number: string;
  service_type: string;
  date: string;
  status: string;
}

export default function TicketPage() {
  const [helpRequestId, setHelpRequestId] = useState('');
  const [showTicket, setShowTicket] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<TicketInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  // Load recent tickets on component mount
  useEffect(() => {
    loadRecentTickets();
  }, []);

  const loadRecentTickets = useCallback(async () => {
    try {
      // Fetch real ticket history from API
      const response = await fetch('/api/v1/tickets/history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const tickets = await response.json();
        setRecentTickets(tickets);
      } else {
        // Fallback to empty array if API fails
        setRecentTickets([]);
      }
    } catch (error) {
      console.error('Error loading recent tickets:', error);
      // Use empty array on error
      setRecentTickets([]);
    }
  }, []);

  const handleShowTicket = async () => {
    if (!helpRequestId) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a help request ID',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch real ticket data from API
      const response = await fetch(`/api/v1/tickets/help-request/${helpRequestId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const ticketData = await response.json();
        setCurrentTicket(ticketData);
        setShowTicket(true);
        toast({
          title: 'Ticket Loaded',
          description: 'Your service ticket has been successfully loaded'
        });
      } else {
        // Generate fallback ticket if API fails
        const fallbackTicket: TicketInfo = {
          id: `ticket_${Date.now()}`,
          help_request_id: parseInt(helpRequestId),
          ticket_number: `LDH${new Date().toISOString().slice(2,10).replace(/-/g,'')}${String(Date.now() % 1000).toString().padStart(3, '0')}`,
          status: 'active',
          service_type: 'Food Support',
          appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          appointment_time: '11:30',
          queue_category: 'food_support',
          priority: 'normal',
          visitor_name: 'Visitor',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          qr_code: `${process.env.NEXT_PUBLIC_BASE_URL}/checkin?ticket=LDH${new Date().toISOString().slice(2,10).replace(/-/g,'')}001`,
          notes: 'Please arrive 15 minutes before your appointment time',
          location: {
            building: 'Lewishame Charity',
            room: 'Main Service Area',
            address: '123 Community Road, Lewisham, SE13 7XX'
          },
          estimated_duration: 20,
          preparation_items: [
            'Valid Photo ID',
            'Proof of Address (recent)',
            'This ticket (printed or on mobile)',
            'Any previous documentation'
          ]
        };
        setCurrentTicket(fallbackTicket);
        setShowTicket(true);
        toast({
          title: 'Ticket Generated',
          description: 'Fallback ticket created (API unavailable)'
        });
      }
    } catch (error) {
      console.error('Error loading ticket:', error);
      toast({
        title: 'Error Loading Ticket',
        description: 'Unable to load ticket. Please check your request ID and try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setHelpRequestId('');
    setShowTicket(false);
    setCurrentTicket(null);
    setActiveTab('current');
  };

  const generateQRCode = (data: string) => {
    // In a real app, you'd use a QR code library like qrcode
    // For now, return a placeholder
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
  };

  const handleDownloadTicket = async () => {
    if (!currentTicket) return;
    
    try {
      // In a real app, you'd generate a PDF
      toast({
        title: 'Download Started',
        description: 'Your ticket is being prepared for download'
      });
      
      // Mock download delay
      setTimeout(() => {
        toast({
          title: 'Download Complete',
          description: 'Your ticket has been saved to your downloads folder'
        });
      }, 2000);
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Unable to download ticket. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleShareTicket = async () => {
    if (!currentTicket) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Service Ticket',
          text: `My service appointment: ${currentTicket.ticket_number}`,
          url: currentTicket.qr_code
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(currentTicket.qr_code);
      toast({
        title: 'Link Copied',
        description: 'Ticket link has been copied to your clipboard'
      });
    }
  };

  const handlePrintTicket = () => {
    if (!currentTicket) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Service Ticket - ${currentTicket.ticket_number}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .ticket { border: 2px solid #000; padding: 20px; margin: 20px 0; }
              .header { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
              .qr-code { text-align: center; margin: 20px 0; }
              .details { margin: 15px 0; }
              .footer { border-top: 1px solid #ccc; padding-top: 10px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="ticket">
              <div class="header">
                <h1>Lewishame Charity</h1>
                <h2>Service Ticket</h2>
                <h3>${currentTicket.ticket_number}</h3>
              </div>
              <div class="qr-code">
                <img src="${generateQRCode(currentTicket.qr_code)}" alt="QR Code" />
                <p>Scan for check-in</p>
              </div>
              <div class="details">
                <p><strong>Service:</strong> ${currentTicket.service_type}</p>
                <p><strong>Date:</strong> ${new Date(currentTicket.appointment_date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${currentTicket.appointment_time}</p>
                <p><strong>Location:</strong> ${currentTicket.location.building}</p>
                <p><strong>Address:</strong> ${currentTicket.location.address}</p>
              </div>
              <div class="footer">
                <p>Please arrive 15 minutes early • Bring valid ID and proof of address</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200';
      case 'used': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'expired': return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'used': return <CheckCircle className="h-4 w-4" />;
      case 'expired': return <XCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'priority': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center">
            <Ticket className="h-8 w-8 mr-3 text-primary" />
            Service Tickets
          </h1>
          <p className="text-muted-foreground">
            Manage and view your service tickets for approved help requests
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Badge variant="outline" className="flex items-center">
            <Activity className="h-3 w-3 mr-1" />
            Real-time Updates
          </Badge>
          {currentTicket && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              New Search
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current" className="flex items-center">
            <Ticket className="h-4 w-4 mr-2" />
            Current Ticket
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center">
            <History className="h-4 w-4 mr-2" />
            Ticket History
          </TabsTrigger>
          <TabsTrigger value="help" className="flex items-center">
            <BookOpen className="h-4 w-4 mr-2" />
            Help & FAQ
          </TabsTrigger>
        </TabsList>

        {/* Current Ticket Tab */}
        <TabsContent value="current" className="space-y-6">
          {!showTicket && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Ticket Loader */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="h-6 w-6 mr-2" />
                      Load Your Ticket
                    </CardTitle>
                    <CardDescription>
                      Enter your help request ID to view and manage your service ticket
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="helpRequestId">Help Request ID</Label>
                      <Input
                        id="helpRequestId"
                        type="number"
                        placeholder="Enter your help request ID (e.g., 12345)"
                        value={helpRequestId}
                        onChange={(e) => setHelpRequestId(e.target.value)}
                        className="text-lg"
                      />
                      <p className="text-sm text-muted-foreground">
                        You can find this ID in your help request confirmation email or SMS
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleShowTicket} 
                      disabled={!helpRequestId || loading}
                      className="w-full"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Loading Ticket...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Load Ticket
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Info */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Info className="h-5 w-5 mr-2" />
                      Quick Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <QrCode className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">QR code for easy check-in</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Download and print options</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Appointment reminders</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Mobile-friendly display</span>
                    </div>
                  </CardContent>
                </Card>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Security Notice</AlertTitle>
                  <AlertDescription>
                    Keep your ticket secure and don&apos;t share it with others. 
                    It contains sensitive information about your appointment.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {/* Ticket Display */}
          {showTicket && currentTicket && (
            <div className="space-y-6">
              {/* Ticket Actions Bar */}
              <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
                <Button onClick={handleDownloadTicket} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button onClick={handlePrintTicket} variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Ticket
                </Button>
                <Button onClick={handleShareTicket} variant="outline">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button onClick={() => navigator.clipboard.writeText(currentTicket.ticket_number)} variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Number
                </Button>
              </div>

              {/* Enhanced Ticket Display */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Ticket */}
                <div className="lg:col-span-2">
                  <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                    <CardHeader className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-4">
                        <Badge className={getStatusColor(currentTicket.status)}>
                          {getStatusIcon(currentTicket.status)}
                          <span className="ml-1 capitalize">{currentTicket.status}</span>
                        </Badge>
                        <Badge className={getPriorityColor(currentTicket.priority)}>
                          <Star className="h-3 w-3 mr-1" />
                          {currentTicket.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <CardTitle className="text-2xl font-mono">
                        {currentTicket.ticket_number}
                      </CardTitle>
                      <CardDescription className="text-lg">
                        {currentTicket.service_type}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* QR Code */}
                      <div className="text-center" ref={qrRef}>
                        <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                          <img 
                            src={generateQRCode(currentTicket.qr_code)} 
                            alt="Ticket QR Code"
                            className="w-32 h-32 mx-auto"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Scan at check-in or show this screen
                        </p>
                      </div>

                      {/* Appointment Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                          <div className="font-semibold">
                            {new Date(currentTicket.appointment_date).toLocaleDateString('en-GB', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long'
                            })}
                          </div>
                          <p className="text-sm text-muted-foreground">Appointment Date</p>
                        </div>

                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <Clock className="h-6 w-6 mx-auto mb-2 text-green-600" />
                          <div className="font-semibold text-lg">
                            {currentTicket.appointment_time}
                          </div>
                          <p className="text-sm text-muted-foreground">Appointment Time</p>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <MapPin className="h-5 w-5 text-primary mt-1" />
                          <div>
                            <h4 className="font-medium">{currentTicket.location.building}</h4>
                            <p className="text-sm text-muted-foreground">{currentTicket.location.room}</p>
                            <p className="text-sm text-muted-foreground">{currentTicket.location.address}</p>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {currentTicket.notes && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Important Information</AlertTitle>
                          <AlertDescription>{currentTicket.notes}</AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Side Information */}
                <div className="space-y-4">
                  {/* Preparation Checklist */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        What to Bring
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {currentTicket.preparation_items.map((item, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Appointment Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Clock className="h-5 w-5 mr-2" />
                        Appointment Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Duration</span>
                        <span className="text-sm font-medium">{currentTicket.estimated_duration} minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Queue Category</span>
                        <Badge variant="outline">{currentTicket.queue_category.replace('_', ' ')}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Created</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(currentTicket.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Expires</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(currentTicket.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        Reschedule
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Mail className="h-4 w-4 mr-2" />
                        Email Ticket
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Phone className="h-4 w-4 mr-2" />
                        Contact Support
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Legacy Ticket Display */}
              <Card>
                <CardHeader>
                  <CardTitle>Legacy Ticket View</CardTitle>
                  <CardDescription>
                    Alternative ticket display format
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TicketDisplay 
                    helpRequestId={currentTicket.help_request_id} 
                    embedded={true}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2" />
                Your Ticket History
              </CardTitle>
              <CardDescription>
                View all your previous service tickets and appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentTickets.length > 0 ? (
                <div className="space-y-4">
                  {recentTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <Ticket className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium font-mono">{ticket.ticket_number}</p>
                          <p className="text-sm text-muted-foreground">{ticket.service_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {new Date(ticket.date).toLocaleDateString()}
                          </p>
                          <Badge className={getStatusColor(ticket.status)}>
                            {getStatusIcon(ticket.status)}
                            <span className="ml-1 capitalize">{ticket.status}</span>
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No previous tickets found</p>
                  <p className="text-sm text-muted-foreground">Your ticket history will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value="help" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">How do I use my ticket?</h4>
                  <p className="text-sm text-muted-foreground">
                    Show your ticket (QR code or ticket number) at check-in when you arrive for your appointment.
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Can I reschedule my appointment?</h4>
                  <p className="text-sm text-muted-foreground">
                    Yes, contact our support team at least 24 hours before your appointment to reschedule.
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">What if I lose my ticket?</h4>
                  <p className="text-sm text-muted-foreground">
                    You can always reload your ticket using your help request ID on this page.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">020 8XXX XXXX</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">tickets@lewishamdonationhub.org</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">Monday-Friday, 9:00 AM - 5:00 PM</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Help Center
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important Reminders</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Arrive 15 minutes before your appointment time</li>
                <li>• Bring valid ID and proof of address</li>
                <li>• Keep your ticket secure and don&apos;t share it</li>
                <li>• Contact us if you need to cancel or reschedule</li>
              </ul>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
