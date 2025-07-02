'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Users, 
  Calendar, 
  Clock,
  Heart,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  Download,
  Eye,
  MoreHorizontal,
  Plus,
  Bell,
  Star,
  Target,
  Zap,
  BarChart3,
  PieChart,
  LineChart,
  MapPin,
  Gift,
  UserCheck,
  FileText,
  Settings,
  ChevronRight,
  Sparkles,
  Award,
  Shield,
  AlertCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { EnhancedCard } from '@/lib/design-system/components';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

// Dashboard metric interface
interface DashboardMetric {
  id: string;
  title: string;
  value: string | number;
  previousValue?: string | number;
  change?: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description?: string;
  target?: number;
  unit?: string;
  priority: 'high' | 'medium' | 'low';
}

// Activity item interface
interface ActivityItem {
  id: string;
  type: 'request' | 'donation' | 'volunteer' | 'system' | 'emergency';
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
  status: 'pending' | 'completed' | 'failed' | 'in-progress';
  priority: 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
}

// Chart data interface
interface ChartData {
  period: string;
  value: number;
  label?: string;
  color?: string;
}

// Enhanced Metric Card Component
interface MetricCardProps {
  metric: DashboardMetric;
  onClick?: () => void;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric, onClick, className }) => {
  const Icon = metric.icon;
  const isClickable = !!onClick;

  const getChangeColor = () => {
    if (metric.changeType === 'increase') return 'text-green-600';
    if (metric.changeType === 'decrease') return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = () => {
    if (metric.trend === 'up') return <ArrowUpRight className="h-3 w-3" />;
    if (metric.trend === 'down') return <ArrowDownRight className="h-3 w-3" />;
    return null;
  };

  const getPriorityIndicator = () => {
    switch (metric.priority) {
      case 'high':
        return <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />;
      case 'medium':
        return <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-500 rounded-full" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      whileHover={isClickable ? { scale: 1.02 } : {}}
      whileTap={isClickable ? { scale: 0.98 } : {}}
      className={cn(className)}
    >
      <EnhancedCard
        className={cn(
          'relative p-6 transition-all duration-200',
          isClickable && 'cursor-pointer hover:shadow-lg border-l-4',
          metric.priority === 'high' && 'border-l-red-500',
          metric.priority === 'medium' && 'border-l-yellow-500',
          metric.priority === 'low' && 'border-l-green-500'
        )}
        onClick={onClick}
      >
        {getPriorityIndicator()}
        
        <div className="flex items-start justify-between mb-4">
          <div className={cn('p-2 rounded-lg', metric.color)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
          
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {metric.value}
              {metric.unit && <span className="text-sm text-gray-500 ml-1">{metric.unit}</span>}
            </span>
            
            {metric.change !== undefined && (
              <div className={cn('flex items-center gap-1 text-sm', getChangeColor())}>
                {getChangeIcon()}
                <span>{Math.abs(metric.change)}%</span>
              </div>
            )}
          </div>

          {metric.description && (
            <p className="text-xs text-gray-500">{metric.description}</p>
          )}

          {metric.target && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress to target</span>
                <span>{Math.round((Number(metric.value) / metric.target) * 100)}%</span>
              </div>
              <Progress 
                value={(Number(metric.value) / metric.target) * 100} 
                className="h-2"
              />
            </div>
          )}
        </div>
      </EnhancedCard>
    </motion.div>
  );
};

// Activity Feed Component
interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
  showFilter?: boolean;
  className?: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  activities, 
  maxItems = 10, 
  showFilter = true,
  className 
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredActivities = useMemo(() => {
    let filtered = activities;
    
    if (filter !== 'all') {
      filtered = activities.filter(activity => activity.type === filter);
    }
    
    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems);
  }, [activities, filter, maxItems]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'request': return <HelpCircle className="h-4 w-4" />;
      case 'donation': return <Heart className="h-4 w-4" />;
      case 'volunteer': return <UserCheck className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      case 'emergency': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <EnhancedCard className={cn('p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {showFilter && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  {filter === 'all' ? 'All' : filter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  All Activities
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('request')}>
                  Help Requests
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('donation')}>
                  Donations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('volunteer')}>
                  Volunteer Actions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('system')}>
                  System Events
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {filteredActivities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'flex items-start gap-4 p-4 rounded-lg border-l-4 bg-gray-50 hover:bg-gray-100 transition-colors',
                getPriorityColor(activity.priority)
              )}
            >
              <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {activity.description}
                    </p>
                  </div>
                  
                  <Badge className={cn('text-xs', getStatusColor(activity.status))}>
                    {activity.status.replace('-', ' ')}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    {activity.user && (
                      <>
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={activity.user.avatar} />
                          <AvatarFallback className="text-xs">
                            {activity.user.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>{activity.user.name}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{activity.timestamp.toLocaleTimeString()}</span>
                  </div>
                  
                  <Button variant="ghost" size="sm" className="h-6 px-2">
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredActivities.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity found</p>
          </div>
        )}
      </div>
      
      {activities.length > maxItems && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <Button variant="outline" className="w-full">
            View All Activity
            <ArrowUpRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </EnhancedCard>
  );
};

// Quick Actions Component
interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  priority: 'high' | 'medium' | 'low';
  roles: string[];
  isNew?: boolean;
  shortcut?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  userRole: string;
  className?: string;
}

const QuickActions: React.FC<QuickActionsProps> = ({ actions, userRole, className }) => {
  const filteredActions = actions
    .filter(action => action.roles.includes(userRole))
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  return (
    <EnhancedCard className={cn('p-6', className)}>
      <div className="flex items-center gap-2 mb-6">
        <Zap className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredActions.map(action => {
          const Icon = action.icon;
          
          return (
            <motion.div
              key={action.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="outline"
                className={cn(
                  'h-auto p-4 flex-col items-start text-left space-y-2 w-full',
                  'hover:shadow-md transition-all duration-200'
                )}
                asChild
              >
                <a href={action.href}>
                  <div className="flex items-center justify-between w-full">
                    <div className={cn('p-2 rounded-lg', action.color)}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    {action.isNew && (
                      <Badge className="text-xs bg-green-500 text-white">
                        New
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1 w-full">
                    <h4 className="font-medium text-sm text-gray-900">
                      {action.title}
                    </h4>
                    <p className="text-xs text-gray-600">
                      {action.description}
                    </p>
                    {action.shortcut && (
                      <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        {action.shortcut}
                      </kbd>
                    )}
                  </div>
                </a>
              </Button>
            </motion.div>
          );
        })}
      </div>
    </EnhancedCard>
  );
};

// Main Enhanced Dashboard Component
interface EnhancedDashboardProps {
  userRole: string;
  metrics: DashboardMetric[];
  activities: ActivityItem[];
  quickActions: QuickAction[];
  className?: string;
}

export const EnhancedDashboard: React.FC<EnhancedDashboardProps> = ({
  userRole,
  metrics,
  activities,
  quickActions,
  className
}) => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshDashboard = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const name = user?.first_name || 'there';
    
    return `${greeting}, ${name}!`;
  };

  const getRoleSpecificMessage = () => {
    switch (userRole) {
      case 'Admin':
        return 'Here\'s your system overview and key metrics.';
      case 'Volunteer':
        return 'Ready to make a difference today?';
      case 'Donor':
        return 'Thank you for your continued support.';
      case 'Visitor':
        return 'We\'re here to help you with whatever you need.';
      default:
        return 'Welcome to your dashboard.';
    }
  };

  // Group metrics by priority
  const highPriorityMetrics = metrics.filter(m => m.priority === 'high');
  const mediumPriorityMetrics = metrics.filter(m => m.priority === 'medium');
  const lowPriorityMetrics = metrics.filter(m => m.priority === 'low');

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getWelcomeMessage()}
          </h1>
          <p className="text-gray-600 mt-1">
            {getRoleSpecificMessage()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefreshDashboard}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Action
          </Button>
        </div>
      </div>

      {/* System Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-50 border border-green-200 rounded-lg p-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <Shield className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              All systems operational
            </p>
            <p className="text-xs text-green-600">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
          <Badge className="bg-green-100 text-green-800">
            Online
          </Badge>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* High Priority Metrics */}
          {highPriorityMetrics.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h2 className="text-lg font-semibold text-gray-900">Critical Metrics</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {highPriorityMetrics.map(metric => (
                  <MetricCard key={metric.id} metric={metric} />
                ))}
              </div>
            </div>
          )}

          {/* Medium Priority Metrics */}
          {mediumPriorityMetrics.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900">Key Metrics</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {mediumPriorityMetrics.map(metric => (
                  <MetricCard key={metric.id} metric={metric} />
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <QuickActions 
            actions={quickActions} 
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* All Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map(metric => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <ActivityFeed activities={activities} maxItems={20} />
        </TabsContent>
      </Tabs>

      {/* Recent Activity (Overview Tab) */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActivityFeed activities={activities} maxItems={8} />
          </div>
          
          {/* Additional Stats */}
          <div className="space-y-6">
            {lowPriorityMetrics.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Additional Stats</h3>
                <div className="space-y-4">
                  {lowPriorityMetrics.slice(0, 4).map(metric => (
                    <MetricCard key={metric.id} metric={metric} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDashboard; 