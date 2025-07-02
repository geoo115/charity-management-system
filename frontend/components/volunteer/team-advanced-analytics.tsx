'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Target, 
  Award,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Brain,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Star,
  Zap,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';

interface TeamAnalytics {
  team_id: number;
  period: string;
  performance_metrics: {
    total_hours: number;
    average_hours_per_member: number;
    completion_rate: number;
    satisfaction_score: number;
    efficiency_score: number;
    collaboration_score: number;
  };
  member_insights: MemberInsight[];
  predictive_analytics: PredictiveInsight[];
  optimization_recommendations: OptimizationRecommendation[];
  trends: TrendData[];
  benchmarks: BenchmarkData;
}

interface MemberInsight {
  member_id: number;
  name: string;
  performance_score: number;
  strengths: string[];
  improvement_areas: string[];
  engagement_level: 'high' | 'medium' | 'low';
  burnout_risk: 'low' | 'medium' | 'high';
  growth_potential: number;
  recommended_actions: string[];
}

interface PredictiveInsight {
  type: 'attrition_risk' | 'performance_prediction' | 'capacity_forecast' | 'success_probability';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  recommendations: string[];
  data_points: {
    label: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

interface OptimizationRecommendation {
  id: string;
  category: 'workload' | 'training' | 'communication' | 'process' | 'recognition';
  title: string;
  description: string;
  impact_score: number;
  effort_level: 'low' | 'medium' | 'high';
  implementation_time: string;
  expected_improvement: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
}

interface TrendData {
  period: string;
  metrics: {
    hours: number;
    satisfaction: number;
    efficiency: number;
    collaboration: number;
  };
}

interface BenchmarkData {
  industry_average: {
    hours_per_member: number;
    satisfaction_score: number;
    efficiency_score: number;
    retention_rate: number;
  };
  top_performers: {
    hours_per_member: number;
    satisfaction_score: number;
    efficiency_score: number;
    retention_rate: number;
  };
  team_performance: {
    hours_per_member: number;
    satisfaction_score: number;
    efficiency_score: number;
    retention_rate: number;
  };
}

interface TeamAdvancedAnalyticsProps {
  teamId: number;
  onRecommendationAction?: (recommendationId: string, action: string) => Promise<void>;
  onExportData?: (format: 'pdf' | 'csv' | 'json') => Promise<void>;
}

export default function TeamAdvancedAnalytics({
  teamId,
  onRecommendationAction,
  onExportData
}: TeamAdvancedAnalyticsProps) {
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [viewMode, setViewMode] = useState<'overview' | 'members' | 'predictions' | 'recommendations'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [teamId, period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/volunteer/lead/teams/${teamId}/analytics?period=${period}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalytics = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const handleRecommendationAction = async (recommendationId: string, action: string) => {
    try {
      const response = await fetch(`/api/v1/volunteer/lead/teams/recommendations/${recommendationId}/action`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ action, team_id: teamId }),
      });

      if (response.ok) {
        await loadAnalytics(); // Refresh data
        if (onRecommendationAction) {
          await onRecommendationAction(recommendationId, action);
        }
      }
    } catch (error) {
      console.error('Error updating recommendation:', error);
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getBurnoutRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No analytics data available</p>
        <p className="text-sm">Analytics will be generated as your team activity increases</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Brain className="h-6 w-6 text-purple-600" />
            <span>Advanced Team Analytics</span>
          </h2>
          <p className="text-gray-600 mt-1">AI-powered insights for team optimization</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAnalytics}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportData?.('pdf')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'members', label: 'Member Insights', icon: Users },
          { key: 'predictions', label: 'Predictions', icon: Brain },
          { key: 'recommendations', label: 'Recommendations', icon: Lightbulb }
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={viewMode === key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode(key as any)}
            className="flex-1"
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </Button>
        ))}
      </div>

      {/* Overview Tab */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Hours</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.performance_metrics.total_hours}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
                <div className="mt-2">
                  <Progress value={analytics.performance_metrics.completion_rate} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">
                    {analytics.performance_metrics.completion_rate}% completion rate
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Satisfaction Score</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.performance_metrics.satisfaction_score}/10
                    </p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="mt-2">
                  <Progress value={analytics.performance_metrics.satisfaction_score * 10} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">
                    Team satisfaction level
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Efficiency Score</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.performance_metrics.efficiency_score}/100
                    </p>
                  </div>
                  <Zap className="h-8 w-8 text-green-500" />
                </div>
                <div className="mt-2">
                  <Progress value={analytics.performance_metrics.efficiency_score} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">
                    Operational efficiency
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Collaboration</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.performance_metrics.collaboration_score}/100
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
                <div className="mt-2">
                  <Progress value={analytics.performance_metrics.collaboration_score} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">
                    Team collaboration level
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Benchmark Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Benchmark Comparison</span>
              </CardTitle>
              <CardDescription>
                How your team performs against industry standards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { 
                    label: 'Hours per Member', 
                    team: analytics.benchmarks.team_performance.hours_per_member,
                    industry: analytics.benchmarks.industry_average.hours_per_member,
                    top: analytics.benchmarks.top_performers.hours_per_member
                  },
                  { 
                    label: 'Satisfaction Score', 
                    team: analytics.benchmarks.team_performance.satisfaction_score,
                    industry: analytics.benchmarks.industry_average.satisfaction_score,
                    top: analytics.benchmarks.top_performers.satisfaction_score
                  },
                  { 
                    label: 'Efficiency Score', 
                    team: analytics.benchmarks.team_performance.efficiency_score,
                    industry: analytics.benchmarks.industry_average.efficiency_score,
                    top: analytics.benchmarks.top_performers.efficiency_score
                  },
                  { 
                    label: 'Retention Rate', 
                    team: analytics.benchmarks.team_performance.retention_rate,
                    industry: analytics.benchmarks.industry_average.retention_rate,
                    top: analytics.benchmarks.top_performers.retention_rate
                  }
                ].map((metric, index) => (
                  <div key={index} className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">{metric.label}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Your Team</span>
                        <span className="font-medium">{metric.team}</span>
                      </div>
                      <Progress value={(metric.team / metric.top) * 100} className="h-1" />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Industry Avg: {metric.industry}</span>
                        <span>Top: {metric.top}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LineChart className="h-5 w-5" />
                <span>Performance Trends</span>
              </CardTitle>
              <CardDescription>
                Key metrics over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.trends.slice(-4).map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium">{trend.period}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Hours</p>
                        <p className="text-sm font-medium">{trend.metrics.hours}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Satisfaction</p>
                        <p className="text-sm font-medium">{trend.metrics.satisfaction}/10</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Efficiency</p>
                        <p className="text-sm font-medium">{trend.metrics.efficiency}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Collaboration</p>
                        <p className="text-sm font-medium">{trend.metrics.collaboration}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Member Insights Tab */}
      {viewMode === 'members' && (
        <div className="space-y-4">
          {analytics.member_insights.map((member) => (
            <Card key={member.member_id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    <CardDescription>
                      Performance Score: {member.performance_score}/100
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getEngagementColor(member.engagement_level)}>
                      {member.engagement_level} engagement
                    </Badge>
                    <Badge className={getBurnoutRiskColor(member.burnout_risk)}>
                      {member.burnout_risk} burnout risk
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Strengths</h4>
                    <div className="space-y-1">
                      {member.strengths.map((strength, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-700">{strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Areas for Improvement</h4>
                    <div className="space-y-1">
                      {member.improvement_areas.map((area, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-gray-700">{area}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-gray-900 mb-2">Recommended Actions</h4>
                  <div className="space-y-1">
                    {member.recommended_actions.map((action, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Lightbulb className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-700">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Growth Potential</span>
                    <Progress value={member.growth_potential} className="w-32" />
                    <span className="text-sm font-medium">{member.growth_potential}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Predictions Tab */}
      {viewMode === 'predictions' && (
        <div className="space-y-4">
          {analytics.predictive_analytics.map((prediction, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      <span>{prediction.title}</span>
                    </CardTitle>
                    <CardDescription>{prediction.description}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={
                      prediction.impact === 'high' ? 'bg-red-100 text-red-800' :
                      prediction.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {prediction.impact} impact
                    </Badge>
                    <Badge variant="outline">
                      {prediction.confidence}% confidence
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Key Data Points</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {prediction.data_points.map((point, pointIndex) => (
                        <div key={pointIndex} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-sm font-medium">{point.label}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">{point.value}</span>
                            {getTrendIcon(point.trend)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                    <div className="space-y-2">
                      {prediction.recommendations.map((rec, recIndex) => (
                        <div key={recIndex} className="flex items-start space-x-2">
                          <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5" />
                          <span className="text-sm text-gray-700">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Timeframe: {prediction.timeframe}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recommendations Tab */}
      {viewMode === 'recommendations' && (
        <div className="space-y-4">
          {analytics.optimization_recommendations
            .sort((a, b) => {
              const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            })
            .map((recommendation) => (
            <Card key={recommendation.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={getPriorityColor(recommendation.priority)}>
                        {recommendation.priority} priority
                      </Badge>
                      <Badge variant="outline">
                        {recommendation.effort_level} effort
                      </Badge>
                      <Badge variant="outline">
                        {recommendation.implementation_time}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                    <CardDescription>{recommendation.description}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      +{recommendation.expected_improvement}%
                    </div>
                    <div className="text-sm text-gray-500">Expected improvement</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Impact Score:</span>
                    <Progress value={recommendation.impact_score} className="w-24" />
                    <span className="text-sm font-medium">{recommendation.impact_score}/100</span>
                  </div>
                  <div className="flex space-x-2">
                    {recommendation.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleRecommendationAction(recommendation.id, 'implement')}
                        >
                          Implement
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRecommendationAction(recommendation.id, 'dismiss')}
                        >
                          Dismiss
                        </Button>
                      </>
                    )}
                    {recommendation.status === 'in_progress' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRecommendationAction(recommendation.id, 'complete')}
                      >
                        Mark Complete
                      </Button>
                    )}
                    {recommendation.status === 'completed' && (
                      <Badge className="bg-green-100 text-green-800">
                        Completed
                      </Badge>
                    )}
                    {recommendation.status === 'dismissed' && (
                      <Badge className="bg-gray-100 text-gray-800">
                        Dismissed
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 