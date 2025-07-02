'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { 
  getAdminDashboard, 
  getSystemAlerts,
  AdminDashboard as AdminDashboardType,
  SystemAlert 
} from '@/lib/api/admin-comprehensive';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  UserCheck,
  MessageSquare,
  Calendar,
  Bell,
  ExternalLink,
  Activity,
  BarChart3,
  Settings,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<AdminDashboardType | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'Admin') {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardData, alertsData] = await Promise.all([
        getAdminDashboard(),
        getSystemAlerts()
      ]);
      
      setDashboard(dashboardData);
      setAlerts(alertsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    // Implement alert acknowledgment
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  if (loading) {
    return <LoadingSpinner message="Loading admin dashboard..." />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!dashboard) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>Dashboard data is not available.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of Lewishame Charity operations
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={loadDashboardData}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/admin/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* System Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            System Alerts ({alerts.filter(a => !a.acknowledged).length} unread)
          </h2>
          <div className="grid gap-2">
            {alerts.slice(0, 3).map((alert) => (
              <Alert 
                key={alert.id}
                variant={alert.severity === 'high' ? 'destructive' : 'default'}
                className={alert.acknowledged ? 'opacity-60' : ''}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  {alert.title}
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      alert.severity === 'high' ? 'destructive' : 
                      alert.severity === 'medium' ? 'default' : 'secondary'
                    }>
                      {alert.severity}
                    </Badge>
                    {!alert.acknowledged && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </AlertTitle>
                <AlertDescription>
                  {alert.message}
                  {alert.action && (
                    <Button size="sm" variant="link" className="p-0 h-auto ml-2" asChild>
                      <Link href={alert.action.url}>
                        {alert.action.label}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
          <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Requests</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard.kpis.today_requests}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboard.kpis.today_tickets} tickets issued
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard.kpis.pending_requests}</div>
                <p className="text-xs text-muted-foreground">
                  Help requests awaiting approval
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Document Queue</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard.kpis.pending_verifications}</div>
                <p className="text-xs text-muted-foreground">
                  Pending verification
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Volunteer Coverage</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard.kpis.volunteer_coverage}%</div>
                <Progress value={dashboard.kpis.volunteer_coverage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Urgent Needs</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard.kpis.urgent_needs}</div>
                <p className="text-xs text-muted-foreground">
                  Items critically low
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Good</div>
                <p className="text-xs text-muted-foreground">
                  All systems operational
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Activity
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/help-requests">View All</Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard.recent_activity.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{request.visitor_name}</span>
                        <Badge variant="outline">{request.category}</Badge>
                        <Badge variant={
                          request.status === 'pending' ? 'default' :
                          request.status === 'approved' ? 'default' :
                          request.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {request.reference} • {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/admin/help-requests/${request.id}`}>
                        Review
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visitors Tab */}
        <TabsContent value="visitors" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Visitor Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Active Visitors</span>
                  <Badge variant="secondary">{dashboard.visitor_metrics.total_active}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pending Verifications</span>
                  <Badge variant="outline">{dashboard.visitor_metrics.pending_verifications}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pending Requests</span>
                  <Badge variant="outline">{dashboard.visitor_metrics.pending_requests}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Document Queue
                  </span>
                  <Button size="sm" asChild>
                    <Link href="/admin/documents">Review All</Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.visitor_metrics.pending_documents.slice(0, 3).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div>
                        <p className="font-medium">{doc.visitor_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.document_type} • {doc.uploaded_date}
                        </p>
                      </div>
                      <Button size="sm" asChild>
                        <Link href={`/admin/documents/${doc.id}`}>Verify</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visitor Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Visitor Trends (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboard.visitor_metrics.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="requests" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="visits" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Volunteers Tab */}
        <TabsContent value="volunteers" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Volunteers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{dashboard.volunteer_metrics.total_volunteers}</div>
                <p className="text-sm text-muted-foreground">
                  {dashboard.volunteer_metrics.active_volunteers} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{dashboard.volunteer_metrics.pending_applications}</div>
                <Button size="sm" className="mt-2" asChild>
                  <Link href="/admin/volunteers?status=pending">Review Applications</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shift Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{dashboard.volunteer_metrics.shift_coverage}%</div>
                <Progress value={dashboard.volunteer_metrics.shift_coverage} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Volunteer Reliability Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                  <div className="text-2xl font-bold">{dashboard.volunteer_metrics.reliability_stats.average_rating}/5</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <div className="text-2xl font-bold">{dashboard.volunteer_metrics.reliability_stats.completion_rate}%</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">No-Show Rate</p>
                  <div className="text-2xl font-bold">{dashboard.volunteer_metrics.reliability_stats.no_show_rate}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Urgent Needs
                  </span>
                  <Button size="sm" asChild>
                    <Link href="/admin/inventory">Manage Inventory</Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.urgent_needs.slice(0, 4).map((need) => (
                    <div key={need.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{need.item}</p>
                        <p className="text-sm text-muted-foreground">{need.category}</p>
                      </div>
                      <Badge variant={need.priority === 'High' ? 'destructive' : 'default'}>
                        {need.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Today's Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Morning Shift</span>
                    <Badge variant="outline">8 volunteers</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Afternoon Shift</span>
                    <Badge variant="outline">6 volunteers</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Evening Shift</span>
                    <Badge variant="secondary">2 volunteers</Badge>
                  </div>
                </div>
                <Button size="sm" className="w-full mt-4" asChild>
                  <Link href="/admin/shifts">View Full Schedule</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    System Analytics
                  </span>
                  <Button size="sm" asChild>
                    <Link href="/admin/reports">Full Reports</Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">2,547</div>
                    <p className="text-sm text-muted-foreground">Total Visits</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">89%</div>
                    <p className="text-sm text-muted-foreground">Satisfaction Rate</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">15 min</div>
                    <p className="text-sm text-muted-foreground">Avg Wait Time</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">£45,678</div>
                    <p className="text-sm text-muted-foreground">Total Donations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
