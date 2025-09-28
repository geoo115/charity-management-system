'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import { AdminCommunicationQuickAccess, AdminCommunicationFloatingButton } from '@/components/admin/communication-center';
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
  MoreHorizontal,
  Home,
  Building2,
  Coffee,
  Headphones,
  Briefcase,
  Calendar as CalendarIcon,
  CircleDollarSign
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
  Area,
  ComposedChart
} from 'recharts';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import ComprehensiveMetricsDashboard from '@/components/admin/comprehensive-metrics-dashboard';

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
  primary: "bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800",
  secondary: "bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800",
  success: "bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700",
  warning: "bg-gradient-to-br from-amber-500 via-orange-600 to-red-600",
  danger: "bg-gradient-to-br from-red-600 via-rose-600 to-pink-700",
  info: "bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700",
  neutral: "bg-gradient-to-br from-slate-600 via-gray-600 to-zinc-700",
  premium: "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700"
};

// Professional color palette
const colors = {
  primary: '#2563eb',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#0891b2',
  purple: '#7c3aed',
  indigo: '#4f46e5'
};

interface EnhancedMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    period: string;
    positive: boolean;
  };
  color: keyof typeof colors;
  onClick?: () => void;
  badge?: string;
  description?: string;
}

const EnhancedMetricCard: React.FC<EnhancedMetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color,
  onClick,
  badge,
  description
}) => {
  return (
    <motion.div
      variants={cardHoverVariants}
      initial="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl cursor-pointer group
        ${onClick ? 'hover:shadow-2xl' : ''}
        transition-all duration-300 bg-white border border-gray-200
      `}
    >
      <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</h3>
                {badge && (
                  <Badge variant="outline" className="text-xs font-medium">
                    {badge}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                {subtitle && (
                  <p className="text-sm text-gray-500 font-medium">{subtitle}</p>
                )}
                {description && (
                  <p className="text-xs text-gray-400">{description}</p>
                )}
              </div>
              {trend && (
                <div className="flex items-center space-x-1">
                  {trend.positive ? (
                    <ArrowUp className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-semibold ${
                    trend.positive ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {trend.value > 0 ? '+' : ''}{trend.value}%
                  </span>
                  <span className="text-sm text-gray-500">{trend.period}</span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl shadow-lg`} style={{backgroundColor: colors[color]}}>
              <Icon className="h-7 w-7 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Quick Action Card Component
const QuickActionCard: React.FC<{
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: keyof typeof colors;
  count?: number;
  urgent?: boolean;
}> = ({ title, description, icon: Icon, href, color, count, urgent }) => {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group"
      >
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg shadow-sm`} style={{backgroundColor: colors[color]}}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">
                {title}
              </h3>
              <div className="flex items-center space-x-2">
                {count !== undefined && count > 0 && (
                  <Badge variant={urgent ? "destructive" : "secondary"} className="text-xs">
                    {count}
                  </Badge>
                )}
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
        </div>
      </motion.div>
    </Link>
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

  // Dashboard data state
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalVolunteers: 0,
    activeVolunteers: 0,
    pendingVolunteers: 0,
    totalHelpRequests: 0,
    todayRequests: 0,
    pendingRequests: 0,
    resolvedRequests: 0,
    totalDonations: 0,
    monthlyDonations: 0,
    newSignups: 0,
    systemUptime: '0s',
    averageRating: 0,
    feedbackCount: 0
  });

  const [chartData, setChartData] = useState<any[]>([
    { name: 'Mon', requests: 45, volunteers: 12, donations: 2400 },
    { name: 'Tue', requests: 52, volunteers: 15, donations: 2800 },
    { name: 'Wed', requests: 48, volunteers: 13, donations: 3200 },
    { name: 'Thu', requests: 61, volunteers: 18, donations: 2900 },
    { name: 'Fri', requests: 55, volunteers: 16, donations: 3800 },
    { name: 'Sat', requests: 67, volunteers: 20, donations: 4200 },
    { name: 'Sun', requests: 43, volunteers: 11, donations: 2100 },
  ]);

  const [pieData, setPieData] = useState([
    { name: 'Food Support', value: 35, color: colors.primary },
    { name: 'Financial Aid', value: 25, color: colors.success },
    { name: 'Healthcare', value: 20, color: colors.warning },
    { name: 'Housing', value: 15, color: colors.info },
    { name: 'Other', value: 5, color: colors.purple }
  ]);

  // Helper function for authenticated API calls
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    
    if (!token) {
      console.error('No token found');
      logout();
      return null;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        logout();
        return null;
      }

      return response;
    } catch (error) {
      console.error('API call failed:', error);
      return null;
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/v1/admin/dashboard');
      if (response && response.ok) {
        const data = await response.json();
        setDashboardStats({
          totalUsers: data.kpis?.totalUsers || 0,
          activeUsers: data.kpis?.activeUsers || 0,
          totalVolunteers: data.kpis?.totalVolunteers || 0,
          activeVolunteers: data.kpis?.activeVolunteers || 0,
          pendingVolunteers: data.kpis?.pendingVolunteers || 0,
          totalHelpRequests: data.kpis?.totalHelpRequests || 0,
          todayRequests: data.kpis?.todayRequests || 0,
          pendingRequests: data.kpis?.pendingRequests || 0,
          resolvedRequests: data.kpis?.resolvedRequests || 0,
          totalDonations: data.kpis?.totalDonations || 0,
          monthlyDonations: data.kpis?.monthlyDonations || 0,
          newSignups: data.kpis?.newSignups || 0,
          systemUptime: data.kpis?.systemUptime || '0s',
          averageRating: data.kpis?.averageRating || 0,
          feedbackCount: data.kpis?.feedbackCount || 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    }
  }, [logout, toast]);

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardData()
      ]);
      setLoading(false);
    };

    if (user?.role === 'Admin') {
      initializeDashboard();
    }
  }, [user, fetchDashboardData]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast({
      title: 'Success',
      description: 'Dashboard data refreshed',
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 p-6 max-w-7xl mx-auto"
      >
        {/* Enhanced Header */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 font-medium">
              Comprehensive overview of Charity Management System operations
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>System Online</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Uptime: {dashboardStats.systemUptime}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{dashboardStats.activeUsers} active users</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 mt-6 lg:mt-0">
            <AdminCommunicationQuickAccess />
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-40">
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
            <Button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Key Performance Indicators */}
        <motion.div 
          variants={itemVariants}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          <EnhancedMetricCard
            title="Total Users"
            value={dashboardStats.totalUsers.toLocaleString()}
            subtitle="Registered members"
            description="All system users across roles"
            icon={Users}
            color="primary"
            trend={{ value: 12.5, period: "vs last month", positive: true }}
            onClick={() => router.push('/admin/users')}
          />
          <EnhancedMetricCard
            title="Active Volunteers"
            value={dashboardStats.activeVolunteers}
            subtitle="Currently serving"
            description="Volunteers available for shifts"
            icon={UserCheck}
            color="success"
            trend={{ value: 8.3, period: "vs last week", positive: true }}
            onClick={() => router.push('/admin/volunteers')}
          />
          <EnhancedMetricCard
            title="Help Requests"
            value={dashboardStats.todayRequests}
            subtitle="Today's requests"
            description={`${dashboardStats.pendingRequests} pending approval`}
            icon={MessageSquare}
            color="warning"
            badge={dashboardStats.pendingRequests > 10 ? "High Volume" : undefined}
            onClick={() => router.push('/admin/help-requests')}
          />
          <EnhancedMetricCard
            title="Monthly Donations"
            value={`£${dashboardStats.monthlyDonations.toLocaleString()}`}
            subtitle="This month"
            description="All donation types combined"
            icon={CircleDollarSign}
            color="success"
            trend={{ value: 15.7, period: "vs last month", positive: true }}
            onClick={() => router.push('/admin/donations')}
          />
        </motion.div>

        {/* Secondary Metrics */}
        <motion.div 
          variants={itemVariants}
          className="grid gap-6 md:grid-cols-3 lg:grid-cols-6"
        >
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-800">Resolved Today</p>
                  <p className="text-2xl font-bold text-emerald-900">{dashboardStats.resolvedRequests}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">New Signups</p>
                  <p className="text-2xl font-bold text-blue-900">{dashboardStats.newSignups}</p>
                </div>
                <UserCheck className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Avg Rating</p>
                  <p className="text-2xl font-bold text-purple-900">{dashboardStats.averageRating.toFixed(1)}</p>
                </div>
                <Star className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">Feedback</p>
                  <p className="text-2xl font-bold text-orange-900">{dashboardStats.feedbackCount}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-cyan-800">Active Users</p>
                  <p className="text-2xl font-bold text-cyan-900">{dashboardStats.activeUsers}</p>
                </div>
                <Activity className="h-8 w-8 text-cyan-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-pink-800">Volunteers</p>
                  <p className="text-2xl font-bold text-pink-900">{dashboardStats.totalVolunteers}</p>
                </div>
                <Heart className="h-8 w-8 text-pink-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Area */}
        <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-white shadow-lg border border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                  <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common administrative tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <QuickActionCard
                  title="Review Pending Volunteers"
                  description="Approve new volunteer applications"
                  icon={UserCheck}
                  href="/admin/volunteers"
                  color="primary"
                  count={dashboardStats.pendingVolunteers}
                />
                <QuickActionCard
                  title="Emergency Procedures"
                  description="Access emergency protocols"
                  icon={Siren}
                  href="/admin/emergency"
                  color="danger"
                  urgent={true}
                />
                <QuickActionCard
                  title="Help Request Queue"
                  description="Review pending help requests"
                  icon={MessageSquare}
                  href="/admin/help-requests"
                  color="warning"
                  count={dashboardStats.pendingRequests}
                />
                <QuickActionCard
                  title="System Health Check"
                  description="Monitor system performance"
                  icon={Monitor}
                  href="/admin/system-health"
                  color="info"
                />
                <QuickActionCard
                  title="User Management"
                  description="Manage user accounts and roles"
                  icon={Users}
                  href="/admin/users"
                  color="purple"
                />
                <QuickActionCard
                  title="Analytics Dashboard"
                  description="View detailed reports and metrics"
                  icon={BarChart3}
                  href="/admin/analytics"
                  color="indigo"
                />
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="bg-white shadow-lg border border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                  <Shield className="h-5 w-5 mr-2 text-green-600" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-800">API Services</span>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    Operational
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Database</span>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                    Healthy
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Load Balancer</span>
                  </div>
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                    99.9% Uptime
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Security</span>
                  </div>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Analytics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Activity Chart */}
            <Card className="bg-white shadow-lg border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                  Weekly Activity Overview
                </CardTitle>
                <CardDescription>
                  Requests, volunteers, and donations over the past week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#666"
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#666"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar 
                        dataKey="requests" 
                        fill={colors.primary} 
                        name="Help Requests"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="volunteers" 
                        stroke={colors.success} 
                        strokeWidth={3}
                        name="Active Volunteers"
                        dot={{ fill: colors.success, strokeWidth: 2, r: 4 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="donations" 
                        fill={colors.warning} 
                        fillOpacity={0.1}
                        stroke={colors.warning}
                        name="Donations (£)"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Request Categories */}
            <Card className="bg-white shadow-lg border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                  <PieChart className="h-5 w-5 mr-2 text-purple-600" />
                  Help Request Categories
                </CardTitle>
                <CardDescription>
                  Distribution of help request types this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                          paddingAngle={5}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {pieData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg border border-gray-100">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm font-medium text-gray-700">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900">{item.value}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Recent Activity Feed */}
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Dashboard Overview</TabsTrigger>
              <TabsTrigger value="metrics">Advanced Metrics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6 mt-6">
              <Card className="bg-white shadow-lg border border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                        <Activity className="h-5 w-5 mr-2 text-green-600" />
                        Recent System Activity
                      </CardTitle>
                      <CardDescription>
                        Latest actions and events across the platform
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/admin/activity-logs">
                        View All
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        icon: UserCheck,
                        action: "New volunteer application approved",
                        details: "Sarah Johnson - Community Outreach",
                        time: "2 minutes ago",
                        color: colors.success
                      },
                      {
                        icon: MessageSquare,
                        action: "Help request submitted",
                        details: "Food assistance - Emergency priority",
                        time: "5 minutes ago",
                        color: colors.warning
                      },
                      {
                        icon: CircleDollarSign,
                        action: "Donation received",
                        details: "£250 - Monthly recurring donation",
                        time: "12 minutes ago",
                        color: colors.success
                      },
                      {
                        icon: Users,
                        action: "User verification completed",
                        details: "3 users verified, 2 pending documents",
                        time: "18 minutes ago",
                        color: colors.info
                      },
                      {
                        icon: Calendar,
                        action: "Volunteer shift scheduled",
                        details: "Tomorrow 9:00 AM - Food Distribution",
                        time: "25 minutes ago",
                        color: colors.primary
                      }
                    ].map((activity, index) => (
                      <div key={index} className="flex items-start space-x-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${activity.color}20` }}>
                          <activity.icon className="h-5 w-5" style={{ color: activity.color }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-xs text-gray-600 mt-1">{activity.details}</p>
                        </div>
                        <div className="text-xs text-gray-500">
                          {activity.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="metrics" className="mt-6">
              <ComprehensiveMetricsDashboard />
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
      
      {/* Floating Communication Button */}
      <AdminCommunicationFloatingButton />
    </div>
  );
}