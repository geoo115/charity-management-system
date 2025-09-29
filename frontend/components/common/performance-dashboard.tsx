'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, Zap, Clock, MemoryStick, Wifi, Eye, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw, Download, Settings, BarChart3, PieChart, LineChart, Monitor, Target } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PieChart as RechartsPieChart,
  Cell
} from 'recharts';
import { usePerformanceMonitoring, PerformanceBudget } from '@/lib/utils/performance-monitor';
import { useLocalStorage } from '@/lib/hooks/use-performance';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  target: number;
}

interface WebVitalScore {
  name: string;
  value: number;
  score: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

const COLORS = {
  good: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
  primary: '#3b82f6'
};

/**
 * Real-time Performance Metrics Display
 */
const PerformanceMetrics: React.FC = () => {
  const { metrics, getReport } = usePerformanceMonitoring('PerformanceDashboard');
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      const report = getReport();
      
      setPerformanceHistory(prev => {
        const newEntry = {
          timestamp: Date.now(),
          ...report.metrics,
          webVitals: report.webVitals
        };
        
        return [...prev.slice(-19), newEntry]; // Keep last 20 entries
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, getReport]);

  const currentMetrics: PerformanceMetric[] = [
    {
      name: 'Render Time',
      value: metrics?.renderTime || 0,
      unit: 'ms',
      status: (metrics?.renderTime || 0) < 16 ? 'good' : (metrics?.renderTime || 0) < 33 ? 'warning' : 'critical',
      trend: 'stable',
      target: 16
    },
    {
      name: 'FPS',
      value: metrics?.fps || 60,
      unit: 'fps',
      status: (metrics?.fps || 60) > 55 ? 'good' : (metrics?.fps || 60) > 30 ? 'warning' : 'critical',
      trend: 'stable',
      target: 60
    },
    {
      name: 'Memory Usage',
      value: metrics?.memoryUsage || 0,
      unit: 'MB',
      status: (metrics?.memoryUsage || 0) < 50 ? 'good' : (metrics?.memoryUsage || 0) < 100 ? 'warning' : 'critical',
      trend: 'up',
      target: 50
    },
    {
      name: 'Network Latency',
      value: metrics?.networkLatency || 0,
      unit: 'ms',
      status: (metrics?.networkLatency || 0) < 100 ? 'good' : (metrics?.networkLatency || 0) < 300 ? 'warning' : 'critical',
      trend: 'down',
      target: 100
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-green-500" />;
      default:
        return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {currentMetrics.map((metric) => (
        <motion.div
          key={metric.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.name}
              </CardTitle>
              {getStatusIcon(metric.status)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metric.value.toFixed(metric.name === 'FPS' ? 0 : 1)}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  {metric.unit}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <Progress 
                  value={Math.min(100, (metric.value / metric.target) * 100)} 
                  className="flex-1 mr-2"
                />
                <div className="flex items-center">
                  {getTrendIcon(metric.trend)}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Target: {metric.target}{metric.unit}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

/**
 * Web Vitals Score Display
 */
const WebVitalsDisplay: React.FC<{ webVitals: any }> = ({ webVitals }) => {
  const vitalsData: WebVitalScore[] = [
    {
      name: 'LCP',
      value: webVitals.LCP || 0,
      score: webVitals.LCP ? Math.max(0, 100 - (webVitals.LCP / 25)) : 100,
      rating: webVitals.LCP ? (webVitals.LCP < 2500 ? 'good' : webVitals.LCP < 4000 ? 'needs-improvement' : 'poor') : 'good'
    },
    {
      name: 'FID',
      value: webVitals.FID || 0,
      score: webVitals.FID ? Math.max(0, 100 - (webVitals.FID / 3)) : 100,
      rating: webVitals.FID ? (webVitals.FID < 100 ? 'good' : webVitals.FID < 300 ? 'needs-improvement' : 'poor') : 'good'
    },
    {
      name: 'CLS',
      value: webVitals.CLS || 0,
      score: webVitals.CLS ? Math.max(0, 100 - (webVitals.CLS * 400)) : 100,
      rating: webVitals.CLS ? (webVitals.CLS < 0.1 ? 'good' : webVitals.CLS < 0.25 ? 'needs-improvement' : 'poor') : 'good'
    },
    {
      name: 'FCP',
      value: webVitals.FCP || 0,
      score: webVitals.FCP ? Math.max(0, 100 - (webVitals.FCP / 18)) : 100,
      rating: webVitals.FCP ? (webVitals.FCP < 1800 ? 'good' : webVitals.FCP < 3000 ? 'needs-improvement' : 'poor') : 'good'
    }
  ];

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return COLORS.good;
      case 'needs-improvement': return COLORS.warning;
      case 'poor': return COLORS.critical;
      default: return COLORS.primary;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Web Vitals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {vitalsData.map((vital) => (
            <div key={vital.name} className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-2">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#e5e7eb"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke={getRatingColor(vital.rating)}
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - vital.score / 100)}`}
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold">
                    {vital.score.toFixed(0)}
                  </span>
                </div>
              </div>
              <h4 className="font-medium text-sm">{vital.name}</h4>
              <p className="text-xs text-gray-500">
                {vital.name === 'CLS' ? vital.value.toFixed(3) : `${vital.value.toFixed(0)}ms`}
              </p>
              <Badge 
                variant={vital.rating === 'good' ? 'default' : vital.rating === 'needs-improvement' ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {vital.rating}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Performance Chart Display
 */
const PerformanceChart: React.FC<{ data: any[] }> = ({ data }) => {
  const [selectedMetric, setSelectedMetric] = useState('renderTime');

  const metricOptions = [
    { key: 'renderTime', label: 'Render Time', color: COLORS.primary },
    { key: 'fps', label: 'FPS', color: COLORS.good },
    { key: 'memoryUsage', label: 'Memory Usage', color: COLORS.warning },
    { key: 'networkLatency', label: 'Network Latency', color: COLORS.critical }
  ];

  const formatXAxis = (value: number) => {
    return new Date(value).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Timeline
          </CardTitle>
          <div className="flex gap-2">
            {metricOptions.map((option) => (
              <Button
                key={option.key}
                variant={selectedMetric === option.key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMetric(option.key)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatXAxis}
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => formatXAxis(value as number)}
                formatter={(value: number) => [
                  `${value.toFixed(2)}${selectedMetric === 'fps' ? ' fps' : selectedMetric.includes('Time') || selectedMetric.includes('Latency') ? 'ms' : 'MB'}`,
                  metricOptions.find(m => m.key === selectedMetric)?.label
                ]}
              />
              <Area 
                type="monotone" 
                dataKey={selectedMetric} 
                stroke={metricOptions.find(m => m.key === selectedMetric)?.color}
                fill={metricOptions.find(m => m.key === selectedMetric)?.color}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No performance data available</p>
              <p className="text-sm">Start monitoring to see real-time metrics</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Main Performance Dashboard Component
 */
const PerformanceDashboard: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useLocalStorage('performance-monitoring', true);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [currentReport, setCurrentReport] = useState<any>(null);
  const { getReport } = usePerformanceMonitoring('PerformanceDashboard');

  const refreshData = useCallback(() => {
    const report = getReport();
    setCurrentReport(report);
    
    if (isMonitoring) {
      setPerformanceData(prev => {
        const newEntry = {
          timestamp: Date.now(),
          ...report.metrics
        };
        return [...prev.slice(-19), newEntry];
      });
    }
  }, [getReport, isMonitoring]);

  useEffect(() => {
    refreshData();
    
    if (isMonitoring) {
      const interval = setInterval(refreshData, 2000);
      return () => clearInterval(interval);
    }
  }, [refreshData, isMonitoring]);

  const exportData = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      report: currentReport,
      performanceHistory: performanceData
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentReport, performanceData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring and optimization insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
            disabled={!currentReport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant={isMonitoring ? "default" : "outline"}
            size="sm"
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? (
              <>
                <Activity className="h-4 w-4 mr-2" />
                Monitoring
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Start Monitoring
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Performance Score */}
      {currentReport && (
        <Alert className={`border-l-4 ${
          currentReport.score >= 80 ? 'border-l-green-500 bg-green-50' :
          currentReport.score >= 60 ? 'border-l-yellow-500 bg-yellow-50' :
          'border-l-red-500 bg-red-50'
        }`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Performance Score: {currentReport.score}/100</strong>
                {currentReport.recommendations.length > 0 && (
                  <p className="text-sm mt-1">
                    {currentReport.recommendations.length} recommendation(s) available
                  </p>
                )}
              </div>
              <Badge variant={
                currentReport.score >= 80 ? 'default' :
                currentReport.score >= 60 ? 'secondary' : 'destructive'
              }>
                {currentReport.score >= 80 ? 'Excellent' :
                 currentReport.score >= 60 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="vitals">Web Vitals</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          <PerformanceMetrics />
        </TabsContent>

        <TabsContent value="vitals" className="space-y-6">
          {currentReport?.webVitals ? (
            <WebVitalsDisplay webVitals={currentReport.webVitals} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Web Vitals data not available</p>
                  <p className="text-sm">Navigate through the app to collect data</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <PerformanceChart data={performanceData} />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {currentReport?.recommendations?.length > 0 ? (
                <div className="space-y-3">
                  {currentReport.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recommendations at this time</p>
                  <p className="text-sm">Your app is performing well!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;
