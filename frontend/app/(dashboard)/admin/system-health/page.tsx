'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Shield,
  Server,
  Database,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  RefreshCw,
  Settings,
  Bell,
  Download,
  Upload,
  Monitor,
  Globe,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Timer,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  Pause,
  Play,
  Square,
  RotateCcw,
  Power,
  PowerOff,
  CircleDot,
  Signal,
  Network,
  Cloud,
  CloudOff,
  FileCheck,
  FileX,
  Thermometer
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';
import { fetchSystemHealth } from '@/lib/api/admin';

interface SystemHealthData {
  overview: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    lastRestart: string;
    version: string;
    environment: 'production' | 'staging' | 'development';
  };
  server: {
    cpu: {
      usage: number;
      cores: number;
      temperature: number;
      load: number[];
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
      swap: {
        used: number;
        total: number;
        percentage: number;
      };
    };
    disk: {
      used: number;
      total: number;
      percentage: number;
      iops: {
        read: number;
        write: number;
      };
    };
    network: {
      bytesIn: number;
      bytesOut: number;
      packetsIn: number;
      packetsOut: number;
      latency: number;
    };
  };
  database: {
    status: 'connected' | 'disconnected' | 'slow';
    connections: {
      active: number;
      idle: number;
      max: number;
    };
    performance: {
      queryTime: number;
      slowQueries: number;
      deadlocks: number;
      cacheHitRatio: number;
    };
    storage: {
      used: number;
      total: number;
      percentage: number;
    };
    backups: {
      lastBackup: string;
      status: 'success' | 'failed' | 'running';
      size: number;
      nextScheduled: string;
    };
  };
  services: {
    name: string;
    status: 'running' | 'stopped' | 'error';
    uptime: string;
    cpu: number;
    memory: number;
    restarts: number;
    port?: number;
    lastCheck: string;
  }[];
  security: {
    firewall: {
      status: 'active' | 'inactive';
      blockedAttempts: number;
      rules: number;
    };
    ssl: {
      status: 'valid' | 'expired' | 'expiring';
      expiryDate: string;
      issuer: string;
    };
    auth: {
      failedLogins: number;
      activeSessions: number;
      suspiciousActivity: number;
    };
  };
  monitoring: {
    alerts: {
      id: string;
      level: 'info' | 'warning' | 'error' | 'critical';
      message: string;
      timestamp: string;
      resolved: boolean;
      component: string;
    }[];
    metrics: {
      responseTime: number[];
      errorRate: number[];
      requestCount: number[];
      timestamps: string[];
    };
  };
  external: {
    apis: {
      name: string;
      status: 'online' | 'offline' | 'degraded';
      responseTime: number;
      lastCheck: string;
      uptime: number;
    }[];
    cdn: {
      status: 'active' | 'inactive';
      hitRatio: number;
      bandwidth: number;
    };
  };
}

export default function SystemHealthPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedMetric, setSelectedMetric] = useState<string>('responseTime');

  useEffect(() => {
    loadSystemHealth();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadSystemHealth();
      }, refreshInterval * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const loadSystemHealth = async () => {
    setIsLoading(true);
    try {
      // Fetch real system health data from backend
      const response = await fetch('/api/v1/admin/system/health', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const systemHealthData = await response.json();
        setData(systemHealthData);
      } else {
        console.error('Failed to fetch system health data');
        toast({
          title: 'Error',
          description: 'Failed to load system health data',
          variant: 'destructive',
        });
        setData(null);
      }
    } catch (error) {
      console.error('Error loading system health:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system health data',
        variant: 'destructive',
      });
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
      case 'connected':
      case 'online':
      case 'active':
      case 'success':
      case 'valid':
        return 'text-green-600 bg-green-100';
      case 'warning':
      case 'degraded':
      case 'slow':
      case 'expiring':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
      case 'error':
      case 'stopped':
      case 'disconnected':
      case 'offline':
      case 'failed':
      case 'expired':
      case 'inactive':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
      case 'connected':
      case 'online':
      case 'active':
      case 'success':
      case 'valid':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
      case 'degraded':
      case 'slow':
      case 'expiring':
        return <AlertTriangle className="h-4 w-4" />;
      case 'critical':
      case 'error':
      case 'stopped':
      case 'disconnected':
      case 'offline':
      case 'failed':
      case 'expired':
      case 'inactive':
        return <XCircle className="h-4 w-4" />;
      default:
        return <CircleDot className="h-4 w-4" />;
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <CircleDot className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const restartService = async (serviceName: string) => {
    toast({
      title: 'Service Restart',
      description: `Restarting ${serviceName}...`,
    });
    // Mock API call
    setTimeout(() => {
      toast({
        title: 'Service Restarted',
        description: `${serviceName} has been restarted successfully`,
      });
      loadSystemHealth();
    }, 2000);
  };

  const exportHealthReport = () => {
    toast({
      title: 'Export Started',
      description: 'System health report will be downloaded shortly',
    });
  };

  if (isLoading && !data) {
    return <LoadingSpinner message="Loading system health monitoring..." />;
  }

  if (!data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>No system health data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center text-sm text-gray-600 mb-4">
        <Link href="/admin" className="hover:text-blue-600 transition-colors">
          Admin Dashboard
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">System Health</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health Monitor</h1>
          <p className="text-gray-600">Real-time system status and performance monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportHealthReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" onClick={loadSystemHealth}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Auto-refresh Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label>Auto-refresh</Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Label>Interval:</Label>
                <Select value={refreshInterval.toString()} onValueChange={(value) => setRefreshInterval(parseInt(value))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10s</SelectItem>
                    <SelectItem value="30">30s</SelectItem>
                    <SelectItem value="60">1m</SelectItem>
                    <SelectItem value="300">5m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm text-gray-500">
                Last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(data.overview.status)}>
                {getStatusIcon(data.overview.status)}
                <span className="ml-1">{data.overview.status.toUpperCase()}</span>
              </Badge>
              <span className="text-sm text-gray-600">
                Uptime: {data.overview.uptime}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">CPU Usage</p>
                <p className="text-2xl font-bold">{data.server.cpu.usage}%</p>
                <Progress value={data.server.cpu.usage} className="mt-2" />
              </div>
              <Cpu className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Memory Usage</p>
                <p className="text-2xl font-bold">{data.server.memory.percentage}%</p>
                <Progress value={data.server.memory.percentage} className="mt-2" />
                <p className="text-xs text-gray-500 mt-1">
                  {data.server.memory.used}GB / {data.server.memory.total}GB
                </p>
              </div>
              <MemoryStick className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Disk Usage</p>
                <p className="text-2xl font-bold">{data.server.disk.percentage}%</p>
                <Progress value={data.server.disk.percentage} className="mt-2" />
                <p className="text-xs text-gray-500 mt-1">
                  {data.server.disk.used}GB / {data.server.disk.total}GB
                </p>
              </div>
              <HardDrive className="h-12 w-12 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Database</p>
                <p className="text-lg font-bold flex items-center gap-2">
                  {getStatusIcon(data.database.status)}
                  {data.database.status}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.database.connections.active} active connections
                </p>
              </div>
              <Database className="h-12 w-12 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="external">External</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
              <CardDescription>Monitor all system services and their performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>CPU</TableHead>
                    <TableHead>Memory</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Restarts</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.services.map((service, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(service.status)}>
                          {getStatusIcon(service.status)}
                          <span className="ml-1">{service.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>{service.uptime}</TableCell>
                      <TableCell>{service.cpu}%</TableCell>
                      <TableCell>{formatBytes(service.memory * 1024 * 1024)}</TableCell>
                      <TableCell>{service.port || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={service.restarts > 2 ? 'destructive' : service.restarts > 0 ? 'secondary' : 'outline'}>
                          {service.restarts}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restartService(service.name)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Restart
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Server Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">CPU Temperature</span>
                  <span className="font-semibold">{data.server.cpu.temperature}°C</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Load Average (1m)</span>
                  <span className="font-semibold">{data.server.cpu.load[0]}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Network Latency</span>
                  <span className="font-semibold">{data.server.network.latency}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Disk IOPS (R/W)</span>
                  <span className="font-semibold">{data.server.disk.iops.read}/{data.server.disk.iops.write}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Swap Usage</span>
                  <span className="font-semibold">{data.server.memory.swap.percentage}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Network Traffic</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Bytes In</span>
                  <span className="font-semibold">{formatBytes(data.server.network.bytesIn)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Bytes Out</span>
                  <span className="font-semibold">{formatBytes(data.server.network.bytesOut)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Packets In</span>
                  <span className="font-semibold">{data.server.network.packetsIn.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Packets Out</span>
                  <span className="font-semibold">{data.server.network.packetsOut.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <div className="flex gap-2">
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="responseTime">Response Time</SelectItem>
                    <SelectItem value="errorRate">Error Rate</SelectItem>
                    <SelectItem value="requestCount">Request Count</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Performance metrics chart would appear here</p>
                  <p className="text-xs text-gray-500">Showing {selectedMetric} over time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Connections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Connections</span>
                  <span className="font-semibold">{data.database.connections.active}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Idle Connections</span>
                  <span className="font-semibold">{data.database.connections.idle}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Max Connections</span>
                  <span className="font-semibold">{data.database.connections.max}</span>
                </div>
                <Progress 
                  value={(data.database.connections.active / data.database.connections.max) * 100} 
                  className="mt-2" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average Query Time</span>
                  <span className="font-semibold">{data.database.performance.queryTime}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Slow Queries</span>
                  <span className="font-semibold">{data.database.performance.slowQueries}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Deadlocks</span>
                  <span className="font-semibold">{data.database.performance.deadlocks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Cache Hit Ratio</span>
                  <span className="font-semibold">{data.database.performance.cacheHitRatio}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Database Storage and Backups */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Storage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Used Space</span>
                  <span className="font-semibold">{data.database.storage.used}GB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Space</span>
                  <span className="font-semibold">{data.database.storage.total}GB</span>
                </div>
                <Progress value={data.database.storage.percentage} className="mt-2" />
                <p className="text-xs text-gray-500">
                  {data.database.storage.percentage}% used
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backup Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Last Backup</span>
                  <span className="font-semibold">
                    {formatDistanceToNow(new Date(data.database.backups.lastBackup), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Status</span>
                  <Badge className={getStatusColor(data.database.backups.status)}>
                    {getStatusIcon(data.database.backups.status)}
                    <span className="ml-1">{data.database.backups.status}</span>
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Backup Size</span>
                  <span className="font-semibold">{data.database.backups.size}GB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Next Scheduled</span>
                  <span className="font-semibold">
                    {format(new Date(data.database.backups.nextScheduled), 'MMM d, HH:mm')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Firewall Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Status</span>
                  <Badge className={getStatusColor(data.security.firewall.status)}>
                    {getStatusIcon(data.security.firewall.status)}
                    <span className="ml-1">{data.security.firewall.status}</span>
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Blocked Attempts</span>
                  <span className="font-semibold">{data.security.firewall.blockedAttempts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Rules</span>
                  <span className="font-semibold">{data.security.firewall.rules}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SSL Certificate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Status</span>
                  <Badge className={getStatusColor(data.security.ssl.status)}>
                    {getStatusIcon(data.security.ssl.status)}
                    <span className="ml-1">{data.security.ssl.status}</span>
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Expires</span>
                  <span className="font-semibold">
                    {format(new Date(data.security.ssl.expiryDate), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Issuer</span>
                  <span className="font-semibold">{data.security.ssl.issuer}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Failed Logins (24h)</span>
                  <span className="font-semibold">{data.security.auth.failedLogins}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Sessions</span>
                  <span className="font-semibold">{data.security.auth.activeSessions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Suspicious Activity</span>
                  <span className="font-semibold">{data.security.auth.suspiciousActivity}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Monitor system alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.monitoring.alerts.map((alert) => (
                  <Alert key={alert.id} className={`border-l-4 ${
                    alert.level === 'critical' ? 'border-l-red-500' :
                    alert.level === 'error' ? 'border-l-red-400' :
                    alert.level === 'warning' ? 'border-l-yellow-400' :
                    'border-l-blue-400'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.level)}
                        <div>
                          <AlertTitle className="flex items-center gap-2">
                            {alert.message}
                            {alert.resolved && (
                              <Badge variant="outline" className="text-green-600">
                                Resolved
                              </Badge>
                            )}
                          </AlertTitle>
                          <AlertDescription>
                            <div className="flex gap-4 text-sm text-gray-500 mt-1">
                              <span>Component: {alert.component}</span>
                              <span>Time: {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}</span>
                            </div>
                          </AlertDescription>
                        </div>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="external" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>External API Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>Uptime</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.external.apis.map((api, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{api.name}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(api.status)}>
                            {getStatusIcon(api.status)}
                            <span className="ml-1">{api.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>{api.responseTime}ms</TableCell>
                        <TableCell>{api.uptime}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CDN Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">CDN Status</span>
                  <Badge className={getStatusColor(data.external.cdn.status)}>
                    {getStatusIcon(data.external.cdn.status)}
                    <span className="ml-1">{data.external.cdn.status}</span>
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Cache Hit Ratio</span>
                  <span className="font-semibold">{data.external.cdn.hitRatio}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Bandwidth Usage</span>
                  <span className="font-semibold">{data.external.cdn.bandwidth} GB/h</span>
                </div>
                <Progress value={data.external.cdn.hitRatio} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
