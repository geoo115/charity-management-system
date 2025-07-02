'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Mail,
  MessageSquare,
  Users,
  Eye,
  MousePointer,
  Calendar as CalendarIcon,
  Download,
  RefreshCw,
  Filter,
  Target,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';

interface CommunicationAnalytics {
  messagesSent: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
  bounceRate: number;
  responseRate: number;
  engagementScore: number;
}

interface MessageHistory {
  id: string;
  title: string;
  type: 'broadcast' | 'targeted' | 'automated';
  channel: 'email' | 'sms' | 'push' | 'in_app';
  recipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  sentAt: string;
  status: 'sent' | 'delivered' | 'failed' | 'scheduled';
  template?: string;
  campaign?: string;
}

interface ChannelPerformance {
  channel: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  cost: number;
  roi: number;
}

export default function CommunicationAnalyticsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<CommunicationAnalytics | null>(null);
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);
  const [channelPerformance, setChannelPerformance] = useState<ChannelPerformance[]>([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, selectedChannel, selectedType]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with actual API calls
      const mockAnalytics: CommunicationAnalytics = {
        messagesSent: 1247,
        deliveryRate: 96.8,
        openRate: 42.3,
        clickRate: 8.7,
        unsubscribeRate: 0.3,
        bounceRate: 2.1,
        responseRate: 12.4,
        engagementScore: 73.2
      };

      const mockHistory: MessageHistory[] = [
        {
          id: '1',
          title: 'Weekly Update - New Services Available',
          type: 'broadcast',
          channel: 'email',
          recipients: 1205,
          sent: 1205,
          delivered: 1167,
          opened: 494,
          clicked: 87,
          bounced: 25,
          unsubscribed: 3,
          sentAt: '2024-01-15T10:00:00Z',
          status: 'delivered',
          template: 'weekly-update',
          campaign: 'january-outreach'
        },
        {
          id: '2',
          title: 'Emergency: Service Disruption Notice',
          type: 'broadcast',
          channel: 'sms',
          recipients: 567,
          sent: 567,
          delivered: 560,
          opened: 560,
          clicked: 12,
          bounced: 7,
          unsubscribed: 0,
          sentAt: '2024-01-14T14:30:00Z',
          status: 'delivered',
          template: 'emergency-alert'
        },
        {
          id: '3',
          title: 'Welcome to Lewishame Charity',
          type: 'automated',
          channel: 'email',
          recipients: 45,
          sent: 45,
          delivered: 44,
          opened: 23,
          clicked: 8,
          bounced: 1,
          unsubscribed: 0,
          sentAt: '2024-01-14T09:15:00Z',
          status: 'delivered',
          template: 'welcome-series'
        }
      ];

      const mockChannelPerformance: ChannelPerformance[] = [
        {
          channel: 'Email',
          sent: 892,
          delivered: 864,
          opened: 367,
          clicked: 78,
          deliveryRate: 96.9,
          openRate: 42.5,
          clickRate: 8.7,
          cost: 89.20,
          roi: 425.50
        },
        {
          channel: 'SMS',
          sent: 234,
          delivered: 230,
          opened: 230,
          clicked: 23,
          deliveryRate: 98.3,
          openRate: 100,
          clickRate: 10.0,
          cost: 46.80,
          roi: 156.30
        },
        {
          channel: 'Push',
          sent: 121,
          delivered: 115,
          opened: 67,
          clicked: 12,
          deliveryRate: 95.0,
          openRate: 58.3,
          clickRate: 17.9,
          cost: 0,
          roi: 89.40
        }
      ];

      setAnalytics(mockAnalytics);
      setMessageHistory(mockHistory);
      setChannelPerformance(mockChannelPerformance);
    } catch (error) {
      console.error('Error loading communication analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load communication analytics',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportAnalytics = () => {
    // Mock export functionality
    toast({
      title: 'Export Started',
      description: 'Analytics report will be downloaded shortly',
    });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading communication analytics..." />;
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>No analytics data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link 
              href="/admin/communications" 
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
            >
              ← Back to Communications
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Communication Analytics</h1>
          <p className="text-gray-600">Track message performance and engagement metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Label>Date Range:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to });
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-center gap-2">
              <Label>Channel:</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
                  <SelectItem value="in_app">In-App</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label>Type:</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="broadcast">Broadcast</SelectItem>
                  <SelectItem value="targeted">Targeted</SelectItem>
                  <SelectItem value="automated">Automated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Messages Sent</p>
                <p className="text-2xl font-bold">{analytics.messagesSent.toLocaleString()}</p>
              </div>
              <Send className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivery Rate</p>
                <p className="text-2xl font-bold">{analytics.deliveryRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Rate</p>
                <p className="text-2xl font-bold">{analytics.openRate}%</p>
              </div>
              <Eye className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Click Rate</p>
                <p className="text-2xl font-bold">{analytics.clickRate}%</p>
              </div>
              <MousePointer className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="channels">Channel Performance</TabsTrigger>
          <TabsTrigger value="history">Message History</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Additional Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Bounce Rate</span>
                  <span className="font-semibold">{analytics.bounceRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Unsubscribe Rate</span>
                  <span className="font-semibold">{analytics.unsubscribeRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Response Rate</span>
                  <span className="font-semibold">{analytics.responseRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Engagement Score</span>
                  <span className="font-semibold flex items-center">
                    {analytics.engagementScore}%
                    <TrendingUp className="h-4 w-4 ml-1 text-green-600" />
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Trend Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Chart visualization would appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Channel Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Clicked</TableHead>
                    <TableHead>Delivery Rate</TableHead>
                    <TableHead>Open Rate</TableHead>
                    <TableHead>Click Rate</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelPerformance.map((channel) => (
                    <TableRow key={channel.channel}>
                      <TableCell className="font-medium">{channel.channel}</TableCell>
                      <TableCell>{channel.sent.toLocaleString()}</TableCell>
                      <TableCell>{channel.delivered.toLocaleString()}</TableCell>
                      <TableCell>{channel.opened.toLocaleString()}</TableCell>
                      <TableCell>{channel.clicked.toLocaleString()}</TableCell>
                      <TableCell>{channel.deliveryRate}%</TableCell>
                      <TableCell>{channel.openRate}%</TableCell>
                      <TableCell>{channel.clickRate}%</TableCell>
                      <TableCell>${channel.cost}</TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        ${channel.roi}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Clicked</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messageHistory.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="font-medium">{message.title}</TableCell>
                      <TableCell>
                        <Badge variant={message.type === 'broadcast' ? 'default' : message.type === 'targeted' ? 'secondary' : 'outline'}>
                          {message.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{message.channel}</Badge>
                      </TableCell>
                      <TableCell>{message.recipients}</TableCell>
                      <TableCell>{message.delivered}</TableCell>
                      <TableCell>{message.opened}</TableCell>
                      <TableCell>{message.clicked}</TableCell>
                      <TableCell>{format(new Date(message.sentAt), 'MMM d, HH:mm')}</TableCell>
                      <TableCell>
                        <Badge variant={message.status === 'delivered' ? 'default' : message.status === 'failed' ? 'destructive' : 'secondary'}>
                          {message.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement by User Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Pie chart visualization would appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Engagement Times</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Best Day: Wednesday</span>
                    <span className="font-semibold">48.3% open rate</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Best Time: 10:00 AM</span>
                    <span className="font-semibold">52.1% open rate</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Worst Day: Friday</span>
                    <span className="font-semibold">34.7% open rate</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Worst Time: 11:00 PM</span>
                    <span className="font-semibold">18.2% open rate</span>
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
