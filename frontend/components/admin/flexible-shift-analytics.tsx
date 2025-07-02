'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  Calendar,
  Target,
  Award,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';

interface FlexibleShiftAnalytics {
  totalFlexibleShifts: number;
  totalHoursWorked: number;
  averageShiftDuration: number;
  utilizationRate: number;
  volunteerSatisfaction: number;
  trends: {
    period: string;
    flexibleShifts: number;
    fixedShifts: number;
    totalHours: number;
    uniqueVolunteers: number;
  }[];
  timeDistribution: {
    hour: string;
    selections: number;
    percentage: number;
  }[];
  durationPreferences: {
    duration: string;
    count: number;
    percentage: number;
  }[];
  volunteerEngagement: {
    volunteerId: number;
    name: string;
    flexibleHours: number;
    fixedHours: number;
    totalShifts: number;
    averageDuration: number;
    preferredTimeSlots: string[];
  }[];
  capacityUtilization: {
    date: string;
    availableSlots: number;
    bookedSlots: number;
    utilizationPercentage: number;
  }[];
}

export default function FlexibleShiftAnalytics() {
  const [analytics, setAnalytics] = useState<FlexibleShiftAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [selectedMetric, setSelectedMetric] = useState('trends');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Mock analytics data - in real app, this would be an API call
      const mockAnalytics: FlexibleShiftAnalytics = {
        totalFlexibleShifts: 156,
        totalHoursWorked: 624,
        averageShiftDuration: 4.2,
        utilizationRate: 78.5,
        volunteerSatisfaction: 4.6,
        trends: [
          { period: 'Week 1', flexibleShifts: 25, fixedShifts: 18, totalHours: 98, uniqueVolunteers: 12 },
          { period: 'Week 2', flexibleShifts: 32, fixedShifts: 22, totalHours: 126, uniqueVolunteers: 15 },
          { period: 'Week 3', flexibleShifts: 28, fixedShifts: 19, totalHours: 115, uniqueVolunteers: 14 },
          { period: 'Week 4', flexibleShifts: 38, fixedShifts: 24, totalHours: 148, uniqueVolunteers: 18 },
          { period: 'Week 5', flexibleShifts: 33, fixedShifts: 21, totalHours: 137, uniqueVolunteers: 16 }
        ],
        timeDistribution: [
          { hour: '09:00', selections: 45, percentage: 28.8 },
          { hour: '10:00', selections: 52, percentage: 33.3 },
          { hour: '11:00', selections: 38, percentage: 24.4 },
          { hour: '13:00', selections: 41, percentage: 26.3 },
          { hour: '14:00', selections: 48, percentage: 30.8 },
          { hour: '15:00', selections: 35, percentage: 22.4 },
          { hour: '16:00', selections: 29, percentage: 18.6 }
        ],
        durationPreferences: [
          { duration: '2 hours', count: 64, percentage: 41.0 },
          { duration: '3 hours', count: 42, percentage: 26.9 },
          { duration: '4 hours', count: 31, percentage: 19.9 },
          { duration: '5+ hours', count: 19, percentage: 12.2 }
        ],
        volunteerEngagement: [
          {
            volunteerId: 1,
            name: 'Sarah Johnson',
            flexibleHours: 24,
            fixedHours: 16,
            totalShifts: 12,
            averageDuration: 3.3,
            preferredTimeSlots: ['10:00-13:00', '14:00-17:00']
          },
          {
            volunteerId: 2,
            name: 'Michael Chen',
            flexibleHours: 32,
            fixedHours: 8,
            totalShifts: 10,
            averageDuration: 4.0,
            preferredTimeSlots: ['09:00-13:00']
          },
          {
            volunteerId: 3,
            name: 'Emma Davis',
            flexibleHours: 18,
            fixedHours: 22,
            totalShifts: 15,
            averageDuration: 2.7,
            preferredTimeSlots: ['15:00-17:00', '16:00-18:00']
          }
        ],
        capacityUtilization: [
          { date: '2024-01-15', availableSlots: 48, bookedSlots: 36, utilizationPercentage: 75 },
          { date: '2024-01-16', availableSlots: 52, bookedSlots: 41, utilizationPercentage: 79 },
          { date: '2024-01-17', availableSlots: 45, bookedSlots: 38, utilizationPercentage: 84 },
          { date: '2024-01-18', availableSlots: 50, bookedSlots: 39, utilizationPercentage: 78 },
          { date: '2024-01-19', availableSlots: 48, bookedSlots: 42, utilizationPercentage: 88 }
        ]
      };
      
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    // Mock export functionality
    const csvData = analytics?.trends.map(t => 
      `${t.period},${t.flexibleShifts},${t.fixedShifts},${t.totalHours},${t.uniqueVolunteers}`
    ).join('\n');
    
    const header = 'Period,Flexible Shifts,Fixed Shifts,Total Hours,Unique Volunteers\n';
    const csv = header + csvData;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flexible-shift-analytics.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Flexible Shift Analytics</h1>
          <p className="text-muted-foreground">
            Insights and trends for flexible volunteer scheduling
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flexible Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalFlexibleShifts}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +12% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalHoursWorked}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +8% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageShiftDuration}h</div>
            <p className="text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 inline mr-1" />
              -0.2h from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.utilizationRate}%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +5% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.volunteerSatisfaction}/5</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +0.1 from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="flexibleShifts" 
                  stackId="1"
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  name="Flexible Shifts" 
                />
                <Area 
                  type="monotone" 
                  dataKey="fixedShifts" 
                  stackId="1"
                  stroke="#82ca9d" 
                  fill="#82ca9d" 
                  name="Fixed Shifts" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Time Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Time Slots</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.timeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="selections" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Duration Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Duration Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.durationPreferences}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.durationPreferences.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Capacity Utilization */}
        <Card>
          <CardHeader>
            <CardTitle>Capacity Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.capacityUtilization}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="utilizationPercentage" 
                  stroke="#8884d8" 
                  strokeWidth={3}
                  name="Utilization %" 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Volunteer Engagement Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Flexible Shift Volunteers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Volunteer</th>
                  <th className="text-left p-2">Flexible Hours</th>
                  <th className="text-left p-2">Fixed Hours</th>
                  <th className="text-left p-2">Total Shifts</th>
                  <th className="text-left p-2">Avg Duration</th>
                  <th className="text-left p-2">Preferred Times</th>
                </tr>
              </thead>
              <tbody>
                {analytics.volunteerEngagement.map(volunteer => (
                  <tr key={volunteer.volunteerId} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{volunteer.name}</td>
                    <td className="p-2">
                      <Badge variant="secondary">{volunteer.flexibleHours}h</Badge>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">{volunteer.fixedHours}h</Badge>
                    </td>
                    <td className="p-2">{volunteer.totalShifts}</td>
                    <td className="p-2">{volunteer.averageDuration}h</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {volunteer.preferredTimeSlots.map(slot => (
                          <Badge key={slot} variant="outline" className="text-xs">
                            {slot}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Peak Hours</h4>
              <p className="text-blue-800 text-sm">
                Most volunteers prefer 10:00-11:00 AM slots. Consider creating more flexible shifts during this time.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Duration Sweet Spot</h4>
              <p className="text-green-800 text-sm">
                2-hour shifts are most popular (41% of selections). This appears to be the optimal balance.
              </p>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">Utilization Opportunity</h4>
              <p className="text-yellow-800 text-sm">
                78.5% utilization rate suggests room for growth. Consider targeted outreach during low-demand periods.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">Volunteer Satisfaction</h4>
              <p className="text-purple-800 text-sm">
                4.6/5 satisfaction rating indicates strong volunteer approval of flexible scheduling options.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
