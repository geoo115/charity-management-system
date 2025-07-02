"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Ticket, 
  History, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  Clock, 
  MapPin, 
  User,
  Search,
  Filter,
  Download,
  RefreshCw,
  Star,
  Target,
  QrCode,
  Phone,
  Navigation,
  Award,
  TrendingUp,
  Coffee,
  Users
} from "lucide-react";
import { getFromLocalStorage } from '@/lib/hooks/use-local-storage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

// Get auth token for API requests
const getAuthToken = () => {
  return getFromLocalStorage('auth_token') || getFromLocalStorage('token');
};

// Create API headers with authentication
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

interface RecentTicket {
  id: string;
  ticket_number: string;
  service_type: string;
  date: string;
  status: string;
  issued_at: string;
  time_slot: string;
  reference: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "active": 
    case "TicketIssued": 
      return "bg-green-100 text-green-800 border-green-200";
    case "used":
    case "Completed": 
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "expired": 
      return "bg-red-100 text-red-800 border-red-200";
    case "cancelled": 
      return "bg-gray-100 text-gray-800 border-gray-200";
    default: 
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "active":
    case "TicketIssued": return <CheckCircle className="h-4 w-4" />;
    case "used":
    case "Completed": return <Star className="h-4 w-4" />;
    case "expired": return <XCircle className="h-4 w-4" />;
    case "cancelled": return <XCircle className="h-4 w-4" />;
    default: return <AlertCircle className="h-4 w-4" />;
  }
};

const getServiceIcon = (serviceType: string) => {
  switch (serviceType.toLowerCase()) {
    case 'food':
    case 'food support':
      return Coffee;
    case 'general':
    case 'general support':
      return Users;
    default:
      return Ticket;
  }
};

export default function EnhancedVisitorTicketsPage() {
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<RecentTicket | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  // Filter tickets based on search and filters
  useEffect(() => {
    let filtered = [...recentTickets];

    // Apply tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(ticket => {
        switch (activeTab) {
          case 'active':
            return ['active', 'TicketIssued'].includes(ticket.status);
          case 'completed':
            return ['used', 'Completed'].includes(ticket.status);
          case 'expired':
            return ['expired', 'cancelled'].includes(ticket.status);
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.service_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.reference.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Apply service filter
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.service_type.toLowerCase().includes(serviceFilter));
    }

    setFilteredTickets(filtered);
  }, [recentTickets, searchTerm, statusFilter, serviceFilter, activeTab]);

  const loadRecentTickets = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching tickets from /api/v1/tickets/history');
      const response = await fetch("/api/v1/tickets/history", {
        method: "GET",
        headers: getAuthHeaders(),
      });
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('API response:', result);
        
        if (result.success && result.data) {
          console.log('Setting tickets:', result.data);
          setRecentTickets(result.data);
        } else {
          console.log('No success or data in response');
          setRecentTickets([]);
        }
      } else {
        console.log('Response not ok, status:', response.status);
        setRecentTickets([]);
      }
    } catch (error) {
      console.error('Error loading recent tickets:', error);
      setRecentTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecentTickets();
    setTimeout(() => setRefreshing(false), 500);
  };

  useEffect(() => {
    loadRecentTickets();
  }, [loadRecentTickets]);

  const handleViewTicket = (ticket: RecentTicket) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStats = () => {
    return {
      total: recentTickets.length,
      active: recentTickets.filter(t => ['active', 'TicketIssued'].includes(t.status)).length,
      completed: recentTickets.filter(t => ['used', 'Completed'].includes(t.status)).length,
      expired: recentTickets.filter(t => ['expired', 'cancelled'].includes(t.status)).length,
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <RefreshCw className="h-12 w-12 text-blue-600 mb-4" />
          </motion.div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading your tickets...</h2>
          <p className="text-gray-600">Please wait while we gather your ticket history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Enhanced Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Ticket className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Your Tickets
              </h1>
              <p className="text-lg text-gray-600">View and manage your service tickets</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { key: 'total', label: 'Total Tickets', value: stats.total, icon: Target, color: 'text-gray-600', bg: 'bg-gray-100' },
          { key: 'active', label: 'Active', value: stats.active, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
          { key: 'completed', label: 'Completed', value: stats.completed, icon: Star, color: 'text-blue-600', bg: 'bg-blue-100' },
          { key: 'expired', label: 'Expired', value: stats.expired, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
        ].map((stat, index) => (
          <motion.div key={stat.key} variants={fadeInUp} className="group">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => setActiveTab(stat.key === 'total' ? 'all' : stat.key)}>
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
                  placeholder="Search tickets..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="TicketIssued">Ticket Issued</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
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
                  setServiceFilter('all');
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
              <CheckCircle className="h-4 w-4" />
              Active ({stats.active})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Completed ({stats.completed})
            </TabsTrigger>
            <TabsTrigger value="expired" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Expired ({stats.expired})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <AnimatePresence mode="wait">
              {filteredTickets.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <div className="p-4 bg-gray-100 rounded-full mb-6">
                        <Ticket className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {activeTab === 'all' ? 'No tickets yet' : `No ${activeTab} tickets`}
                      </h3>
                      <p className="text-gray-500 text-center mb-8 max-w-md">
                        {activeTab === 'all' 
                          ? 'Your service tickets will appear here once you make help requests.'
                          : `You don't have any ${activeTab} tickets at the moment.`
                        }
                      </p>
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
                  {filteredTickets
                    .sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime())
                    .map((ticket, index) => {
                      const ServiceIcon = getServiceIcon(ticket.service_type);
                      
                      return (
                        <motion.div
                          key={ticket.id}
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
                                    <div className="p-3 rounded-full bg-blue-100">
                                      <ServiceIcon className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <h3 className="font-bold text-lg text-gray-900 font-mono">
                                          {ticket.ticket_number}
                                        </h3>
                                        <Badge className={getStatusColor(ticket.status)}>
                                          {getStatusIcon(ticket.status)}
                                          <span className="ml-1 capitalize">{ticket.status}</span>
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          {ticket.service_type}
                                        </Badge>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4" />
                                          <span>Visit: {formatDate(ticket.date)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-4 w-4" />
                                          <span>Time: {ticket.time_slot || 'Not specified'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <History className="h-4 w-4" />
                                          <span>Issued: {formatDate(ticket.issued_at)}</span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <MapPin className="h-4 w-4" />
                                        <span>Reference: {ticket.reference}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Right Section - Actions */}
                                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-48">
                                  <Button 
                                    variant="outline" 
                                    className="flex-1"
                                    onClick={() => handleViewTicket(ticket)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                  
                                  {['active', 'TicketIssued'].includes(ticket.status) && (
                                    <Button className="flex-1 bg-green-600 hover:bg-green-700">
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
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
      <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Ticket className="h-6 w-6 text-blue-600" />
              </div>
              Ticket Details
            </DialogTitle>
            <DialogDescription>
              Complete information about your service ticket
            </DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-6">
              {/* Ticket Header */}
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                <div className="inline-block p-4 bg-white rounded-lg shadow-sm mb-4">
                  <QrCode className="h-16 w-16 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 font-mono">
                  {selectedTicket.ticket_number}
                </h3>
                <Badge className={getStatusColor(selectedTicket.status)}>
                  {getStatusIcon(selectedTicket.status)}
                  <span className="ml-1 capitalize">{selectedTicket.status}</span>
                </Badge>
              </div>

              {/* Service Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Service Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Users className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Service Type</p>
                        <p className="text-sm text-gray-600">{selectedTicket.service_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <MapPin className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Reference</p>
                        <p className="text-sm text-gray-600">{selectedTicket.reference}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Visit Date</p>
                        <p className="text-sm text-gray-600">{formatDate(selectedTicket.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Clock className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Time Slot</p>
                        <p className="text-sm text-gray-600">{selectedTicket.time_slot || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Important Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600" />
                    Important Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3">Arrival Instructions</h4>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li>• Please arrive 15 minutes before your scheduled time</li>
                      <li>• Bring valid photo ID and proof of address</li>
                      <li>• Show this ticket at reception for check-in</li>
                      <li>• Location: Lewishame Charity, 123 Community Road</li>
                    </ul>
                  </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Phone className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Contact Number</p>
                        <p className="text-sm text-gray-600">+44 20 8692 0000</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <History className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Issued On</p>
                        <p className="text-sm text-gray-600">{formatDate(selectedTicket.issued_at)}</p>
                      </div>
                    </div>
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