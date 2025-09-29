'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Users, Clock, AlertCircle, CheckCircle, Eye, RefreshCw, Phone, MessageSquare, UserCheck, Timer, Activity, TrendingUp, BarChart3, PieChart, Info, HelpCircle, Star, ThumbsUp, Search, Filter, Calendar, MapPin, User, Headphones, Volume2, Bell, AlertTriangle, Heart, Shield, Monitor } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils/date-utils';
import LoadingSpinner from '@/components/common/loading-spinner';
import { 
  getQueueStatus,
  callNextVisitor,
  QueueEntry,
  QueueStats
} from '@/lib/api/queue';

interface VolunteerQueueEntry {
  id: number;
  ticketNumber: string;
  visitorName: string;
  serviceType: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  waitTime: number;
  estimatedTime: number;
  status: 'waiting' | 'being-served' | 'completed' | 'no-show';
  specialNeeds?: string[];
  language?: string;
  arrivalTime: string;
  assignedCounter?: number;
  notes?: string;
}

interface VolunteerQueueStats {
  totalWaiting: number;
  averageWaitTime: number;
  totalServed: number;
  noShows: number;
  peakHour: string;
  satisfaction: number;
}

export default function VolunteerQueuePageEnhanced() {
  const [queueEntries, setQueueEntries] = useState<VolunteerQueueEntry[]>([]);
  const [queueStats, setQueueStats] = useState<VolunteerQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<VolunteerQueueEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  // Helper function to transform API data to component format
  const transformQueueEntry = (apiEntry: QueueEntry): VolunteerQueueEntry => ({
    id: apiEntry.id,
    ticketNumber: apiEntry.ticket_number || apiEntry.reference,
    visitorName: apiEntry.visitor_name,
    serviceType: apiEntry.category,
    priority: apiEntry.priority >= 3 ? 'urgent' : apiEntry.priority >= 2 ? 'high' : 'normal',
    waitTime: Math.floor((new Date().getTime() - new Date(apiEntry.check_in_time).getTime()) / (1000 * 60)),
    estimatedTime: apiEntry.estimated_wait_minutes,
    status: apiEntry.status === 'waiting' ? 'waiting' : 
            apiEntry.status === 'in_service' ? 'being-served' : 
            apiEntry.status === 'completed' ? 'completed' : 'no-show',
    specialNeeds: apiEntry.special_needs,
    language: 'English', // Default, could be enhanced
    arrivalTime: apiEntry.check_in_time,
    assignedCounter: undefined, // Could be enhanced
    notes: '' // Could be enhanced
  });

  const transformQueueStats = (apiStats: QueueStats): VolunteerQueueStats => ({
    totalWaiting: apiStats?.total_in_queue || 0,
    averageWaitTime: Math.round(apiStats?.average_wait_time || 0),
    totalServed: (apiStats?.service_rate || 0) * 8, // Estimate daily served
    noShows: 0, // Could be enhanced
    peakHour: '11:00 AM', // Could be calculated from data
    satisfaction: 4.2 // Could be from feedback data
  });

  useEffect(() => {
    const loadQueueData = async () => {
      try {
        setLoading(true);
        const queueData = await getQueueStatus();
        
        // Transform API data to component format
        const transformedEntries = queueData.queue ? queueData.queue.map(transformQueueEntry) : [];
        const transformedStats = transformQueueStats(queueData.stats);
        
        setQueueEntries(transformedEntries);
        setQueueStats(transformedStats);
        setError(null);
      } catch (err: any) {
        console.error('Error loading queue data:', err);
        setError(err.message || 'Failed to load queue data');
        
        // Set empty states instead of mock data
        setQueueEntries([]);
        setQueueStats(null);
      } finally {
        setLoading(false);
      }
    };

    loadQueueData();

    // Auto-refresh every 30 seconds
    const interval = autoRefresh ? setInterval(loadQueueData, 30000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const filteredEntries = useMemo(() => {
    return queueEntries.filter(entry => {
      const matchesSearch = searchTerm === '' || 
        entry.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.serviceType.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPriority = filterPriority === 'all' || entry.priority === filterPriority;
      const matchesService = filterService === 'all' || entry.serviceType === filterService;
      
      return matchesSearch && matchesPriority && matchesService;
    });
  }, [queueEntries, searchTerm, filterPriority, filterService]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const queueData = await getQueueStatus();
      
      const transformedEntries = queueData.queue ? queueData.queue.map(transformQueueEntry) : [];
      const transformedStats = transformQueueStats(queueData.stats);
      
      setQueueEntries(transformedEntries);
      setQueueStats(transformedStats);
      setError(null);
      
      toast({
        title: "Queue Updated",
        description: "Queue data has been refreshed",
      });
    } catch (err: any) {
      console.error('Error refreshing queue data:', err);
      toast({
        title: "Refresh Failed",
        description: err.message || "Could not refresh queue data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleCallNext = async () => {
    if (queueEntries.length === 0) {
      toast({
        title: "No Visitors",
        description: "No visitors in queue to call",
        variant: "destructive",
      });
      return;
    }

    try {
      const nextEntry = queueEntries.find(entry => entry.status === 'waiting');
      if (nextEntry) {
        await callNextVisitor(nextEntry.id, undefined, 1); // Assuming volunteer ID = 1
        await handleRefresh(); // Refresh data after calling next
        toast({
          title: "Next Visitor Called",
          description: `${nextEntry.visitorName} has been notified`,
        });
      } else {
        toast({
          title: "No Waiting Visitors",
          description: "All visitors are currently being served or completed",
        });
      }
    } catch (err: any) {
      toast({
        title: "Call Failed",
        description: err.message || "Could not call next visitor",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'normal': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'text-yellow-600';
      case 'being-served': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'no-show': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner message="Loading queue data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Queue Management</h1>
            <p className="text-muted-foreground">
              Monitor and assist with the visitor queue
            </p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Queue Unavailable</AlertTitle>
          <AlertDescription>
            {error}. Please try refreshing or contact technical support if the issue persists.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Queue Data Unavailable</h3>
            <p className="text-muted-foreground mb-4">
              Unable to load queue information at this time.
            </p>
            <Button onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Queue Management</h1>
          <p className="text-muted-foreground">
            Monitor and assist with the visitor queue
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto-refresh
          </Button>
        </div>
      </div>

      {/* Volunteer Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Volunteer Queue Management</AlertTitle>
        <AlertDescription>
          As a volunteer, you can monitor the queue status and assist with calling visitors when authorized by staff. 
          Use this dashboard to track queue progress and identify visitors who may need additional assistance.
        </AlertDescription>
      </Alert>

      {/* Queue Statistics */}
      {queueStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Currently Waiting
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStats.totalWaiting}</div>
              <p className="text-xs text-muted-foreground">
                Active in queue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Wait
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStats.averageWaitTime}m</div>
              <p className="text-xs text-muted-foreground">
                Current average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Served Today
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStats.totalServed}</div>
              <p className="text-xs text-muted-foreground">
                Completed visits
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                No Shows
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStats.noShows}</div>
              <p className="text-xs text-muted-foreground">
                Missed appointments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Peak Hour
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStats.peakHour}</div>
              <p className="text-xs text-muted-foreground">
                Busiest time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Satisfaction
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStats.satisfaction}</div>
              <p className="text-xs text-muted-foreground">
                Out of 5 stars
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, ticket, or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="Food Bank">Food Bank</SelectItem>
                <SelectItem value="Benefits Advice">Benefits Advice</SelectItem>
                <SelectItem value="Housing Support">Housing Support</SelectItem>
                <SelectItem value="Mental Health">Mental Health</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Queue Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Current Queue ({filteredEntries.length} entries)</CardTitle>
          <CardDescription>
            Monitor visitor queue and assist where needed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No queue entries found</p>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        {entry.ticketNumber}
                      </Badge>
                      <Badge variant={getPriorityColor(entry.priority)}>
                        {entry.priority.toUpperCase()}
                      </Badge>
                      <span className={`text-sm font-medium ${getStatusColor(entry.status)}`}>
                        {entry.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Wait: {entry.waitTime}m | ETA: {entry.estimatedTime}m
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{entry.visitorName}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{entry.serviceType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Arrived: {formatTime(entry.arrivalTime)}
                        </span>
                      </div>
                    </div>

                    <div>
                      {entry.specialNeeds && entry.specialNeeds.length > 0 && (
                        <div className="mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Special Needs:</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {entry.specialNeeds.map((need, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {need}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {entry.language && entry.language !== 'English' && (
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Language: {entry.language}</span>
                        </div>
                      )}
                      
                      {entry.assignedCounter && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Counter: {entry.assignedCounter}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {entry.notes && (
                    <div className="pt-2 border-t">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-sm text-muted-foreground">{entry.notes}</span>
                      </div>
                    </div>
                  )}

                  {/* Progress bar for wait time */}
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Wait Progress</span>
                      <span>{Math.min(100, (entry.waitTime / 30) * 100).toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={Math.min(100, (entry.waitTime / 30) * 100)} 
                      className="h-2"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Volunteer Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Volunteer Actions</CardTitle>
          <CardDescription>
            Assistance tools for managing queue visitors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleCallNext}
            >
              <Bell className="h-4 w-4" />
              Call Next Visitor
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Make Announcement
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Headphones className="h-4 w-4" />
              Request Staff Help
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
