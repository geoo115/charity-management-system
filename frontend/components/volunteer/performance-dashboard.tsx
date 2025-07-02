'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Clock,
  Users,
  Heart,
  Zap,
  Trophy,
  Star,
  Calendar,
  ArrowUp,
  ArrowDown,
  Equal,
  Flame
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar
} from 'recharts';

interface PerformanceMetric {
  label: string;
  value: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  color: string;
  icon: React.ReactNode;
}

interface PerformanceDashboardProps {
  metrics: PerformanceMetric[];
  monthlyData: Array<{
    month: string;
    hours: number;
    shifts: number;
    impact: number;
    rating: number;
  }>;
  skillsRadar: Array<{
    skill: string;
    level: number;
    fullMark: number;
  }>;
  ranking: {
    position: number;
    totalVolunteers: number;
    points: number;
    level: string;
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    progress: number;
    target: number;
    unlocked: boolean;
  }>;
  onSetGoal: (metric: string, target: number) => void;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  metrics,
  monthlyData,
  skillsRadar,
  ranking,
  achievements,
  onSetGoal
}) => {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      default:
        return <Equal className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <div className={`p-2 rounded-full bg-${metric.color}-100`}>
                {metric.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(metric.trend)}`}>
                    {getTrendIcon(metric.trend)}
                    {metric.trendValue}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Target: {metric.target}
                  </span>
                </div>
                <Progress 
                  value={(metric.value / metric.target) * 100} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Performance Trends Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Performance Trends
            </CardTitle>
            <CardDescription>Your volunteer activity over the past 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stackId="1"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="shifts"
                    stackId="2"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="impact"
                    stackId="3"
                    stroke="#F59E0B"
                    fill="#F59E0B"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Volunteer Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Community Ranking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">#{ranking.position}</div>
              <p className="text-muted-foreground">out of {ranking.totalVolunteers}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Level</span>
                <Badge variant="outline" className="bg-primary/10">
                  {ranking.level}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Points</span>
                  <span className="font-medium">{ranking.points}</span>
                </div>
                <Progress value={75} className="h-2" />
                <p className="text-xs text-muted-foreground">250 points to next level</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium">Quick Actions</h4>
              <div className="grid gap-2">
                <Button size="sm" variant="outline" className="justify-start">
                  <Target className="h-4 w-4 mr-2" />
                  Set Monthly Goal
                </Button>
                <Button size="sm" variant="outline" className="justify-start">
                  <Award className="h-4 w-4 mr-2" />
                  View Achievements
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Skills Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-500" />
              Skills Assessment
            </CardTitle>
            <CardDescription>Your volunteer skills development</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={skillsRadar}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} />
                  <Radar
                    name="Skills"
                    dataKey="level"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Achievement Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Achievement Progress
            </CardTitle>
            <CardDescription>Track your volunteer milestones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(achievements || []).slice(0, 4).map((achievement) => (
                <div key={achievement.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        achievement.unlocked ? 'bg-amber-100' : 'bg-gray-100'
                      }`}>
                        {achievement.unlocked ? (
                          <Trophy className="h-4 w-4 text-amber-600" />
                        ) : (
                          <Trophy className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{achievement.title}</h4>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      </div>
                    </div>
                    <Badge variant={achievement.unlocked ? "default" : "secondary"} className="text-xs">
                      {achievement.progress}/{achievement.target}
                    </Badge>
                  </div>
                  <Progress 
                    value={Math.min((achievement.progress / achievement.target) * 100, 100)} 
                    className="h-1"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
