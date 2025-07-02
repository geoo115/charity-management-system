'use client';

import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalStorage, useDebounce, usePerformanceMonitor, useThrottle } from '@/lib/hooks/use-performance';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { LoadingSpinner, SkeletonLoader } from '@/components/common/loading-components';
import { 
  Calendar, 
  Clock, 
  Users, 
  CalendarCheck2, 
  ClipboardCheck, 
  Bell,
  UserCheck,
  Award,
  TrendingUp,
  Settings,
  Star,
  Zap,
  Target,
  CheckSquare,
  AlertTriangle,
  Activity,
  MapPin,
  Phone,
  Mail,
  Heart,
  Sparkles,
  ArrowUp,
  ArrowDown,
  BarChart3,
  RefreshCw,
  Filter,
  Search,
  Calendar as CalendarIcon,
  ChevronRight,
  Timer,
  Trophy,
  Flame,
  CheckCircle,
  Plus,
  ExternalLink,
  Shield,
  Crown,
  GraduationCap,
  UserCog
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { useDashboardData } from '@/lib/state/dashboard-data-manager';
import { VolunteerRoleInfo } from '@/lib/types/volunteer';
import { useAuth } from '@/lib/auth/auth-context';

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

// Enhanced gradient backgrounds with modern glass morphism
const gradientClasses = {
  primary: "bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600",
  secondary: "bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600",
  warm: "bg-gradient-to-br from-orange-400 via-pink-500 to-red-500",
  cool: "bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600",
  success: "bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600",
  warning: "bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500",
  info: "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600",
  neutral: "bg-gradient-to-br from-slate-400 via-gray-500 to-zinc-600",
  purple: "bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600"
};

// Helper functions for volunteer roles
const getRoleIcon = (roleLevel: string) => {
  switch (roleLevel) {
    case 'lead':
      return Crown;
    case 'specialized':
      return GraduationCap;
    case 'general':
    default:
      return UserCog;
  }
};

const getRoleColor = (roleLevel: string) => {
  switch (roleLevel) {
    case 'lead':
      return 'warm'; // Golden/orange gradient
    case 'specialized':
      return 'purple'; // Purple gradient
    case 'general':
    default:
      return 'primary'; // Green gradient
  }
};

const getRoleTitle = (roleLevel: string) => {
  switch (roleLevel) {
    case 'lead':
      return 'Lead Volunteer';
    case 'specialized':
      return 'Specialized Volunteer';
    case 'general':
    default:
      return 'General Volunteer';
  }
};

// Role Badge Component
interface RoleBadgeProps {
  roleInfo: VolunteerRoleInfo;
  showDetails?: boolean;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ roleInfo, showDetails = false }) => {
  const RoleIcon = getRoleIcon(roleInfo.role_level);
  const roleColor = getRoleColor(roleInfo.role_level);
  const roleTitle = getRoleTitle(roleInfo.role_level);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${gradientClasses[roleColor]} text-white shadow-lg`}
    >
      <RoleIcon className="h-5 w-5" />
      <span className="font-semibold">{roleTitle}</span>
      {showDetails && roleInfo.specializations.length > 0 && (
        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
          {roleInfo.specializations.length} specialization{roleInfo.specializations.length !== 1 ? 's' : ''}
        </Badge>
      )}
    </motion.div>
  );
};

interface EnhancedStatsCardProps {
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
}

const EnhancedStatsCard: React.FC<EnhancedStatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  gradient,
  onClick
}) => {
  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl cursor-pointer group
        ${onClick ? 'hover:shadow-2xl' : ''}
        transition-all duration-300
      `}
    >
      <div className={`${gradientClasses[gradient]} p-1 rounded-2xl`}>
        <Card className="bg-white/95 backdrop-blur-sm border-0 h-full">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">{title}</p>
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

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  gradient: keyof typeof gradientClasses;
  badge?: string;
  isNew?: boolean;
}

const QuickActionCard: React.FC<QuickActionProps> = ({
  title,
  description,
  icon: Icon,
  href,
  gradient,
  badge,
  isNew
}) => {
  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
    >
      <Link href={href}>
        <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-xl ${gradientClasses[gradient]}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  {isNew && (
                    <Badge className="bg-green-100 text-green-800 text-xs">New</Badge>
                  )}
                  {badge && (
                    <Badge variant="secondary" className="text-xs">{badge}</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};

const EnhancedVolunteerDashboard: React.FC = memo(() => {
  const { logPerformance } = usePerformanceMonitor('VolunteerDashboard');
  const { user } = useAuth();
  
  // Use centralized dashboard data manager
  const { data, loading, error, refresh } = useDashboardData();
  
  // Optimized state management with persistence
  const [activeTab, setActiveTab] = useLocalStorage('volunteer-dashboard-tab', 'overview');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Extract data from manager
  const roleInfo = data?.roleInfo || null;
  const dashboardStats = data?.dashboardStats || {
    totalHours: 0,
    completedTasks: 0,
    upcomingShifts: 0,
    impactScore: 0
  };

  // Debounced search for performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    logPerformance();
  }, [logPerformance]);

  // Memoized role-specific quick actions for performance
  const quickActions = useMemo(() => {
    const baseActions = [
      {
        title: "View My Schedule",
        description: "Check upcoming shifts and volunteer hours",
        icon: Calendar,
        href: "/volunteer/shifts",
        gradient: "primary" as keyof typeof gradientClasses,
        badge: `${dashboardStats.upcomingShifts} upcoming`
      },
      {
        title: "Browse Available Shifts",
        description: "Find and sign up for volunteer opportunities",
        icon: Search,
        href: "/volunteer/shifts/available",
        gradient: "secondary" as keyof typeof gradientClasses,
        isNew: true
      },
      {
        title: "My Performance",
        description: "View your volunteer metrics and achievements",
        icon: BarChart3,
        href: "/volunteer/performance",
        gradient: "warm" as keyof typeof gradientClasses
      },
      {
        title: "Training Hub",
        description: "Access training modules and certifications",
        icon: GraduationCap,
        href: "/volunteer/training",
        gradient: "cool" as keyof typeof gradientClasses
      }
    ];

    // Add role-specific actions
    if (roleInfo?.role_level === 'lead') {
      baseActions.push({
        title: "Team Management",
        description: "Manage your volunteer teams and assignments",
        icon: Users,
        href: "/volunteer/team",
        gradient: "purple" as keyof typeof gradientClasses,
        isNew: true
      });
    }

    if (roleInfo?.can_train_others) {
      baseActions.push({
        title: "Training Center",
        description: "Train and mentor other volunteers",
        icon: Award,
        href: "/volunteer/training/center",
        gradient: "success" as keyof typeof gradientClasses
      });
    }

    if (roleInfo?.emergency_response) {
      baseActions.push({
        title: "Emergency Response",
        description: "Access emergency response tools",
        icon: Shield,
        href: "/volunteer/emergency",
        gradient: "warning" as keyof typeof gradientClasses
      });
    }

    return baseActions;
  }, [dashboardStats.upcomingShifts, roleInfo]);

  // Memoized refresh handler using data manager
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      toast({
        title: "Dashboard Refreshed",
        description: "Your volunteer dashboard has been updated with the latest data.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh dashboard data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  }, [refresh, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {loading ? (
        // Loading skeleton
        <div className="container mx-auto p-6 space-y-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Header skeleton */}
            <div className="space-y-4">
              <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded-lg w-2/3 animate-pulse"></div>
              <div className="flex space-x-3">
                <div className="h-8 bg-gray-200 rounded-full w-32 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded-full w-24 animate-pulse"></div>
              </div>
            </div>
            
            {/* Stats cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={`skeleton-${i}`} className="h-32 bg-gray-200 rounded-2xl animate-pulse"></div>
              ))}
            </div>
            
            {/* Content skeleton */}
            <div className="space-y-6">
              <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
              <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="container mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col space-y-4"
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between space-y-4 md:space-y-0">
            <div className="space-y-3">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  {`Welcome back, ${user?.first_name || 'Volunteer'}! 👋`}
                </h1>
                <p className="text-gray-600 mt-2">Here's what's happening with your volunteer work today.</p>
              </div>
              
              {/* Role Badge and Info */}
              {roleInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap items-center gap-3"
                >
                  <RoleBadge roleInfo={roleInfo} showDetails />
                  
                  {/* Role capabilities */}
                  <div className="flex flex-wrap gap-2">
                    {roleInfo.can_train_others && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        Trainer
                      </Badge>
                    )}
                    {roleInfo.can_manage_shifts && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        <Calendar className="h-3 w-3 mr-1" />
                        Shift Manager
                      </Badge>
                    )}
                    {roleInfo.emergency_response && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <Shield className="h-3 w-3 mr-1" />
                        Emergency Response
                      </Badge>
                    )}
                  </div>
                </motion.div>
              )}
              
              {/* Specializations */}
              {roleInfo && roleInfo.specializations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <p className="text-sm font-medium text-gray-700">Specializations:</p>
                  <div className="flex flex-wrap gap-2">
                    {roleInfo.specializations.map((spec: string, index: number) => (
                      <Badge key={`specialization-${spec.replace(/\s+/g, '-').toLowerCase()}-${index}`} variant="secondary" className="bg-gray-100 text-gray-700">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white/80 backdrop-blur-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600">
                <Plus className="h-4 w-4 mr-2" />
                Quick Actions
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Stats Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <motion.div variants={itemVariants}>
            <EnhancedStatsCard
              title="Total Hours"
              value={dashboardStats.totalHours}
              subtitle="Volunteer hours"
              icon={Clock}
              gradient="primary"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <EnhancedStatsCard
              title="Completed Tasks"
              value={dashboardStats.completedTasks}
              subtitle="Tasks completed"
              icon={CheckSquare}
              gradient="cool"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <EnhancedStatsCard
              title="Upcoming Shifts"
              value={dashboardStats.upcomingShifts}
              subtitle="Scheduled shifts"
              icon={Calendar}
              gradient="secondary"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <EnhancedStatsCard
              title="Impact Score"
              value={`${dashboardStats.impactScore.toFixed(1)}/5`}
              subtitle="Community impact"
              icon={Target}
              gradient="warm"
            />
          </motion.div>
        </motion.div>

        {/* Enhanced Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-white/60 backdrop-blur-sm rounded-xl p-1">
              <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
              <TabsTrigger value="schedule" className="rounded-lg">Schedule</TabsTrigger>
              <TabsTrigger value="performance" className="rounded-lg">Performance</TabsTrigger>
              <TabsTrigger value="achievements" className="rounded-lg">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <AnimatePresence>
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Quick Actions Grid */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        <span>Quick Actions</span>
                        {roleInfo && (
                          <Badge variant="outline" className="ml-auto">
                            {getRoleTitle(roleInfo.role_level)} Features
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Get started with your volunteer activities
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                      >
                        {quickActions.map((action, index) => (
                          <motion.div key={`quick-action-${action.title.replace(/\s+/g, '-').toLowerCase()}-${index}`} variants={itemVariants}>
                            <QuickActionCard {...action} />
                          </motion.div>
                        ))}
                      </motion.div>
                    </CardContent>
                  </Card>

                  {/* Role Capabilities and Permissions */}
                  {roleInfo && (
                    <Card className="bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Shield className="h-5 w-5 text-blue-500" />
                          <span>Your Role & Capabilities</span>
                        </CardTitle>
                        <CardDescription>
                          What you can do as a {getRoleTitle(roleInfo.role_level).toLowerCase()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Training Capability */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className={`p-4 rounded-lg border-2 ${
                              roleInfo.can_train_others 
                                ? 'border-green-200 bg-green-50' 
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <GraduationCap className={`h-6 w-6 ${
                                roleInfo.can_train_others ? 'text-green-600' : 'text-gray-400'
                              }`} />
                              <div>
                                <h3 className="font-semibold text-gray-900">Training Others</h3>
                                <p className={`text-sm ${
                                  roleInfo.can_train_others ? 'text-green-600' : 'text-gray-500'
                                }`}>
                                  {roleInfo.can_train_others ? 'Authorized' : 'Not Available'}
                                </p>
                              </div>
                            </div>
                          </motion.div>

                          {/* Shift Management */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className={`p-4 rounded-lg border-2 ${
                              roleInfo.can_manage_shifts 
                                ? 'border-purple-200 bg-purple-50' 
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <Calendar className={`h-6 w-6 ${
                                roleInfo.can_manage_shifts ? 'text-purple-600' : 'text-gray-400'
                              }`} />
                              <div>
                                <h3 className="font-semibold text-gray-900">Shift Management</h3>
                                <p className={`text-sm ${
                                  roleInfo.can_manage_shifts ? 'text-purple-600' : 'text-gray-500'
                                }`}>
                                  {roleInfo.can_manage_shifts ? 'Authorized' : 'Not Available'}
                                </p>
                              </div>
                            </div>
                          </motion.div>

                          {/* Emergency Response */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className={`p-4 rounded-lg border-2 ${
                              roleInfo.emergency_response 
                                ? 'border-red-200 bg-red-50' 
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <Shield className={`h-6 w-6 ${
                                roleInfo.emergency_response ? 'text-red-600' : 'text-gray-400'
                              }`} />
                              <div>
                                <h3 className="font-semibold text-gray-900">Emergency Response</h3>
                                <p className={`text-sm ${
                                  roleInfo.emergency_response ? 'text-red-600' : 'text-gray-500'
                                }`}>
                                  {roleInfo.emergency_response ? 'Certified' : 'Not Certified'}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        </div>

                        {/* Team Information for Lead Volunteers */}
                        {roleInfo.role_level === 'lead' && roleInfo.team_members.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200"
                          >
                            <div className="flex items-center space-x-3 mb-3">
                              <Crown className="h-6 w-6 text-orange-600" />
                              <h3 className="font-semibold text-gray-900">Team Leadership</h3>
                            </div>
                            <p className="text-sm text-gray-700">
                              You are currently leading a team of {roleInfo.team_members.length} volunteer{roleInfo.team_members.length !== 1 ? 's' : ''}.
                            </p>
                            <Link href="/volunteer/shifts" className="inline-flex items-center text-sm text-orange-600 hover:text-orange-700 mt-2">
                              Manage your team
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          </motion.div>
                        )}

                        {/* Mentor Information */}
                        {roleInfo.mentor && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
                          >
                            <div className="flex items-center space-x-3 mb-3">
                              <UserCheck className="h-6 w-6 text-blue-600" />
                              <h3 className="font-semibold text-gray-900">Your Mentor</h3>
                            </div>
                            <p className="text-sm text-gray-700">
                              {roleInfo.mentor.first_name} {roleInfo.mentor.last_name} is your assigned mentor.
                            </p>
                            <a 
                              href={`mailto:${roleInfo.mentor.email}`}
                              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mt-2"
                            >
                              Contact mentor
                              <Mail className="h-4 w-4 ml-1" />
                            </a>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Recent Activity */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Activity className="h-5 w-4 text-blue-500" />
                        <span>Recent Activity</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {data?.recentActivity && data.recentActivity.length > 0 ? (
                          data.recentActivity.slice(0, 3).map((item: any, index: number) => (
                            <motion.div
                              key={item.id || index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1, duration: 0.3 }}
                              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50/80 transition-colors"
                            >
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{item.description || item.action}</p>
                                <p className="text-sm text-gray-500">{item.date || item.time}</p>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No recent activity</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <AnimatePresence>
                <motion.div
                  key="schedule"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Upcoming Schedule</CardTitle>
                      <CardDescription>Your volunteer commitments for the next two weeks</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Schedule content will be loaded here...</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <AnimatePresence>
                <motion.div
                  key="performance"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                      <CardDescription>Track your volunteer impact and growth</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12 text-gray-500">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Performance analytics will be displayed here...</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              <AnimatePresence>
                <motion.div
                  key="achievements"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Achievements */}
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Trophy className="h-5 w-4 text-yellow-500" />
                        <span>Achievements</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {data?.achievements && data.achievements.length > 0 ? (
                          data.achievements.slice(0, 3).map((achievement: any, index: number) => (
                            <motion.div
                              key={achievement.id || index}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.1, duration: 0.3 }}
                              className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200"
                            >
                              <Award className="h-5 w-5 text-yellow-600" />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{achievement.name || achievement.title}</p>
                                <p className="text-sm text-gray-600">{achievement.description || achievement.reason}</p>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No achievements yet</p>
                            <p className="text-sm">Complete more shifts to earn achievements!</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </motion.div>
        </div>
      )}
    </div>
  );
});

EnhancedVolunteerDashboard.displayName = 'EnhancedVolunteerDashboard';

export default EnhancedVolunteerDashboard;
