'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import VisitHistory from '@/components/visitor/visit-history';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Info,
  AlertTriangle,
  Search,
  Filter,
  BarChart3,
  Star,
  MessageCircle,
  Download,
  Eye,
  MapPin,
  Users
} from 'lucide-react';
import { Visit } from '@/lib/types/visitor';
import { getVisitorVisits } from '@/lib/api/visitor';
import LoadingSpinner from '@/components/common/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils/date-utils';

export default function VisitsPage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'analytics'>('list');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    upcoming: 0,
    cancelled: 0,
    thisMonth: 0,
    lastMonth: 0,
    averageRating: 0,
    totalServices: 0,
    favoriteCategory: '',
    longestWait: 0,
    shortestWait: 0,
    totalWaitTime: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadVisits();
  }, []);

  const loadVisits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getVisitorVisits(1, 100); // Load more visits for analytics
      setVisits(data.data || []);
      
      // Calculate comprehensive stats
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      const calculatedStats = data.data.reduce((acc, visit) => {
        acc.total++;
        const visitDate = new Date(visit.visitDate);
        
        switch (visit.status) {
          case 'completed':
            acc.completed++;
            break;
          case 'scheduled':
            if (visitDate > now) acc.upcoming++;
            break;
          case 'cancelled':
          case 'no_show':
            acc.cancelled++;
            break;
        }
        
        // Month comparisons
        if (visitDate >= thisMonthStart) acc.thisMonth++;
        if (visitDate >= lastMonthStart && visitDate <= lastMonthEnd) acc.lastMonth++;
        
        // Rating calculations
        if (visit.feedback?.rating) {
          acc.totalRating = (acc.totalRating || 0) + visit.feedback.rating;
          acc.ratedVisits = (acc.ratedVisits || 0) + 1;
        }
        
        // Service counting
        if (visit.services) {
          acc.totalServices += visit.services.length;
        }
        
        // Wait time calculations from actual data if available
        if (visit.waitTime) {
          acc.totalWaitTime += visit.waitTime;
          if (acc.longestWait === 0 || visit.waitTime > acc.longestWait) acc.longestWait = visit.waitTime;
          if (acc.shortestWait === 0 || visit.waitTime < acc.shortestWait) acc.shortestWait = visit.waitTime;
        }
        
        return acc;
      }, { 
        total: 0, completed: 0, upcoming: 0, cancelled: 0, thisMonth: 0, lastMonth: 0,
        totalRating: 0, ratedVisits: 0, averageRating: 0, totalServices: 0, 
        favoriteCategory: 'Food Support', longestWait: 0, shortestWait: 0, totalWaitTime: 0
      });
      
      // Calculate average rating
      if (calculatedStats.ratedVisits > 0) {
        calculatedStats.averageRating = calculatedStats.totalRating / calculatedStats.ratedVisits;
      }
      
      setStats(calculatedStats);
    } catch (err: any) {
      setError(err.message || 'Failed to load visits');
      toast({
        title: "Error",
        description: "Failed to load your visit history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredVisits = visits.filter(visit => {
    const matchesSearch = visit.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         visit.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (visit.notes && visit.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || visit.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const visitDate = new Date(visit.visitDate);
      const now = new Date();
      switch (dateFilter) {
        case 'thisMonth':
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          matchesDate = visitDate >= thisMonthStart;
          break;
        case 'last3Months':
          const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          matchesDate = visitDate >= threeMonthsAgo;
          break;
        case 'thisYear':
          const yearStart = new Date(now.getFullYear(), 0, 1);
          matchesDate = visitDate >= yearStart;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  }).sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());

  const handleFeedbackSubmit = (visitId: number) => {
    toast({
      title: "Feedback Submitted",
      description: "Thank you for your feedback. It helps us improve our services.",
    });
  };

  if (loading) {
    return <LoadingSpinner message="Loading your visit history..." />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Visits</h1>
          <p className="text-muted-foreground">
            View your visit history, track patterns, and provide feedback
          </p>
        </div>
        <Button asChild>
          <a href="/visitor/help-request/new">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule New Visit
          </a>
        </Button>
      </div>

      {/* Visit Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Visits</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.upcoming}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.thisMonth}</p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalServices}</p>
                <p className="text-xs text-muted-foreground">Services Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters and View Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search visits by reference, category, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="scheduled">Scheduled</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Time</option>
                <option value="thisMonth">This Month</option>
                <option value="last3Months">Last 3 Months</option>
                <option value="thisYear">This Year</option>
              </select>

              <div className="flex border rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-2 text-sm ${viewMode === 'calendar' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => setViewMode('analytics')}
                  className={`px-3 py-2 text-sm ${viewMode === 'analytics' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                >
                  Analytics
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="visits" className="space-y-6">
        <TabsList>
          <TabsTrigger value="visits">Visit History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="space-y-4">
          {filteredVisits.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Visits Found</h3>
                <p className="text-muted-foreground mb-4">
                  {visits.length === 0 
                    ? "You haven't had any visits yet."
                    : "No visits match your current filters."
                  }
                </p>
                {visits.length === 0 && (
                  <Button asChild>
                    <a href="/visitor/help-request/new">Schedule Your First Visit</a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredVisits.map((visit) => (
              <Card key={visit.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span>#{visit.reference}</span>
                        <Badge className={
                          visit.status === 'completed' ? 'bg-green-50 text-green-700' :
                          visit.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                          visit.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                          'bg-gray-50 text-gray-700'
                        }>
                          {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
                        </Badge>
                        <Badge variant="outline">{visit.category}</Badge>
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(visit.visitDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {visit.timeSlot}
                        </span>
                        {visit.checkInTime && visit.checkOutTime && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Duration: {
                              Math.round((new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime()) / (1000 * 60))
                            } min
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                      {visit.status === 'completed' && !visit.feedback && (
                        <Button size="sm" onClick={() => handleFeedbackSubmit(visit.id)}>
                          <Star className="h-4 w-4 mr-2" />
                          Rate Visit
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {visit.services && visit.services.length > 0 && (
                      <div>
                        <span className="text-sm font-medium">Services Received:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {visit.services.map((service, index) => (
                            <Badge key={`${service}-${index}`} variant="secondary" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {visit.notes && (
                      <div>
                        <span className="text-sm font-medium">Notes:</span>
                        <p className="text-sm text-muted-foreground mt-1">{visit.notes}</p>
                      </div>
                    )}
                    
                    {visit.feedback && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">Your Feedback:</span>
                          <div className="flex">
                            {[1,2,3,4,5].map((star) => (
                              <Star 
                                key={star} 
                                className={`h-3 w-3 ${star <= visit.feedback!.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{visit.feedback.comments}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Visit Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">This Month vs Last Month</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold">{stats.thisMonth}</span>
                      <span className="text-sm text-muted-foreground">vs {stats.lastMonth}</span>
                      {stats.thisMonth > stats.lastMonth && (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Completion Rate</span>
                    <span className="text-lg font-bold">
                      {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  
                  <div className="mt-4">
                    <Progress value={stats.total > 0 ? (stats.completed / stats.total) * 100 : 0} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Wait Time Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Wait Time</span>
                    <span className="text-lg font-bold">
                      {stats.total > 0 ? Math.round(stats.totalWaitTime / stats.total) : 0} min
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Longest Wait</span>
                    <span className="text-sm font-medium">{stats.longestWait} min</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Shortest Wait</span>
                    <span className="text-sm font-medium">{stats.shortestWait} min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Most Used Category</span>
                    <Badge variant="outline">{stats.favoriteCategory}</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Services Received</span>
                    <span className="text-sm font-medium">{stats.totalServices}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Services per Visit</span>
                    <span className="text-sm font-medium">
                      {stats.completed > 0 ? (stats.totalServices / stats.completed).toFixed(1) : '0'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Satisfaction Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Rating</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-medium">{stats.averageRating.toFixed(1)}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Feedback Given</span>
                    <span className="text-sm font-medium">
                      {visits.filter(v => v.feedback).length} / {stats.completed}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
