'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Legend
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Heart,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Award,
  DollarSign,
  Calendar,
  MessageSquare,
  UserCheck,
  Building2,
  Package,
  Truck,
  Star,
  Shield
} from 'lucide-react';

// Enhanced sample data for better visualization
const weeklyData = [
  { day: 'Monday', requests: 45, volunteers: 18, donations: 2400, resolved: 38, satisfaction: 4.2 },
  { day: 'Tuesday', requests: 52, volunteers: 22, donations: 2800, resolved: 45, satisfaction: 4.1 },
  { day: 'Wednesday', requests: 48, volunteers: 20, donations: 3200, resolved: 41, satisfaction: 4.3 },
  { day: 'Thursday', requests: 61, volunteers: 25, donations: 2900, resolved: 52, satisfaction: 4.0 },
  { day: 'Friday', requests: 55, volunteers: 23, donations: 3800, resolved: 48, satisfaction: 4.4 },
  { day: 'Saturday', requests: 67, volunteers: 28, donations: 4200, resolved: 58, satisfaction: 4.2 },
  { day: 'Sunday', requests: 43, volunteers: 16, donations: 2100, resolved: 35, satisfaction: 4.3 }
];

const monthlyTrends = [
  { month: 'Jan', users: 1200, volunteers: 180, donations: 25000, requests: 890 },
  { month: 'Feb', users: 1350, volunteers: 195, donations: 28000, requests: 920 },
  { month: 'Mar', users: 1420, volunteers: 210, donations: 32000, requests: 1050 },
  { month: 'Apr', users: 1580, volunteers: 225, donations: 35000, requests: 1180 },
  { month: 'May', users: 1650, volunteers: 240, donations: 38000, requests: 1250 },
  { month: 'Jun', users: 1720, volunteers: 255, donations: 41000, requests: 1320 }
];

const serviceCategories = [
  { name: 'Food Support', value: 35, count: 1847, color: '#3b82f6' },
  { name: 'Financial Aid', value: 25, count: 1319, color: '#10b981' },
  { name: 'Healthcare Support', value: 20, count: 1055, color: '#f59e0b' },
  { name: 'Housing Assistance', value: 15, count: 791, color: '#8b5cf6' },
  { name: 'Other Services', value: 5, count: 264, color: '#ef4444' }
];

const volunteerPerformance = [
  { category: 'Food Distribution', active: 45, capacity: 60, efficiency: 92 },
  { category: 'Reception & Admin', active: 28, capacity: 35, efficiency: 88 },
  { category: 'Healthcare Support', active: 22, capacity: 30, efficiency: 95 },
  { category: 'Community Outreach', active: 18, capacity: 25, efficiency: 85 },
  { category: 'Maintenance', active: 12, capacity: 15, efficiency: 90 }
];

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon: Icon, 
  color,
  description 
}) => {
  const isPositive = change && change > 0;
  
  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          {change !== undefined && (
            <div className={`flex items-center space-x-1 ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-sm font-semibold">
                {isPositive ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            {title}
          </h3>
          <div className="text-2xl font-bold text-gray-900">
            {value}
          </div>
          {changeLabel && (
            <p className="text-sm text-gray-500">
              {changeLabel}
            </p>
          )}
          {description && (
            <p className="text-xs text-gray-400">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function ComprehensiveMetricsDashboard() {
  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Users"
          value="2,847"
          change={12.5}
          changeLabel="vs last month"
          icon={Users}
          color="bg-blue-600"
          description="Total registered and active users"
        />
        <MetricCard
          title="Monthly Donations"
          value="£41,250"
          change={18.2}
          changeLabel="vs last month"
          icon={Heart}
          color="bg-green-600"
          description="All donation types combined"
        />
        <MetricCard
          title="Help Requests"
          value="1,320"
          change={8.7}
          changeLabel="this month"
          icon={MessageSquare}
          color="bg-orange-600"
          description="Total requests processed"
        />
        <MetricCard
          title="Volunteer Hours"
          value="4,928"
          change={15.3}
          changeLabel="vs last month"
          icon={Clock}
          color="bg-purple-600"
          description="Total hours contributed"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Resolution Rate</p>
                <p className="text-xl font-bold text-emerald-900">94.2%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Star className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Satisfaction</p>
                <p className="text-xl font-bold text-blue-900">4.3/5.0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <UserCheck className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-800">Active Volunteers</p>
                <p className="text-xl font-bold text-purple-900">255</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Target className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Daily Goal</p>
                <p className="text-xl font-bold text-yellow-900">87%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-rose-100 border-pink-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-pink-600" />
              <div>
                <p className="text-sm font-medium text-pink-800">System Health</p>
                <p className="text-xl font-bold text-pink-900">99.8%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-teal-100 border-cyan-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-cyan-600" />
              <div>
                <p className="text-sm font-medium text-cyan-800">Security Score</p>
                <p className="text-xl font-bold text-cyan-900">95/100</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Activity Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
              Weekly Activity Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#666"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
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
                  <Legend />
                  <Bar dataKey="requests" fill="#3b82f6" name="Requests" radius={[4, 4, 0, 0]} />
                  <Line 
                    type="monotone" 
                    dataKey="resolved" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="Resolved"
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="volunteers" 
                    fill="#8b5cf6" 
                    fillOpacity={0.3}
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Volunteers"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Service Categories Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-purple-600" />
              Service Categories Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 items-center">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceCategories}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={30}
                      paddingAngle={2}
                    >
                      {serviceCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [
                        `${value}% (${props.payload.count} requests)`,
                        name
                      ]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {serviceCategories.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                        <p className="text-xs text-gray-500">{item.count} requests</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {item.value}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly Growth */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="h-5 w-5 mr-2 text-green-600" />
              Monthly Growth Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorVolunteers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorDonations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#666" fontSize={12} tickLine={false} />
                  <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [
                      typeof value === 'number' && name === 'donations' 
                        ? `£${value.toLocaleString()}` 
                        : value,
                      name
                    ]}
                  />
                  <Area type="monotone" dataKey="users" stackId="1" stroke="#3b82f6" fill="url(#colorUsers)" name="Users" />
                  <Area type="monotone" dataKey="volunteers" stackId="2" stroke="#10b981" fill="url(#colorVolunteers)" name="Volunteers" />
                  <Area type="monotone" dataKey="donations" stackId="3" stroke="#f59e0b" fill="url(#colorDonations)" name="Donations (£)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Volunteer Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2 text-yellow-600" />
              Volunteer Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {volunteerPerformance.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{item.category}</span>
                  <span className="text-gray-500">{item.active}/{item.capacity}</span>
                </div>
                <Progress 
                  value={(item.active / item.capacity) * 100} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Capacity: {Math.round((item.active / item.capacity) * 100)}%</span>
                  <span>Efficiency: {item.efficiency}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}