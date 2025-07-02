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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Users,
  Star,
  Award,
  Target,
  Calendar,
  AlertCircle,
  Trophy,
  ThumbsUp,
  Activity,
  Zap,
  RefreshCw,
  Download,
  Settings,
  Plus,
  Medal,
  Crown,
  Flame,
  Heart,
  Brain,
  Shield,
  Globe,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  TrendingDown,
  Equal,
  Edit,
  Save,
  X
} from 'lucide-react';
import {
  fetchPerformanceMetrics,
  fetchVolunteerRanking,
  fetchTeamStats
} from '@/lib/api/volunteer';
import {
  PerformanceMetrics,
  VolunteerRanking,
  TeamStats
} from '@/lib/types/volunteer';
import { formatDate } from '@/lib/utils/date-utils';
import LoadingSpinner from '@/components/common/loading-spinner';
import PerformanceDashboard from '@/components/volunteer/performance-dashboard';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export default function PerformancePageEnhanced() {
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics | null>(null);
  const [ranking, setRanking] = useState<VolunteerRanking | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedMetric, setSelectedMetric] = useState<'hours' | 'shifts' | 'rating' | 'impact'>('hours');
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [goals, setGoals] = useState({
    monthlyHours: 30,
    monthlyShifts: 8,
    targetRating: 4.5,
    skillGrowth: 5
  });
  const [isEditingGoals, setIsEditingGoals] = useState(false);

  useEffect(() => {
    const loadPerformanceData = async () => {
      setLoading(true);
      try {
        const [metricsData, rankingData, teamData] = await Promise.all([
          fetchPerformanceMetrics(),
          fetchVolunteerRanking(),
          fetchTeamStats()
        ]);

        setPerformanceData(metricsData as PerformanceMetrics);
        setRanking(rankingData as VolunteerRanking);
        setTeamStats(teamData as TeamStats);
      } catch (err: any) {
        console.error('Error loading performance data:', err);
        setError(err.message || 'Failed to load performance data');
        
        // Set empty states instead of mock data
        setPerformanceData(null);
        setRanking(null);
        setTeamStats(null);
      } finally {
        setLoading(false);
      }
    };

    loadPerformanceData();
  }, []);

  const refreshData = async () => {
    setRefreshing(true);
    try {
      // Reload data by creating a new loadPerformanceData function call
      const loadData = async () => {
        const [metricsData, rankingData, teamData] = await Promise.all([
          fetchPerformanceMetrics(),
          fetchVolunteerRanking(),
          fetchTeamStats()
        ]);

        setPerformanceData(metricsData as PerformanceMetrics);
        setRanking(rankingData as VolunteerRanking);
        setTeamStats(teamData as TeamStats);
      };
      
      await loadData();
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate progress towards goals
  const goalProgress = useMemo(() => {
    if (!performanceData || !performanceData.monthlyHours || !Array.isArray(performanceData.monthlyHours) || performanceData.monthlyHours.length === 0) {
      return {
        monthlyHours: 0,
        monthlyShifts: 0,
        targetRating: 0,
        skillGrowth: 0
      };
    }
    
    const currentMonth = performanceData.monthlyHours[performanceData.monthlyHours.length - 1];
    
    return {
      monthlyHours: (currentMonth?.hours || 0) / goals.monthlyHours * 100,
      monthlyShifts: (currentMonth?.shifts || 0) / goals.monthlyShifts * 100,
      targetRating: (performanceData.averageRating || 0) / goals.targetRating * 100,
      skillGrowth: Math.min(100, (performanceData.skillsAssessment?.reduce((sum, skill) => sum + (skill.growth || 0), 0) || 0) / goals.skillGrowth)
    };
  }, [performanceData, goals]);

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100', icon: Crown };
    if (score >= 80) return { level: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Trophy };
    if (score >= 70) return { level: 'Average', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Star };
    return { level: 'Needs Improvement', color: 'text-red-600', bgColor: 'bg-red-100', icon: Target };
  };

  const getRankingColor = (rank: number, total: number) => {
    const percentile = ((total - rank + 1) / total) * 100;
    if (percentile >= 90) return 'text-green-600';
    if (percentile >= 70) return 'text-blue-600';
    if (percentile >= 50) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'star': return <Star className="h-5 w-5" />;
      case 'shield': return <Shield className="h-5 w-5" />;
      case 'heart': return <Heart className="h-5 w-5" />;
      case 'clock': return <Clock className="h-5 w-5" />;
      case 'trophy': return <Trophy className="h-5 w-5" />;
      default: return <Award className="h-5 w-5" />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50';
      case 'rare': return 'border-blue-300 bg-blue-50';
      case 'epic': return 'border-purple-300 bg-purple-50';
      case 'legendary': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const handleSaveGoals = () => {
    // In a real app, this would save to the backend
    setIsEditingGoals(false);
    setShowGoalDialog(false);
  };

  if (loading) {
    return <LoadingSpinner message="Loading performance analytics..." />;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Performance Analytics</h1>
          <p className="text-muted-foreground">
            Track your volunteer impact, progress, and achievements
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGoalDialog(true)}
          >
            <Target className="h-4 w-4 mr-2" />
            Set Goals
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Enhanced Key Metrics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500 rounded-full">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Hours</p>
                <p className="text-3xl font-bold text-blue-700">{performanceData?.totalHours || 0}</p>
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <ArrowUp className="h-3 w-3" />
                  +12% this month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500 rounded-full">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">People Helped</p>
                <p className="text-3xl font-bold text-green-700">{performanceData?.volunteersHelped || 0}</p>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <ArrowUp className="h-3 w-3" />
                  +8% this month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500 rounded-full">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Average Rating</p>
                <p className="text-3xl font-bold text-purple-700">{performanceData?.averageRating || 0}</p>
                <div className="flex items-center gap-1 text-xs text-purple-600">
                  <ArrowUp className="h-3 w-3" />
                  +0.2 this month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500 rounded-full">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Impact Score</p>
                <p className="text-3xl font-bold text-orange-700">{performanceData?.impactScore || 0}</p>
                <div className="flex items-center gap-1 text-xs text-orange-600">
                  <ArrowUp className="h-3 w-3" />
                  +25 this week
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goal Progress Section */}
      {Object.values(goalProgress).some(p => p > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Goal Progress
            </CardTitle>
            <CardDescription>
              Track your progress towards your volunteer goals this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Monthly Hours</span>
                  <span>{Math.min(100, goalProgress.monthlyHours).toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(100, goalProgress.monthlyHours)} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Monthly Shifts</span>
                  <span>{Math.min(100, goalProgress.monthlyShifts).toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(100, goalProgress.monthlyShifts)} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Target Rating</span>
                  <span>{Math.min(100, goalProgress.targetRating).toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(100, goalProgress.targetRating)} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Skill Growth</span>
                  <span>{Math.min(100, goalProgress.skillGrowth).toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(100, goalProgress.skillGrowth)} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Skills
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Performance Scores */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Scores</CardTitle>
                <CardDescription>
                  Your current performance across key areas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Punctuality', score: performanceData?.punctualityScore || 0 },
                  { label: 'Reliability', score: performanceData?.reliabilityScore || 0 },
                  { label: 'Leadership', score: performanceData?.leadershipScore || 0 },
                ].map(item => {
                  const level = getPerformanceLevel(item.score);
                  const IconComponent = level.icon;
                  
                  return (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <IconComponent className={`h-4 w-4 ${level.color}`} />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={level.color}>
                            {level.level}
                          </Badge>
                          <span className="font-bold">{item.score}%</span>
                        </div>
                      </div>
                      <Progress value={item.score} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Recent Feedback */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Feedback</CardTitle>
                <CardDescription>
                  What coordinators are saying about your work
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {performanceData?.feedback?.recentComments?.slice(0, 3).map((comment, index) => (
                  <div key={index} className="border-l-4 border-l-blue-500 pl-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: comment.rating }, (_, i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.date)}
                      </span>
                    </div>
                    <p className="text-sm">{comment.comment}</p>
                    <p className="text-xs text-muted-foreground">
                      — {comment.coordinator}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Activity</CardTitle>
              <CardDescription>
                Your volunteer hours and shifts over the past 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData?.monthlyHours || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3}
                    name="Hours"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="shifts" 
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                    fillOpacity={0.3}
                    name="Shifts"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Time Period Selector */}
          <div className="flex items-center gap-4">
            <Label>Time Period:</Label>
            <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Weekly Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Performance Trends</CardTitle>
                <CardDescription>
                  Your efficiency and satisfaction ratings by week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={performanceData?.weeklyTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="efficiency" 
                      stroke="#8884d8" 
                      name="Efficiency %"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="satisfaction" 
                      stroke="#82ca9d" 
                      name="Satisfaction"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Feedback Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Feedback Distribution</CardTitle>
                <CardDescription>
                  Breakdown of feedback received
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Positive', value: performanceData?.feedback?.positive || 0, color: '#00C49F' },
                        { name: 'Neutral', value: performanceData?.feedback?.neutral || 0, color: '#FFBB28' },
                        { name: 'Negative', value: performanceData?.feedback?.negative || 0, color: '#FF8042' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Positive', value: performanceData?.feedback?.positive || 0, color: '#00C49F' },
                        { name: 'Neutral', value: performanceData?.feedback?.neutral || 0, color: '#FFBB28' },
                        { name: 'Negative', value: performanceData?.feedback?.negative || 0, color: '#FF8042' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Skills Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Skills Assessment</CardTitle>
                <CardDescription>
                  Your current skill levels across key areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={performanceData?.skillsAssessment || []}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Current Level"
                      dataKey="level"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name="Target"
                      dataKey="target"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.1}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Skills Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Skill Development</CardTitle>
                <CardDescription>
                  Track your progress towards skill targets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(performanceData?.skillsAssessment || []).map(skill => (
                  <div key={skill.skill} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{skill.skill}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-600">
                          +{skill.growth || 0}% growth
                        </Badge>
                        <span className="font-bold">{skill.level || 0}%</span>
                      </div>
                    </div>
                    <div className="relative">
                      <Progress value={skill.level || 0} className="h-2" />
                      <div 
                        className="absolute top-0 w-0.5 h-2 bg-green-500"
                        style={{ left: `${skill.target || 0}%` }}
                        title={`Target: ${skill.target || 0}%`}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ranking" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Overall Ranking */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Ranking</CardTitle>
                <CardDescription>
                  Your position among all volunteers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className={`text-6xl font-bold ${getRankingColor(ranking?.rank || 0, ranking?.totalVolunteers || 1)}`}>
                    #{ranking?.rank || 0}
                  </div>
                  <p className="text-muted-foreground">
                    out of {ranking?.totalVolunteers || 0} volunteers
                  </p>
                  <Badge variant="outline" className="mt-2">
                    {ranking?.percentile || 0}th percentile
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">Category Rankings:</h4>
                  {ranking?.categoryRankings?.map(cat => (
                    <div key={cat.category} className="flex justify-between items-center">
                      <span className="text-sm">{cat.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{cat.rank}</span>
                        <span className="text-xs text-muted-foreground">({cat.score})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle>Top Volunteers</CardTitle>
                <CardDescription>
                  Current leaderboard for {selectedMetric}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ranking?.topVolunteers?.map(volunteer => (
                  <div key={volunteer.rank} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        volunteer.rank <= 3 ? 'bg-yellow-500 text-white' : 'bg-gray-200'
                      }`}>
                        {volunteer.rank <= 3 ? '🏆' : volunteer.rank}
                      </div>
                      <span className="font-medium">{volunteer.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{volunteer.score}</span>
                      {volunteer.trend === 'up' && <ArrowUp className="h-3 w-3 text-green-500" />}
                      {volunteer.trend === 'down' && <ArrowDown className="h-3 w-3 text-red-500" />}
                      {volunteer.trend === 'stable' && <Equal className="h-3 w-3 text-gray-500" />}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          {/* Milestones Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
              <CardDescription>
                Track your progress towards volunteer milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                {performanceData?.milestones?.map((milestone, index) => (
                  <div key={index} className="text-center space-y-2">
                    <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                      milestone.achieved ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {milestone.achieved ? <Trophy className="h-8 w-8" /> : <Target className="h-8 w-8" />}
                    </div>
                    <p className="font-medium text-sm">{milestone.title}</p>
                    <Progress value={milestone.progress} className="h-1" />
                    <p className="text-xs text-muted-foreground">{milestone.progress}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Achievements Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {performanceData?.achievements?.map(achievement => (
              <Card key={achievement.id} className={`overflow-hidden ${getRarityColor(achievement.rarity || 'common')}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-full shadow-sm">
                      {getAchievementIcon(achievement.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold truncate">{achievement.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {achievement.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Earned {formatDate(achievement.earnedAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Goal Setting Dialog */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Your Goals</DialogTitle>
            <DialogDescription>
              Set monthly targets to track your volunteer progress
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Monthly Hours Target</Label>
              <Input
                type="number"
                value={goals.monthlyHours}
                onChange={(e) => setGoals(prev => ({ ...prev, monthlyHours: parseInt(e.target.value) || 0 }))}
                disabled={!isEditingGoals}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Monthly Shifts Target</Label>
              <Input
                type="number"
                value={goals.monthlyShifts}
                onChange={(e) => setGoals(prev => ({ ...prev, monthlyShifts: parseInt(e.target.value) || 0 }))}
                disabled={!isEditingGoals}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Target Rating</Label>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={goals.targetRating}
                onChange={(e) => setGoals(prev => ({ ...prev, targetRating: parseFloat(e.target.value) || 0 }))}
                disabled={!isEditingGoals}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Skill Growth Points</Label>
              <Input
                type="number"
                value={goals.skillGrowth}
                onChange={(e) => setGoals(prev => ({ ...prev, skillGrowth: parseInt(e.target.value) || 0 }))}
                disabled={!isEditingGoals}
              />
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            {isEditingGoals ? (
              <>
                <Button onClick={handleSaveGoals} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Goals
                </Button>
                <Button variant="outline" onClick={() => setIsEditingGoals(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditingGoals(true)} className="flex-1">
                <Edit className="h-4 w-4 mr-2" />
                Edit Goals
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
