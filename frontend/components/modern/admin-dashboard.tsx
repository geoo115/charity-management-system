'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserCheck,
  Calendar,
  BarChart3,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Settings,
  Shield,
  Database,
  FileText,
  Bell,
  MessageSquare,
  Heart,
  Zap,
  Target,
  Award,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  MapPin,
  Phone,
  Mail,
  Building,
  CreditCard,
  PieChart,
  LineChart,
  DollarSign,
  Package,
  Truck,
  Star,
  ThumbsUp,
  Siren,
  Monitor,
  X,
  AlertCircle,
  Info,
  CheckSquare,
  MoreHorizontal
} from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import AdminCommunicationCenter, { AdminCommunicationQuickAccess } from '@/components/admin/admin-communication-center';

// Enhanced animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
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

// Enhanced gradient backgrounds
const gradientClasses = {
  primary: "bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600",
  secondary: "bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600",
  warm: "bg-gradient-to-br from-orange-400 via-pink-500 to-red-500",
  cool: "bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600",
  success: "bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600",
  warning: "bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500",
  error: "bg-gradient-to-br from-red-400 via-rose-500 to-pink-600",
  info: "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600",
  neutral: "bg-gradient-to-br from-slate-400 via-gray-500 to-zinc-600",
  premium: "bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600"
};

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    label: string;
    positive: boolean;
  };
  gradient: keyof typeof gradientClasses;
  onClick?: () => void;
  badge?: string;
}

const AdminStatsCard: React.FC<AdminStatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  gradient,
  onClick,
  badge
}) => {
  return (
    <motion.div
      variants={cardHoverVariants}
      initial="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl cursor-pointer group
        ${onClick ? 'hover:shadow-xl' : ''}
        transition-all duration-300
      `}
    >
      <div className={`${gradientClasses[gradient]} p-[2px] rounded-2xl`}>
        <Card className="bg-white/95 backdrop-blur-sm border-0 h-full">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-600">{title}</p>
                  {badge && (
                    <Badge variant="secondary" className="text-xs">{badge}</Badge>
                  )}
                </div>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                {subtitle && (
                  <p className="text-sm text-gray-500">{subtitle}</p>
                )}
                {trend && (
                  <div className="flex items-center space-x-1">
                    {trend.positive ? (
                      <ArrowUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      trend.positive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trend.value}%
                    </span>
                    <span className="text-sm text-gray-500">{trend.label}</span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-xl ${gradientClasses[gradient]}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default function EnhancedAdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('week');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Dashboard data state
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    activeVolunteers: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    totalDonations: 0,
    newSignups: 0
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>({
    totalUsers: 0,
    activeUsers: 0,
    dailyActiveUsers: 0,
    weeklyActiveUsers: 0,
    monthlyActiveUsers: 0,
    serviceRequests: [],
    volunteerPerformance: []
  });
  const [activityData, setActivityData] = useState<any>({
    liveActivity: [],
    detailedLogs: [],
    sessionData: [],
    adminActionDistribution: []
  });
  const [bulkOperationsData, setBulkOperationsData] = useState<any>({
    totalUsers: 0,
    activeUsers: 0,
    jobs: [],
    recentOperations: []
  });
  const [auditData, setAuditData] = useState<any>({
    totalEvents: 0,
    complianceRate: 0,
    securityAlerts: [],
    reportsGenerated: 0,
    failedLogins: 0,
    suspiciousActivities: 0,
    dataAccessViolations: 0,
    systemIntegrity: 0,
    complianceStatus: [],
    auditLogs: []
  });

  // Helper function for authenticated API calls with token refresh
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

  // Helper function to format timestamps
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown time';
    
    try {
      // If it's already a Date object
      if (timestamp instanceof Date) {
        return timestamp.toLocaleTimeString();
      }
      
      // If it's a string, try to parse it
      if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString();
        }
      }
      
      // If it's a number (timestamp), convert it
      if (typeof timestamp === 'number') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString();
        }
      }
      
      // Fallback: return the original value as string
      return String(timestamp);
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid time';
    }
  };

  // Fetch dashboard stats
  const fetchDashboardStats = async () => {
    try {
      const response = await authenticatedFetch('/api/v1/admin/dashboard/stats');
      
      if (response && response.ok) {
        const data = await response.json();
        setDashboardStats(data.stats);
      } else {
        console.error('Failed to fetch dashboard stats');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  // Fetch chart data
  const fetchChartData = async () => {
    try {
      const response = await authenticatedFetch(`/api/v1/admin/dashboard/charts?timeRange=${selectedTimeRange}`);
      
      if (response && response.ok) {
        const data = await response.json();
        setChartData(data.chartData);
      } else {
        console.error('Failed to fetch chart data');
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      const response = await authenticatedFetch('/api/v1/admin/analytics');
      
      if (response && response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      } else {
        console.error('Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  };

  // Fetch activity data
  const fetchActivityData = async () => {
    try {
      const response = await authenticatedFetch('/api/v1/admin/activity');
      
      if (response && response.ok) {
        const data = await response.json();
        setActivityData(data);
      } else {
        console.error('Failed to fetch activity data');
      }
    } catch (error) {
      console.error('Error fetching activity data:', error);
    }
  };

  // Fetch bulk operations data
  const fetchBulkOperationsData = async () => {
    try {
      const response = await authenticatedFetch('/api/v1/admin/bulk-operations');
      
      if (response && response.ok) {
        const data = await response.json();
        setBulkOperationsData(data);
      } else {
        console.error('Failed to fetch bulk operations data');
      }
    } catch (error) {
      console.error('Error fetching bulk operations data:', error);
    }
  };

  // Fetch audit data
  const fetchAuditData = async () => {
    try {
      const response = await authenticatedFetch('/api/v1/admin/audit');
      
      if (response && response.ok) {
        const data = await response.json();
        setAuditData(data);
      } else {
        console.error('Failed to fetch audit data');
      }
    } catch (error) {
      console.error('Error fetching audit data:', error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await authenticatedFetch('/api/v1/admin/notifications');
      
      if (response && response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } else {
        console.error('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Load all data on component mount
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardStats(),
        fetchChartData(),
        fetchAnalyticsData(),
        fetchActivityData(),
        fetchBulkOperationsData(),
        fetchAuditData(),
        fetchNotifications()
      ]);
      setLoading(false);
    };

    loadAllData();
  }, []);

  // Refetch chart data when time range changes
  useEffect(() => {
    fetchChartData();
  }, [selectedTimeRange]);

  // Real-time notifications (WebSocket or polling)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchChartData(),
        fetchAnalyticsData(),
        fetchActivityData(),
        fetchBulkOperationsData(),
        fetchAuditData(),
        fetchNotifications()
      ]);
      toast({
        title: "Dashboard refreshed",
        description: "All data has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Some data could not be updated. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  }, [toast]);

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await authenticatedFetch(`/api/v1/admin/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      
      if (response && response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await authenticatedFetch('/api/v1/admin/notifications/read-all', {
        method: 'PUT',
      });
      
      if (response && response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearNotification = async (notificationId: number) => {
    try {
      const response = await authenticatedFetch(`/api/v1/admin/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      
      if (response && response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error clearing notification:', error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 p-8"
      >
        {/* Header */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-gray-900 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Comprehensive overview of your donation hub operations
            </p>
          </div>
          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            {/* Notification Bell */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
              
              {/* Notification Panel */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-hidden"
                  >
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Notifications</h3>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            className="text-xs"
                          >
                            Mark all read
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowNotifications(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications
                          .filter(notification => notification && (notification.id || notification.title)) // Filter out empty/undefined notifications
                          .map((notification, index) => {
                            // Ensure we have a unique key even if notification.id is empty/undefined
                            const uniqueKey = `notification-${notification.id || `index-${index}`}`;
                            return (
                              <div
                                key={uniqueKey}
                                className={`p-3 border-b hover:bg-gray-50 transition-colors ${
                                  !notification.read ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => markAsRead(notification.id)}
                              >
                                <div className="flex items-start space-x-3">
                                  {notification.icon ? (
                                    <notification.icon className={`h-5 w-5 mt-0.5 ${notification.color || 'text-gray-600'}`} />
                                  ) : (
                                    <Bell className={`h-5 w-5 mt-0.5 ${notification.color || 'text-gray-600'}`} />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-medium text-gray-900">
                                        {notification.title}
                                      </p>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          clearNotification(notification.id);
                                        }}
                                        className="h-6 w-6 p-0"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {formatTimestamp(notification.timestamp)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No notifications</p>
                          </div>
                        )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          variants={itemVariants}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AdminStatsCard
            title="Total Users"
            value={dashboardStats.totalUsers.toLocaleString()}
            subtitle="Registered members"
            icon={Users}
            gradient="primary"
            trend={{ value: 12, label: "vs last month", positive: true }}
            onClick={() => window.location.href = '/admin/users'}
          />
          <AdminStatsCard
            title="Active Volunteers"
            value={dashboardStats.activeVolunteers}
            subtitle="Currently serving"
            icon={UserCheck}
            gradient="success"
            trend={{ value: 8, label: "vs last week", positive: true }}
            onClick={() => window.location.href = '/admin/volunteers'}
          />
          <AdminStatsCard
            title="Pending Requests"
            value={dashboardStats.pendingRequests}
            subtitle="Awaiting approval"
            icon={Clock}
            gradient="warning"
            badge="Urgent"
            onClick={() => window.location.href = '/admin/help-requests'}
          />
          <AdminStatsCard
            title="Total Donations"
            value={`£${dashboardStats.totalDonations.toLocaleString()}`}
            subtitle="This month"
            icon={Heart}
            gradient="warm"
            trend={{ value: 15, label: "vs last month", positive: true }}
            onClick={() => window.location.href = '/admin/donations'}
          />
        </motion.div>

        {/* System Status Row */}
        <motion.div 
          variants={itemVariants}
          className="grid gap-4 md:grid-cols-4"
        >
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-800">System Online</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Database: Healthy</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">API: 99.9% Uptime</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Security: Active</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Tabs */}
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="flex w-full overflow-x-auto">
              <TabsTrigger value="overview" className="flex-shrink-0">Overview</TabsTrigger>
              <TabsTrigger value="users" className="flex-shrink-0">Users</TabsTrigger>
              <TabsTrigger value="requests" className="flex-shrink-0">Requests</TabsTrigger>
              <TabsTrigger value="analytics" className="flex-shrink-0">Analytics</TabsTrigger>
              <TabsTrigger value="activity" className="flex-shrink-0">Activity</TabsTrigger>
              <TabsTrigger value="bulk" className="flex-shrink-0">Bulk</TabsTrigger>
              <TabsTrigger value="audit" className="flex-shrink-0">Audit</TabsTrigger>
            </TabsList>

            <AnimatePresence>
              <TabsContent key="overview" value="overview" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid gap-6 lg:grid-cols-2"
                >
                  {/* Quick Actions */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { 
                          id: 'emergency-procedures', 
                          title: 'Emergency Procedures', 
                          icon: Siren, 
                          href: '/admin/emergency', 
                          count: null, 
                          urgent: true, 
                          color: 'text-red-600' 
                        },
                        { 
                          id: 'approve-volunteers', 
                          title: 'Approve Volunteers', 
                          icon: UserCheck, 
                          href: '/admin/volunteers', 
                          count: dashboardStats.newSignups || 0, 
                          color: 'text-blue-600' 
                        },
                        { 
                          id: 'review-requests', 
                          title: 'Review Help Requests', 
                          icon: MessageSquare, 
                          href: '/admin/help-requests', 
                          count: dashboardStats.pendingRequests || 0, 
                          color: 'text-orange-600' 
                        },
                        { 
                          id: 'manage-users', 
                          title: 'Manage Users', 
                          icon: Users, 
                          href: '/admin/users', 
                          count: null, 
                          color: 'text-green-600' 
                        },
                        { 
                          id: 'analytics-dashboard', 
                          title: 'Analytics Dashboard', 
                          icon: BarChart3, 
                          href: '/admin/analytics', 
                          count: null, 
                          color: 'text-purple-600' 
                        },
                        { 
                          id: 'system-health', 
                          title: 'System Health', 
                          icon: Monitor, 
                          href: '/admin/system-health', 
                          count: null, 
                          color: 'text-indigo-600' 
                        },
                        { 
                          id: 'communications', 
                          title: 'Communications', 
                          icon: MessageSquare, 
                          href: '/admin/communications', 
                          count: null, 
                          color: 'text-teal-600' 
                        },
                        { 
                          id: 'system-settings', 
                          title: 'System Settings', 
                          icon: Settings, 
                          href: '/admin/settings', 
                          count: null, 
                          color: 'text-gray-600' 
                        }
                      ].map((action, idx) => {
                        const uniqueKey = `action-${action.id || `action-${idx}`}`;
                        const IconComponent = action.icon;
                        return (
                          <Link key={uniqueKey} href={action.href}>
                            <Button variant="ghost" className={`w-full justify-start group ${action.urgent ? 'hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50' : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50'}`}>
                              {IconComponent && <IconComponent className={`h-4 w-4 mr-3 ${action.color} group-hover:scale-110 transition-transform`} />}
                              <span className="flex-1 text-left">{action.title}</span>
                              {action.count && action.count > 0 && (
                                <Badge variant="secondary" className="bg-red-100 text-red-800">
                                  {action.count}
                                </Badge>
                              )}
                              <ChevronRight className={`h-4 w-4 ${action.urgent ? 'text-red-400' : 'text-gray-400 group-hover:text-blue-600'}`} />
                            </Button>
                          </Link>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Activity className="h-5 w-5 mr-2 text-green-600" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(activityData.liveActivity || [])
                        .filter((activity: any) => activity && (activity.id || activity.user || activity.action))
                        .slice(0, 4)
                        .map((activity: any, index: number) => {
                          const uniqueKey = `recent-activity-${activity.id || activity.user || `index-${index}`}`;
                          return (
                            <div key={uniqueKey} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="p-2 rounded-full bg-blue-100">
                                <Activity className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                                <p className="text-xs text-gray-500">{activity.time}</p>
                              </div>
                            </div>
                          );
                        })}
                      {(!activityData.liveActivity || activityData.liveActivity.length === 0) && (
                        <div className="text-center py-4 text-gray-500">
                          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No recent activity</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Charts Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="grid gap-6 lg:grid-cols-2"
                >
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>User Growth</CardTitle>
                      <CardDescription>Monthly registration trends</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" stroke="#666" />
                          <YAxis stroke="#666" />
                          <Tooltip />
                          <Area 
                            type="monotone" 
                            dataKey="users" 
                            stroke="#10b981" 
                            fill="url(#colorUsers)" 
                            strokeWidth={2}
                          />
                          <defs>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Service Distribution</CardTitle>
                      <CardDescription>Help request categories</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={analyticsData.serviceRequests || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          />
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent key="users" value="users" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {/* User Overview */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>User Overview</span>
                        <Button variant="outline" size="sm" onClick={() => window.location.href = '/admin/users'}>
                          <Users className="h-4 w-4 mr-2" />
                          Manage Users
                        </Button>
                      </CardTitle>
                      <CardDescription>Current user statistics and management</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-blue-600">{dashboardStats.totalUsers}</p>
                          <p className="text-sm text-blue-600">Total Users</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <UserCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-green-600">{dashboardStats.activeVolunteers}</p>
                          <p className="text-sm text-green-600">Active Volunteers</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-yellow-600">{dashboardStats.newSignups}</p>
                          <p className="text-sm text-yellow-600">New Signups</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-purple-600">{dashboardStats.approvedRequests}</p>
                          <p className="text-sm text-purple-600">Approved Requests</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent User Activity */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Recent User Activity</CardTitle>
                      <CardDescription>Latest user registrations and activities</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {(activityData.liveActivity || [])
                          .filter((activity: any) => activity && activity.user && activity.action)
                          .slice(0, 5)
                          .map((activity: any, index: number) => (
                            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                              <div className="p-2 rounded-full bg-blue-100">
                                <Activity className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{activity.user}</p>
                                <p className="text-xs text-gray-600">{activity.action}</p>
                              </div>
                              <span className="text-xs text-gray-500">{activity.time}</span>
                            </div>
                          ))}
                        {(!activityData.liveActivity || activityData.liveActivity.length === 0) && (
                          <div className="text-center py-8 text-gray-500">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No recent user activity</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent key="requests" value="requests" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {/* Request Overview */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Help Request Overview</span>
                        <Button variant="outline" size="sm" onClick={() => window.location.href = '/admin/help-requests'}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Manage Requests
                        </Button>
                      </CardTitle>
                      <CardDescription>Current help request statistics and processing</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-orange-600">{dashboardStats.pendingRequests}</p>
                          <p className="text-sm text-orange-600">Pending Requests</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-green-600">{dashboardStats.approvedRequests}</p>
                          <p className="text-sm text-green-600">Approved Requests</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-blue-600">{dashboardStats.totalDonations}</p>
                          <p className="text-sm text-blue-600">Total Donations</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <Activity className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-purple-600">{dashboardStats.activeVolunteers}</p>
                          <p className="text-sm text-purple-600">Active Volunteers</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Requests */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Recent Help Requests</CardTitle>
                      <CardDescription>Latest help requests requiring attention</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {(activityData.liveActivity || [])
                          .filter((activity: any) => activity && activity.action && activity.action.toLowerCase().includes('request'))
                          .slice(0, 5)
                          .map((activity: any, index: number) => (
                            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                              <div className="p-2 rounded-full bg-orange-100">
                                <MessageSquare className="h-4 w-4 text-orange-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{activity.user || 'System'}</p>
                                <p className="text-xs text-gray-600">{activity.action}</p>
                              </div>
                              <span className="text-xs text-gray-500">{activity.time}</span>
                            </div>
                          ))}
                        {(!activityData.liveActivity || activityData.liveActivity.length === 0) && (
                          <div className="text-center py-8 text-gray-500">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No recent help requests</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Request Processing Stats */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Request Processing Statistics</CardTitle>
                      <CardDescription>Help request processing metrics and performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Average Processing Time</span>
                          <span className="text-sm font-medium">2.5 hours</span>
                        </div>
                        <Progress value={75} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Approval Rate</span>
                          <span className="text-sm font-medium">85%</span>
                        </div>
                        <Progress value={85} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Response Time</span>
                          <span className="text-sm font-medium">1.2 hours</span>
                        </div>
                        <Progress value={60} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent key="analytics" value="analytics" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="grid gap-6 lg:grid-cols-2"
                >
                  {/* Advanced User Analytics */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>User Behavior Analytics</span>
                        <Button variant="outline" size="sm" onClick={() => window.location.href = '/admin/analytics'}>
                          <Download className="h-4 w-4 mr-2" />
                          Detailed Analytics
                        </Button>
                      </CardTitle>
                      <CardDescription>Detailed user engagement and activity patterns</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{dashboardStats.totalUsers || analyticsData.totalUsers || 0}</p>
                          <p className="text-sm text-blue-600">Total Users</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{dashboardStats.activeVolunteers || analyticsData.activeUsers || 0}</p>
                          <p className="text-sm text-green-600">Active Users</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Daily Active Users</span>
                          <span className="text-sm font-medium">{analyticsData.dailyActiveUsers || 0}%</span>
                        </div>
                        <Progress value={analyticsData.dailyActiveUsers || 0} className="h-2" />
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Weekly Active Users</span>
                          <span className="text-sm font-medium">{analyticsData.weeklyActiveUsers || 0}%</span>
                        </div>
                        <Progress value={analyticsData.weeklyActiveUsers || 0} className="h-2" />
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Monthly Active Users</span>
                          <span className="text-sm font-medium">{analyticsData.monthlyActiveUsers || 0}%</span>
                        </div>
                        <Progress value={analyticsData.monthlyActiveUsers || 0} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* System Performance Analytics */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>System Performance</span>
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Healthy
                        </Badge>
                      </CardTitle>
                      <CardDescription>Real-time system metrics and performance indicators</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">{analyticsData.uptime || 99.9}%</p>
                          <p className="text-sm text-purple-600">Uptime</p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <p className="text-2xl font-bold text-orange-600">{analyticsData.avgResponseTime || 150}ms</p>
                          <p className="text-sm text-orange-600">Avg Response</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">CPU Usage</span>
                          <span className="text-sm font-medium">{analyticsData.cpuUsage || 45}%</span>
                        </div>
                        <Progress value={analyticsData.cpuUsage || 45} className="h-2" />
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Memory Usage</span>
                          <span className="text-sm font-medium">{analyticsData.memoryUsage || 62}%</span>
                        </div>
                        <Progress value={analyticsData.memoryUsage || 62} className="h-2" />
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Database Connections</span>
                          <span className="text-sm font-medium">{analyticsData.dbConnections || 12}/{analyticsData.maxDbConnections || 50}</span>
                        </div>
                        <Progress value={((analyticsData.dbConnections || 12) / (analyticsData.maxDbConnections || 50)) * 100} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Service Analytics */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Service Request Analytics</CardTitle>
                      <CardDescription>Help request processing and response metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.serviceRequests || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="category" stroke="#666" />
                          <YAxis stroke="#666" />
                          <Tooltip />
                          <Bar dataKey="requests" fill="#3b82f6" name="Total Requests" />
                          <Bar dataKey="resolved" fill="#10b981" name="Resolved" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Volunteer Performance Analytics */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Volunteer Performance</CardTitle>
                      <CardDescription>Volunteer engagement and effectiveness metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={analyticsData.volunteerPerformance || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          />
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Trend Analysis */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Trend Analysis</CardTitle>
                      <CardDescription>Monthly trends and growth patterns</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" stroke="#666" />
                          <YAxis stroke="#666" />
                          <Tooltip />
                          <Area 
                            type="monotone" 
                            dataKey="users" 
                            stroke="#10b981" 
                            fill="url(#colorUsers)" 
                            strokeWidth={2}
                          />
                          <defs>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Key Performance Indicators */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Key Performance Indicators</CardTitle>
                      <CardDescription>Critical metrics for system performance and user satisfaction</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                          <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-blue-600 mb-2">User Growth</h3>
                          <p className="text-3xl font-bold text-blue-800">{dashboardStats.newSignups || 0}</p>
                          <p className="text-sm text-blue-600 mt-1">New registrations this month</p>
                        </div>
                        
                        <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-green-600 mb-2">Request Success</h3>
                          <p className="text-3xl font-bold text-green-800">{dashboardStats.approvedRequests || 0}</p>
                          <p className="text-sm text-green-600 mt-1">Successfully processed requests</p>
                        </div>
                        
                        <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                          <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-purple-600 mb-2">Volunteer Engagement</h3>
                          <p className="text-3xl font-bold text-purple-800">{dashboardStats.activeVolunteers || 0}</p>
                          <p className="text-sm text-purple-600 mt-1">Active volunteers this week</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent key="activity" value="activity" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {/* Real-time Activity Monitor */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Real-time Activity Monitor</span>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-green-600">Live</span>
                          </div>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export Logs
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription>Live tracking of user actions and system events</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Activity Stats */}
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">{activityData.activeSessions || 0}</p>
                            <p className="text-sm text-blue-600">Active Sessions</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{activityData.actionsToday || 0}</p>
                            <p className="text-sm text-green-600">Actions Today</p>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <p className="text-2xl font-bold text-purple-600">{activityData.adminActions || 0}</p>
                            <p className="text-sm text-purple-600">Admin Actions</p>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <p className="text-2xl font-bold text-orange-600">{activityData.alerts || 0}</p>
                            <p className="text-sm text-orange-600">Alerts</p>
                          </div>
                        </div>

                        {/* Live Activity Feed */}
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <h4 className="font-semibold mb-3">Live Activity Feed</h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {(activityData.liveActivity || [])
                              .filter((activity: any) => activity && (activity.id || activity.user || activity.action)) // Filter out empty/undefined activities
                              .map((activity: any, index: number) => {
                                const uniqueKey = `live-activity-${activity.id || activity.user || `index-${index}`}`;
                                return (
                                  <div key={uniqueKey} className="flex items-center space-x-3 p-2 bg-white rounded border">
                                    <div className={`w-2 h-2 rounded-full ${
                                      activity.type === 'success' ? 'bg-green-500' :
                                      activity.type === 'warning' ? 'bg-yellow-500' :
                                      activity.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                                    }`}></div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{activity.user}</p>
                                      <p className="text-xs text-gray-600">{activity.action}</p>
                                    </div>
                                    <span className="text-xs text-gray-500">{activity.time}</span>
                                  </div>
                                );
                              })}
                            {(!activityData.liveActivity || activityData.liveActivity.length === 0) && (
                              <div className="text-center py-4 text-gray-500">
                                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No recent activity</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* User Session Analytics */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="grid gap-6 lg:grid-cols-2"
                >
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>User Session Analytics</CardTitle>
                      <CardDescription>Session duration and user engagement patterns</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={activityData.sessionData || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="hour" stroke="#666" />
                          <YAxis stroke="#666" />
                          <Tooltip />
                          <Bar dataKey="sessions" fill="#3b82f6" name="Active Sessions" />
                          <Bar dataKey="avgDuration" fill="#10b981" name="Avg Duration (min)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Admin Action Distribution</CardTitle>
                      <CardDescription>Most common admin actions and their frequency</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={activityData.adminActionDistribution || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          />
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Detailed Activity Logs */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Detailed Activity Logs</span>
                        <div className="flex space-x-2">
                          <Select defaultValue="all">
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Actions</SelectItem>
                              <SelectItem value="admin">Admin Only</SelectItem>
                              <SelectItem value="system">System Only</SelectItem>
                              <SelectItem value="security">Security Events</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm">
                            <Filter className="h-4 w-4 mr-2" />
                            Filter
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription>Comprehensive log of all system activities and user actions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {(activityData.detailedLogs || [])
                          .filter((log: any) => log && (log.id || log.timestamp || log.action)) // Filter out empty/undefined logs
                          .map((log: any, index: number) => {
                            const uniqueKey = `detailed-log-${log.id || log.timestamp || `index-${index}`}`;
                            return (
                              <div key={uniqueKey} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg border">
                                <div className={`w-3 h-3 rounded-full ${
                                  log.severity === 'critical' ? 'bg-red-500' :
                                  log.severity === 'high' ? 'bg-orange-500' :
                                  log.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                }`}></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                                    <span className="text-xs text-gray-500">{log.timestamp}</span>
                                  </div>
                                  <p className="text-sm text-gray-600">{log.details}</p>
                                  <div className="flex items-center space-x-4 mt-1">
                                    <span className="text-xs text-gray-500">User: {log.user}</span>
                                    <span className="text-xs text-gray-500">IP: {log.ip}</span>
                                    <Badge variant="outline" className={`text-xs ${
                                      log.severity === 'critical' ? 'border-red-200 text-red-700' :
                                      log.severity === 'high' ? 'border-orange-200 text-orange-700' :
                                      log.severity === 'medium' ? 'border-yellow-200 text-yellow-700' : 'border-green-200 text-green-700'
                                    }`}>
                                      {log.severity}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        {(!activityData.detailedLogs || activityData.detailedLogs.length === 0) && (
                          <div className="text-center py-8 text-gray-500">
                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No activity logs available</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent key="bulk" value="bulk" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {/* Bulk Operations Overview */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Bulk Operations Center</span>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          Advanced Tools
                        </Badge>
                      </CardTitle>
                      <CardDescription>Mass user management and data processing tools</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                          <p className="text-lg font-semibold text-blue-600">{bulkOperationsData.totalUsers || 0}</p>
                          <p className="text-sm text-blue-600">Total Users</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <UserCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <p className="text-lg font-semibold text-green-600">{bulkOperationsData.activeUsers || 0}</p>
                          <p className="text-sm text-green-600">Active Users</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                          <p className="text-lg font-semibold text-purple-600">{bulkOperationsData.pendingJobs || 0}</p>
                          <p className="text-sm text-purple-600">Pending Actions</p>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <Database className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                          <p className="text-lg font-semibold text-orange-600">{bulkOperationsData.totalJobs || 0}</p>
                          <p className="text-sm text-orange-600">Bulk Jobs</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Bulk User Management */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="grid gap-6 lg:grid-cols-2"
                >
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Bulk User Management</CardTitle>
                      <CardDescription>Mass user operations and status updates</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <Button className="w-full justify-start" variant="outline">
                          <UserCheck className="h-4 w-4 mr-2" />
                          Bulk Approve Users
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <X className="h-4 w-4 mr-2" />
                          Bulk Deactivate Users
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <Shield className="h-4 w-4 mr-2" />
                          Bulk Permission Update
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <Mail className="h-4 w-4 mr-2" />
                          Bulk Email Send
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Bulk Settings Update
                        </Button>
                      </div>
                      
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2">Quick Filters</h4>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="filter-active" />
                            <Label htmlFor="filter-active" className="text-sm">Active Users Only</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="filter-pending" />
                            <Label htmlFor="filter-pending" className="text-sm">Pending Approval</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="filter-volunteers" />
                            <Label htmlFor="filter-volunteers" className="text-sm">Volunteers Only</Label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Data Import/Export</CardTitle>
                      <CardDescription>Bulk data operations and file processing</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <Button className="w-full justify-start" variant="outline">
                          <Upload className="h-4 w-4 mr-2" />
                          Import Users (CSV/Excel)
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Export User Data
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <Database className="h-4 w-4 mr-2" />
                          Backup Database
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          Generate Reports
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync External Data
                        </Button>
                      </div>
                      
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2">Recent Operations</h4>
                        <div className="space-y-2 text-sm">
                          {(bulkOperationsData.recentOperations || []).map((operation: any, index: number) => (
                            <div key={index} className="flex justify-between">
                              <span>{operation.name}</span>
                              <span className={`${
                                operation.status === 'completed' ? 'text-green-600' :
                                operation.status === 'in_progress' ? 'text-blue-600' :
                                'text-red-600'
                              }`}>
                                {operation.status}
                              </span>
                            </div>
                          ))}
                          {(!bulkOperationsData.recentOperations || bulkOperationsData.recentOperations.length === 0) && (
                            <div className="text-center py-2 text-gray-500">
                              <p>No recent operations</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Batch Processing Queue */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Batch Processing Queue</span>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                          </Button>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription>Monitor and manage background processing jobs</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Queue Status */}
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{bulkOperationsData.completedJobs || 0}</p>
                            <p className="text-sm text-green-600">Completed</p>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">{bulkOperationsData.runningJobs || 0}</p>
                            <p className="text-sm text-blue-600">Running</p>
                          </div>
                          <div className="text-center p-3 bg-yellow-50 rounded-lg">
                            <p className="text-2xl font-bold text-yellow-600">{bulkOperationsData.pendingJobs || 0}</p>
                            <p className="text-sm text-yellow-600">Pending</p>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded-lg">
                            <p className="text-2xl font-bold text-red-600">{bulkOperationsData.failedJobs || 0}</p>
                            <p className="text-sm text-red-600">Failed</p>
                          </div>
                        </div>

                        {/* Job Queue */}
                        <div className="border rounded-lg">
                          <div className="p-4 border-b bg-gray-50">
                            <h4 className="font-semibold">Active Jobs</h4>
                          </div>
                          <div className="divide-y">
                            {(bulkOperationsData.jobs || [])
                              .filter((job: any) => job && (job.id || job.name)) // Filter out empty/undefined jobs
                              .map((job: any, index: number) => {
                                const uniqueKey = `job-${job.id || job.name || `index-${index}`}`;
                                return (
                                  <div key={uniqueKey} className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <div>
                                        <p className="font-medium">{job.name}</p>
                                        <p className="text-sm text-gray-500">ID: {job.id} • {job.users} users</p>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Badge className={
                                          job.status === 'running' ? 'bg-blue-100 text-blue-800' :
                                          job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                          job.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                        }>
                                          {job.status}
                                        </Badge>
                                        <Button variant="ghost" size="sm">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span>Progress</span>
                                        <span>{job.progress}%</span>
                                      </div>
                                      <Progress value={job.progress} className="h-2" />
                                      <p className="text-xs text-gray-500">Started: {job.started}</p>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Advanced Bulk Tools */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Advanced Bulk Tools</CardTitle>
                      <CardDescription>Specialized tools for complex operations</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">Data Migration</h4>
                          <p className="text-sm text-gray-600 mb-3">Migrate data between systems</p>
                          <Button size="sm" className="w-full">Start Migration</Button>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">Data Validation</h4>
                          <p className="text-sm text-gray-600 mb-3">Validate and clean user data</p>
                          <Button size="sm" className="w-full">Run Validation</Button>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">Duplicate Detection</h4>
                          <p className="text-sm text-gray-600 mb-3">Find and merge duplicate records</p>
                          <Button size="sm" className="w-full">Scan Duplicates</Button>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">Archive Users</h4>
                          <p className="text-sm text-gray-600 mb-3">Archive inactive users</p>
                          <Button size="sm" className="w-full">Archive Users</Button>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">Data Analytics</h4>
                          <p className="text-sm text-gray-600 mb-3">Generate analytics reports</p>
                          <Button size="sm" className="w-full">Generate Report</Button>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">System Cleanup</h4>
                          <p className="text-sm text-gray-600 mb-3">Clean up system data</p>
                          <Button size="sm" className="w-full">Start Cleanup</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent key="audit" value="audit" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {/* Audit Overview */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Audit & Compliance Center</span>
                        <div className="flex space-x-2">
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Compliant
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export Report
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription>Comprehensive audit trail and compliance monitoring</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                          <p className="text-lg font-semibold text-blue-600">{auditData.totalEvents || 0}</p>
                          <p className="text-sm text-blue-600">Total Events</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <p className="text-lg font-semibold text-green-600">{auditData.complianceRate || 0}%</p>
                          <p className="text-sm text-green-600">Compliance Rate</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                          <p className="text-lg font-semibold text-yellow-600">{auditData.securityAlerts || 0}</p>
                          <p className="text-sm text-yellow-600">Security Alerts</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <FileText className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                          <p className="text-lg font-semibold text-purple-600">{auditData.reportsGenerated || 0}</p>
                          <p className="text-sm text-purple-600">Reports Generated</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Security Monitoring */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="grid gap-6 lg:grid-cols-2"
                >
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Security Monitoring</CardTitle>
                      <CardDescription>Real-time security events and threat detection</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Failed Login Attempts</span>
                            <span className="text-sm font-medium text-red-600">{auditData.failedLogins || 0}</span>
                          </div>
                          <Progress value={auditData.failedLogins || 0} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Suspicious Activities</span>
                            <span className="text-sm font-medium text-yellow-600">{auditData.suspiciousActivities || 0}</span>
                          </div>
                          <Progress value={auditData.suspiciousActivities || 0} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Data Access Violations</span>
                            <span className="text-sm font-medium text-orange-600">{auditData.dataAccessViolations || 0}</span>
                          </div>
                          <Progress value={auditData.dataAccessViolations || 0} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">System Integrity</span>
                            <span className="text-sm font-medium text-green-600">{auditData.systemIntegrity || 0}%</span>
                          </div>
                          <Progress value={auditData.systemIntegrity || 0} className="h-2" />
                        </div>
                      </div>
                      
                      {(auditData.securityAlerts || []).map((alert: any, index: number) => (
                        <div key={index} className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium text-red-800">Security Alert</span>
                          </div>
                          <p className="text-sm text-red-700 mt-1">
                            {alert.message}
                          </p>
                        </div>
                      ))}
                      {(!auditData.securityAlerts || auditData.securityAlerts.length === 0) && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">No Security Alerts</span>
                          </div>
                          <p className="text-sm text-green-700 mt-1">
                            All systems are secure and operating normally.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Compliance Status</CardTitle>
                      <CardDescription>Regulatory compliance and audit requirements</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {(auditData.complianceStatus || [])
                          .filter((item: any) => item && (item.name || item.id)) // Filter out empty/undefined items
                          .map((item: any, index: number) => {
                            const uniqueKey = `compliance-${item.name || item.id || `index-${index}`}`;
                            return (
                              <div key={uniqueKey} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <p className="font-medium text-sm">{item.name}</p>
                                  <p className="text-xs text-gray-500">Last check: {item.lastCheck}</p>
                                </div>
                                <div className="text-right">
                                  <Badge className={
                                    item.status === 'compliant' ? 'bg-green-100 text-green-800' :
                                    item.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                  }>
                                    {item.status}
                                  </Badge>
                                  <p className="text-sm font-medium mt-1">{item.score}%</p>
                                </div>
                              </div>
                            );
                          })}
                        {(!auditData.complianceStatus || auditData.complianceStatus.length === 0) && (
                          <div className="text-center py-4 text-gray-500">
                            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No compliance data available</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Detailed Audit Logs */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Detailed Audit Logs</span>
                        <div className="flex space-x-2">
                          <Select defaultValue="all">
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Events</SelectItem>
                              <SelectItem value="security">Security Events</SelectItem>
                              <SelectItem value="data">Data Access</SelectItem>
                              <SelectItem value="admin">Admin Actions</SelectItem>
                              <SelectItem value="system">System Events</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm">
                            <Filter className="h-4 w-4 mr-2" />
                            Filter
                          </Button>
                          <Button variant="outline" size="sm">
                            <Search className="h-4 w-4 mr-2" />
                            Search
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription>Comprehensive audit trail with detailed event information</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {(auditData.auditLogs || [])
                          .filter((log: any) => log && (log.id || log.timestamp || log.action)) // Filter out empty/undefined logs
                          .map((log: any, index: number) => {
                            const uniqueKey = `audit-log-${log.id || log.timestamp || `index-${index}`}`;
                            return (
                              <div key={uniqueKey} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg border">
                                <div className={`w-3 h-3 rounded-full mt-2 ${
                                  log.severity === 'high' ? 'bg-red-500' :
                                  log.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                }`}></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center space-x-2">
                                      <p className="text-sm font-medium text-gray-900">{log.action}</p>
                                      <Badge variant="outline" className={`text-xs ${
                                        log.severity === 'high' ? 'border-red-200 text-red-700' :
                                        log.severity === 'medium' ? 'border-yellow-200 text-yellow-700' : 'border-green-200 text-green-700'
                                      }`}>
                                        {log.severity}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-gray-500">{log.timestamp}</span>
                                  </div>
                                  <p className="text-sm text-gray-600">{log.details}</p>
                                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                                    <span>User: {log.user}</span>
                                    <span>IP: {log.ip}</span>
                                    <span>Session: {log.session}</span>
                                  </div>
                                </div>
                                <div className="flex space-x-1">
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        {(!auditData.auditLogs || auditData.auditLogs.length === 0) && (
                          <div className="text-center py-8 text-gray-500">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No audit logs available</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Forensic Analysis Tools */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Forensic Analysis Tools</CardTitle>
                      <CardDescription>Advanced tools for security investigation and analysis</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">User Activity Timeline</h4>
                          <p className="text-sm text-gray-600 mb-3">Track user actions over time</p>
                          <Button size="sm" className="w-full">Generate Timeline</Button>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">IP Address Analysis</h4>
                          <p className="text-sm text-gray-600 mb-3">Analyze IP-based activities</p>
                          <Button size="sm" className="w-full">Analyze IPs</Button>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">Session Reconstruction</h4>
                          <p className="text-sm text-gray-600 mb-3">Reconstruct user sessions</p>
                          <Button size="sm" className="w-full">Reconstruct</Button>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">Data Flow Analysis</h4>
                          <p className="text-sm text-gray-600 mb-3">Track data movement patterns</p>
                          <Button size="sm" className="w-full">Analyze Flow</Button>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">Anomaly Detection</h4>
                          <p className="text-sm text-gray-600 mb-3">Detect unusual patterns</p>
                          <Button size="sm" className="w-full">Run Detection</Button>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">Compliance Report</h4>
                          <p className="text-sm text-gray-600 mb-3">Generate compliance reports</p>
                          <Button size="sm" className="w-full">Generate Report</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </motion.div>

      {/* Communication Quick Access */}
      <AdminCommunicationQuickAccess />
    </div>
  );
}
