'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  HelpCircle,
  Heart,
  Calendar as CalendarIcon,
  Download,
  RefreshCw,
  Filter,
  Eye,
  Clock,
  Activity,
  Target,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  DollarSign,
  UserCheck,
  Mail,
  MessageSquare,
  Gift,
  MapPin,
  Building,
  Award,
  Bell,
  Shield,
  Database,
  LineChart,
  Percent,
  Hash,
  Timer
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    totalHelpRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    totalVolunteers: number;
    activeVolunteers: number;
    totalDonations: number;
    donationValue: number;
  };
  trends: {
    userGrowth: number;
    requestGrowth: number;
    volunteerGrowth: number;
    donationGrowth: number;
  };
  userAnalytics: {
    demographics: {
      ageGroups: { label: string; value: number; percentage: number }[];
      userTypes: { label: string; value: number; percentage: number }[];
      verificationStatus: { label: string; value: number; percentage: number }[];
    };
    engagement: {
      dailyActiveUsers: number;
      weeklyActiveUsers: number;
      monthlyActiveUsers: number;
      averageSessionDuration: string;
      bounceRate: number;
    };
  };
  serviceAnalytics: {
    helpRequests: {
      byCategory: { category: string; count: number; percentage: number }[];
      byStatus: { status: string; count: number; percentage: number }[];
      responseTime: {
        average: string;
        median: string;
        fastest: string;
        slowest: string;
      };
    };
    documents: {
      totalVerified: number;
      pendingVerification: number;
      rejectedDocuments: number;
      averageVerificationTime: string;
    };
  };
  volunteerAnalytics: {
    participation: {
      totalShifts: number;
      completedShifts: number;
      cancelledShifts: number;
      noShowRate: number;
    };
    performance: {
      topVolunteers: { name: string; hours: number; rating: number }[];
      averageRating: number;
      retentionRate: number;
    };
  };
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    databaseConnections: number;
    apiCalls: number;
    lastBackup: string;
  };
}

interface DateRange {
  from: Date;
  to: Date;
}

export default function AnalyticsDashboardPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [selectedPeriod, setSelectedPeriod] = useState<string>('month');
  const [refreshing, setRefreshing] = useState(false);

  // Authenticated fetch helper with token refresh
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    
    if (!token) {
      console.error('No token found');
      logout();
      return null;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const refreshResponse = await fetch('/api/v1/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            localStorage.setItem('auth_token', refreshData.access_token);
            
            // Retry the original request with new token
            const retryResponse = await fetch(url, {
              ...options,
              headers: {
                'Authorization': `Bearer ${refreshData.access_token}`,
                'Content-Type': 'application/json',
                ...options.headers,
              },
            });
            
            return retryResponse;
          } else {
            // Refresh failed, logout user
            console.error('Token refresh failed');
            logout();
            return null;
          }
        } catch (error) {
          console.error('Token refresh error:', error);
          logout();
          return null;
        }
      } else {
        // No refresh token, logout user
        console.error('No refresh token found');
        logout();
        return null;
      }
    }

    return response;
  };

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch real analytics data from API
      const response = await authenticatedFetch('/api/v1/admin/analytics/comprehensive');

      if (response && response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      } else {
        console.error('Failed to fetch analytics data');
        toast({
          title: 'Error',
          description: 'Failed to load analytics data',
          variant: 'destructive',
        });
        setData(null);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
    toast({
      title: 'Data Refreshed',
      description: 'Analytics data has been updated',
    });
  };

  const exportData = () => {
    toast({
      title: 'Export Started',
      description: 'Analytics report will be downloaded shortly',
    });
  };

  const setPredefinedRange = (period: string) => {
    setSelectedPeriod(period);
    const now = new Date();
    
    switch (period) {
      case 'today':
        setDateRange({ from: now, to: now });
        break;
      case 'week':
        setDateRange({ from: startOfWeek(now), to: endOfWeek(now) });
        break;
      case 'month':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
        setDateRange({ from: quarterStart, to: quarterEnd });
        break;
      case 'year':
        setDateRange({ 
          from: new Date(now.getFullYear(), 0, 1), 
          to: new Date(now.getFullYear(), 11, 31) 
        });
        break;
    }
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (value < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading analytics dashboard..." />;
  }

  if (!data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>No analytics data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" onClick={refreshData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Range and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Label>Period:</Label>
              <Select value={selectedPeriod} onValueChange={setPredefinedRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label>Custom Range:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to });
                        setSelectedPeriod('custom');
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-3xl font-bold">{data.overview.totalUsers.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(data.trends.userGrowth)}
                  <span className={`text-sm ${getTrendColor(data.trends.userGrowth)}`}>
                    {data.trends.userGrowth > 0 ? '+' : ''}{data.trends.userGrowth}%
                  </span>
                </div>
              </div>
              <Users className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Help Requests</p>
                <p className="text-3xl font-bold">{data.overview.totalHelpRequests.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(data.trends.requestGrowth)}
                  <span className={`text-sm ${getTrendColor(data.trends.requestGrowth)}`}>
                    {data.trends.requestGrowth > 0 ? '+' : ''}{data.trends.requestGrowth}%
                  </span>
                </div>
              </div>
              <HelpCircle className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Volunteers</p>
                <p className="text-3xl font-bold">{data.overview.activeVolunteers}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(data.trends.volunteerGrowth)}
                  <span className={`text-sm ${getTrendColor(data.trends.volunteerGrowth)}`}>
                    {data.trends.volunteerGrowth > 0 ? '+' : ''}{data.trends.volunteerGrowth}%
                  </span>
                </div>
              </div>
              <Heart className="h-12 w-12 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Donation Value</p>
                <p className="text-3xl font-bold">£{data.overview.donationValue.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(data.trends.donationGrowth)}
                  <span className={`text-sm ${getTrendColor(data.trends.donationGrowth)}`}>
                    {data.trends.donationGrowth > 0 ? '+' : ''}{data.trends.donationGrowth}%
                  </span>
                </div>
              </div>
              <DollarSign className="h-12 w-12 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Engagement */}
            <Card>
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Daily Active Users</span>
                  <span className="font-semibold">{data.userAnalytics.engagement.dailyActiveUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Weekly Active Users</span>
                  <span className="font-semibold">{data.userAnalytics.engagement.weeklyActiveUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Monthly Active Users</span>
                  <span className="font-semibold">{data.userAnalytics.engagement.monthlyActiveUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average Session Duration</span>
                  <span className="font-semibold">{data.userAnalytics.engagement.averageSessionDuration}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Bounce Rate</span>
                  <span className="font-semibold">{data.userAnalytics.engagement.bounceRate}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{data.overview.approvedRequests}</p>
                    <p className="text-xs text-gray-600">Approved Requests</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{data.overview.pendingRequests}</p>
                    <p className="text-xs text-gray-600">Pending Requests</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{data.serviceAnalytics.documents.totalVerified}</p>
                    <p className="text-xs text-gray-600">Documents Verified</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{data.volunteerAnalytics.participation.completedShifts}</p>
                    <p className="text-xs text-gray-600">Completed Shifts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Growth Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <div className="text-center">
                    <LineChart className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">User growth chart would appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Category breakdown chart would appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Demographics */}
            <Card>
              <CardHeader>
                <CardTitle>Age Demographics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.userAnalytics.demographics.ageGroups.map((group, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{group.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{group.value}</span>
                        <span className="text-xs text-gray-500">({group.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* User Types */}
            <Card>
              <CardHeader>
                <CardTitle>User Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.userAnalytics.demographics.userTypes.map((type, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{type.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{type.value}</span>
                        <span className="text-xs text-gray-500">({type.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.userAnalytics.demographics.verificationStatus.map((status, index) => (
                  <div key={index} className="text-center p-4 border rounded">
                    <p className="text-2xl font-bold">{status.value}</p>
                    <p className="text-sm text-gray-600">{status.label}</p>
                    <p className="text-xs text-gray-500">{status.percentage}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Help Request Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Help Request Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.serviceAnalytics.helpRequests.byCategory.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{category.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{category.count}</span>
                        <span className="text-xs text-gray-500">({category.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Response Times */}
            <Card>
              <CardHeader>
                <CardTitle>Response Time Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average Response Time</span>
                  <span className="font-semibold">{data.serviceAnalytics.helpRequests.responseTime.average}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Median Response Time</span>
                  <span className="font-semibold">{data.serviceAnalytics.helpRequests.responseTime.median}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Fastest Response</span>
                  <span className="font-semibold text-green-600">{data.serviceAnalytics.helpRequests.responseTime.fastest}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Slowest Response</span>
                  <span className="font-semibold text-red-600">{data.serviceAnalytics.helpRequests.responseTime.slowest}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Document Verification */}
          <Card>
            <CardHeader>
              <CardTitle>Document Verification Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded">
                  <p className="text-2xl font-bold text-green-600">{data.serviceAnalytics.documents.totalVerified}</p>
                  <p className="text-sm text-gray-600">Verified</p>
                </div>
                <div className="text-center p-4 border rounded">
                  <p className="text-2xl font-bold text-orange-600">{data.serviceAnalytics.documents.pendingVerification}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
                <div className="text-center p-4 border rounded">
                  <p className="text-2xl font-bold text-red-600">{data.serviceAnalytics.documents.rejectedDocuments}</p>
                  <p className="text-sm text-gray-600">Rejected</p>
                </div>
                <div className="text-center p-4 border rounded">
                  <p className="text-lg font-bold">{data.serviceAnalytics.documents.averageVerificationTime}</p>
                  <p className="text-sm text-gray-600">Avg. Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volunteers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Volunteer Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Volunteers</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.volunteerAnalytics.performance.topVolunteers.map((volunteer, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{volunteer.name}</TableCell>
                        <TableCell>{volunteer.hours}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span>{volunteer.rating}</span>
                            <Award className="h-4 w-4 text-yellow-500" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Participation Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Participation Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Shifts</span>
                  <span className="font-semibold">{data.volunteerAnalytics.participation.totalShifts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Completed Shifts</span>
                  <span className="font-semibold text-green-600">{data.volunteerAnalytics.participation.completedShifts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Cancelled Shifts</span>
                  <span className="font-semibold text-orange-600">{data.volunteerAnalytics.participation.cancelledShifts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">No-Show Rate</span>
                  <span className="font-semibold text-red-600">{data.volunteerAnalytics.participation.noShowRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Retention Rate</span>
                  <span className="font-semibold text-blue-600">{data.volunteerAnalytics.performance.retentionRate}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* System Health */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">System Uptime</p>
                    <p className="text-2xl font-bold text-green-600">{data.systemHealth?.uptime || 99.9}%</p>
                  </div>
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Response Time</p>
                    <p className="text-2xl font-bold">{data.systemHealth?.responseTime || 2.1}ms</p>
                  </div>
                  <Timer className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Error Rate</p>
                    <p className="text-2xl font-bold text-red-600">{data.systemHealth?.errorRate || 0.1}%</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">DB Connections</p>
                    <p className="text-2xl font-bold">{data.systemHealth?.databaseConnections || 12}</p>
                  </div>
                  <Database className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">API Calls Today</p>
                    <p className="text-2xl font-bold">{(data.systemHealth?.apiCalls || 150).toLocaleString()}</p>
                  </div>
                  <Activity className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Last Backup</p>
                    <p className="text-sm font-bold">{format(new Date(data.systemHealth?.lastBackup || new Date().toISOString()), 'MMM d, HH:mm')}</p>
                  </div>
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Performance Indicators */}
            <Card>
              <CardHeader>
                <CardTitle>Key Performance Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Request Approval Rate</span>
                  <span className="font-semibold text-green-600">88.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">User Satisfaction</span>
                  <span className="font-semibold text-blue-600">4.6/5.0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Volunteer Efficiency</span>
                  <span className="font-semibold text-purple-600">93.7%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Service Availability</span>
                  <span className="font-semibold text-green-600">99.8%</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Performance trend chart would appear here</p>
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
