'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText,
  Eye,
  Download,
  Clock,
  Plus,
  RefreshCw,
  X,
  Calendar,
  MapPin,
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
  Ticket,
  TrendingUp,
  History,
  Star,
  QrCode,
  MessageSquare,
  Phone,
  Navigation,
  Target,
  Zap,
  Coffee,
  Heart,
  Users
} from 'lucide-react';
import { getUserHelpRequests, cancelHelpRequest } from '@/lib/api/help-requests';
import { HelpRequest as HelpRequestType } from '@/lib/types/visitor';
import { formatDate } from '@/lib/utils/date-utils';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getHelpRequests, cancelHelpRequest as visitorCancelHelpRequest } from '@/lib/api/visitor';

interface TicketData {
  id: string;
  reference: string;
  qrCode: string;
  visitDate: string;
  timeSlot: string;
  category: string;
  location: string;
  instructions: string[];
  checkInDetails: {
    address: string;
    contactNumber: string;
    arrivalInstructions: string;
  };
  status: 'active' | 'used' | 'expired' | 'pending';
  expiresAt: string;
}

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { component: JSX.Element; icon: any; color: string }> = {
    'pending': { 
      component: <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending Review</Badge>,
      icon: Clock,
      color: 'text-amber-600'
    },
    'approved': { 
      component: <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>,
      icon: CheckCircle,
      color: 'text-green-600'
    },
    'ticketissued': { 
      component: <Badge className="bg-blue-100 text-blue-800 border-blue-200">Ticket Ready</Badge>,
      icon: Ticket,
      color: 'text-blue-600'
    },
    'completed': { 
      component: <Badge className="bg-purple-100 text-purple-800 border-purple-200">Completed</Badge>,
      icon: CheckCircle,
      color: 'text-purple-600'
    },
    'rejected': { 
      component: <Badge variant="destructive">Rejected</Badge>,
      icon: X,
      color: 'text-red-600'
    },
    'cancelled': { 
      component: <Badge variant="outline" className="text-gray-600">Cancelled</Badge>,
      icon: X,
      color: 'text-gray-600'
    },
  };
  
  const statusKey = status.toLowerCase();
  return statusMap[statusKey] || { 
    component: <Badge variant="outline">{status}</Badge>,
    icon: AlertCircle,
    color: 'text-gray-600'
  };
};

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'food':
      return Coffee;
    case 'general':
      return Users;
    case 'emergency':
      return AlertCircle;
    default:
      return Heart;
  }
};

export default function EnhancedHelpRequestsList() {
  const [requests, setRequests] = useState<HelpRequestType[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<HelpRequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await getHelpRequests();
      console.log('Help requests data from backend:', data);
      setRequests(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load help requests');
      toast({
        title: "Error loading requests",
        description: err.message || 'Failed to load help requests',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter requests based on search and filters
  useEffect(() => {
    let filtered = [...requests];

    // Apply tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(req => {
        switch (activeTab) {
          case 'active':
            return ['Pending', 'Approved', 'TicketIssued'].includes(req.status);
          case 'completed':
            return req.status === 'Completed';
          case 'cancelled':
            return ['Rejected', 'Cancelled'].includes(req.status);
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status.toLowerCase() === statusFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(req => req.category.toLowerCase() === categoryFilter);
    }

    setFilteredRequests(filtered);
  }, [requests, searchTerm, statusFilter, categoryFilter, activeTab]);

  useEffect(() => {
    loadRequests();
  }, []);

  const handleRefresh = () => {
    loadRequests();
  };

  const handleCancel = async (requestId: number, reference: string) => {
    if (!confirm(`Are you sure you want to cancel help request ${reference}?`)) {
      return;
    }

    try {
      setCancellingId(requestId);
      await visitorCancelHelpRequest(requestId);
      toast({
        title: "Request cancelled",
        description: "Your help request has been cancelled successfully."
      });
      loadRequests(); // Refresh the list
    } catch (err: any) {
      toast({
        title: "Cancellation failed",
        description: err.message || 'Failed to cancel help request',
        variant: "destructive"
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handleViewTicket = (request: HelpRequestType) => {
    // Check if help request is approved or has ticket issued status
    if (!['Approved', 'TicketIssued'].includes(request.status)) {
      toast({
        title: "No ticket available",
        description: "This help request is not yet approved for a ticket.",
        variant: "destructive"
      });
      return;
    }

    // Generate ticket number if not available
    const ticketNumber = request.ticketNumber || `PENDING-${request.reference}`;
    const isPendingTicket = !request.ticketNumber;

    // Parse visit date with better error handling
    const parseVisitDate = (dateString: string | undefined): string => {
      if (!dateString) return 'Not scheduled';
      
      try {
        let date: Date;
        
        if (dateString.includes('T') && (dateString.includes('+') || dateString.includes('Z'))) {
          date = new Date(dateString);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          date = new Date(dateString + 'T00:00:00');
        } else {
          date = new Date(dateString);
        }
        
        if (isNaN(date.getTime())) {
          return 'Not scheduled';
        }
        
        return date.toISOString();
      } catch (error) {
        console.error('Error parsing date:', dateString, error);
        return 'Not scheduled';
      }
    };

    const ticketData: TicketData = {
      id: ticketNumber,
      reference: request.reference || ticketNumber,
      qrCode: (request as any).qrCode || `QR-${ticketNumber}`,
      visitDate: parseVisitDate((request as any).visit_day || request.visitDay || request.createdAt),
      timeSlot: (request as any).time_slot || request.timeSlot || 'Not scheduled',
      category: request.category,
      location: 'Lewishame Charity',
      instructions: [
        'Arrive 15 minutes before your appointment time',
        'Bring valid photo ID and proof of address',
        'Show this ticket at reception for check-in'
      ],
      checkInDetails: {
        address: '123 Community Road, Lewisham, SE13 7XX',
        contactNumber: '020 8XXX XXXX',
        arrivalInstructions: 'Please report to the main reception desk and show your ticket'
      },
      status: isPendingTicket ? 'pending' : (request.status === 'TicketIssued' ? 'active' : 'expired'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    setSelectedTicket(ticketData);
    setIsTicketModalOpen(true);
  };

  const formatSafeDate = (dateString: string) => {
    if (!dateString) return 'Date not available';
    
    try {
      let date: Date;
      
      if (dateString.includes('T') && (dateString.includes('+') || dateString.includes('Z'))) {
        date = new Date(dateString);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        date = new Date(dateString + 'T00:00:00');
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        return 'Date not available';
      }
      
      return formatDate(date);
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return 'Date not available';
    }
  };

  const getDateForRequest = (request: HelpRequestType) => {
    const dateFields = [
      request.createdAt,
      (request as any).created_at,
      request.submittedAt,
      (request as any).submitted_at,
    ];
    
    for (const dateField of dateFields) {
      if (dateField) {
        const formatted = formatSafeDate(dateField);
        if (formatted !== 'Date not available') {
          return formatted;
        }
      }
    }
    
    return 'Date not available';
  };

  const getStats = () => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'Pending').length,
      approved: requests.filter(r => ['Approved', 'TicketIssued'].includes(r.status)).length,
      completed: requests.filter(r => r.status === 'Completed').length,
      active: requests.filter(r => ['Pending', 'Approved', 'TicketIssued'].includes(r.status)).length,
      cancelled: requests.filter(r => ['Rejected', 'Cancelled'].includes(r.status)).length,
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <RefreshCw className="h-12 w-12 text-blue-600 mb-4" />
          </motion.div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading your requests...</h2>
          <p className="text-gray-600">Please wait while we gather your help requests</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
      {/* Enhanced Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                My Help Requests
              </h1>
              <p className="text-lg text-gray-600">Track and manage your support requests</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Link href="/visitor/help-request/new">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Enhanced Stats Cards */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        {[
          { key: 'total', label: 'Total', value: stats.total, icon: Target, color: 'text-gray-600', bg: 'bg-gray-100' },
          { key: 'active', label: 'Active', value: stats.active, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-100' },
          { key: 'pending', label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
          { key: 'approved', label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
          { key: 'completed', label: 'Completed', value: stats.completed, icon: Star, color: 'text-purple-600', bg: 'bg-purple-100' },
          { key: 'cancelled', label: 'Cancelled', value: stats.cancelled, icon: X, color: 'text-gray-600', bg: 'bg-gray-100' },
        ].map((stat, index) => (
          <motion.div key={stat.key} variants={fadeInUp} className="group">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => setActiveTab(stat.key === 'total' ? 'all' : stat.key === 'approved' ? 'active' : stat.key)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-blue-600" />
              <CardTitle>Filter & Search</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="ticketissued">Ticket Ready</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="food">Food Support</SelectItem>
                  <SelectItem value="general">General Support</SelectItem>
                  <SelectItem value="emergency">Emergency Support</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                  setActiveTab('all');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs for Organization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              All ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Active ({stats.active})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed ({stats.completed})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Cancelled ({stats.cancelled})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <AnimatePresence mode="wait">
              {filteredRequests.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <div className="p-4 bg-gray-100 rounded-full mb-6">
                        <FileText className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {activeTab === 'all' ? 'No requests yet' : `No ${activeTab} requests`}
                      </h3>
                      <p className="text-gray-500 text-center mb-8 max-w-md">
                        {activeTab === 'all' 
                          ? 'Submit your first help request to get started with our services.'
                          : `You don't have any ${activeTab} requests at the moment.`
                        }
                      </p>
                      {activeTab === 'all' && (
                        <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600">
                          <Link href="/visitor/help-request/new">
                            <Plus className="h-4 w-4 mr-2" />
                            Submit Your First Request
                          </Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {filteredRequests
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((request, index) => {
                      const status = getStatusBadge(request.status);
                      const CategoryIcon = getCategoryIcon(request.category);
                      
                      return (
                        <motion.div
                          key={request.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="hover:shadow-lg transition-all duration-300 group">
                            <CardContent className="p-6">
                              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                {/* Left Section - Main Info */}
                                <div className="flex-1 space-y-4">
                                  <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-full ${status.color === 'text-green-600' ? 'bg-green-100' : status.color === 'text-blue-600' ? 'bg-blue-100' : status.color === 'text-amber-600' ? 'bg-amber-100' : status.color === 'text-purple-600' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                                      <CategoryIcon className={`h-6 w-6 ${status.color}`} />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <h3 className="font-bold text-lg text-gray-900">
                                          {request.reference}
                                        </h3>
                                        {status.component}
                                        <Badge variant="outline" className="text-xs">
                                          {request.category} Support
                                        </Badge>
                                      </div>
                                      
                                      <p className="text-gray-700 mb-3 leading-relaxed">
                                        {request.details}
                                      </p>
                                      
                                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-4 w-4" />
                                          Submitted: {getDateForRequest(request)}
                                        </span>
                                        {request.visitDay && (
                                          <span className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            Scheduled: {request.visitDay} at {request.timeSlot}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {request.rejectionReason && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      className="p-4 bg-red-50 border border-red-200 rounded-lg"
                                    >
                                      <div className="flex items-start gap-2">
                                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                        <div>
                                          <p className="font-medium text-red-800 mb-1">Request Rejected</p>
                                          <p className="text-sm text-red-700">{request.rejectionReason}</p>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                                
                                {/* Right Section - Actions */}
                                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-48">
                                  <Button 
                                    variant="outline" 
                                    className="flex-1"
                                    onClick={() => handleViewTicket(request)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                  
                                  {(request.status === 'Approved' || request.status === 'TicketIssued') && (
                                    <Button className="flex-1 bg-green-600 hover:bg-green-700" asChild>
                                      <Link href={`/visitor/help-request/${request.id}/ticket`}>
                                        <Ticket className="h-4 w-4 mr-2" />
                                        Get Ticket
                                      </Link>
                                    </Button>
                                  )}
                                  
                                  {(['Pending', 'Approved'].includes(request.status) && request.status !== 'Cancelled') && (
                                    <Button 
                                      variant="destructive" 
                                      className="flex-1"
                                      onClick={() => handleCancel(request.id, request.reference)}
                                      disabled={cancellingId === request.id}
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      {cancellingId === request.id ? 'Cancelling...' : 'Cancel'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Enhanced Ticket Details Modal */}
      <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Ticket className="h-6 w-6 text-blue-600" />
              </div>
              Ticket Details
            </DialogTitle>
            <DialogDescription>
              Your support request ticket information and visit details
            </DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-6">
              {/* Ticket Header */}
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                <div className="inline-block p-4 bg-white rounded-lg shadow-sm mb-4">
                  <QrCode className="h-16 w-16 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedTicket.reference}
                </h3>
                <Badge className={`text-sm px-3 py-1 ${
                  selectedTicket.status === 'active' ? 'bg-green-100 text-green-800' :
                  selectedTicket.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedTicket.status === 'active' ? 'Ready to Use' :
                   selectedTicket.status === 'pending' ? 'Processing' : 'Expired'}
                </Badge>
              </div>

              {/* Visit Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Visit Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Clock className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Time Slot</p>
                        <p className="text-sm text-gray-600">{selectedTicket.timeSlot}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <MapPin className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Location</p>
                        <p className="text-sm text-gray-600">{selectedTicket.location}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    Important Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedTicket.instructions.map((instruction, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{instruction}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-blue-600" />
                    Contact & Directions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Address</p>
                        <p className="text-sm text-gray-600">{selectedTicket.checkInDetails.address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Contact Number</p>
                        <p className="text-sm text-gray-600">{selectedTicket.checkInDetails.contactNumber}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Arrival Instructions:</strong> {selectedTicket.checkInDetails.arrivalInstructions}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1">
                  <Navigation className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <Download className="h-4 w-4 mr-2" />
                  Download Ticket
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}