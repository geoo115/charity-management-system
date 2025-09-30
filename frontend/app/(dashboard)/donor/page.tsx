'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { DonorCommunicationQuickAccess, DonorCommunicationFloatingButton } from '@/components/donor/communication-center';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarIcon, 
  PackageIcon, 
  BanknoteIcon, 
  HeartIcon, 
  TruckIcon,
  ArrowUpCircleIcon,
  AlertCircleIcon,
  UsersIcon,
  TargetIcon,
  TrendingUpIcon,
  AwardIcon,
  StarIcon,
  GiftIcon,
  ReceiptIcon,
  SettingsIcon,
  BarChart3Icon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  ZapIcon
} from 'lucide-react';
import Link from 'next/link';
import { fetchDonorDashboard } from '@/lib/api/donor';
import { formatDate } from '@/lib/utils/date-utils';
import LoadingSpinner from '@/components/common/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { DonationHistoryList } from '@/components/donor/donation-history-list';
import { UrgentNeedsList } from '@/components/donor/urgent-needs-list';
import { motion } from 'framer-motion';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [donationType, setDonationType] = useState('all');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await fetchDonorDashboard();
        setDashboardData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const { 
    stats, 
    recentDonations, 
    upcomingDropoffs,
    urgentNeeds,
    impactMetrics,
    recognition,
    communityImpact
  } = dashboardData || {};

  const filteredDonations = donationType === 'all' 
    ? (recentDonations || [])
    : (recentDonations || []).filter((d: any) => d.type === donationType);

  // Get donor recognition level
  const getRecognitionLevel = (totalDonated: number) => {
    if (totalDonated >= 2500) return { level: 'Community Legend', icon: StarIcon, color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (totalDonated >= 1000) return { level: 'Community Guardian', icon: AwardIcon, color: 'text-purple-600', bg: 'bg-purple-50' };
    if (totalDonated >= 500) return { level: 'Community Hero', icon: HeartIcon, color: 'text-red-600', bg: 'bg-red-50' };
    if (totalDonated >= 250) return { level: 'Community Champion', icon: TargetIcon, color: 'text-blue-600', bg: 'bg-blue-50' };
    return { level: 'Community Supporter', icon: GiftIcon, color: 'text-green-600', bg: 'bg-green-50' };
  };

  const recognitionInfo = getRecognitionLevel(stats?.totalDonated || 0);

  return (
    <div className="space-y-6">
      {/* Welcome Header with Recognition */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.first_name}!</h1>
          <div className="flex items-center mt-2 space-x-2">
            <Badge className={`${recognitionInfo.bg} ${recognitionInfo.color} border-0`}>
              <recognitionInfo.icon className="h-3 w-3 mr-1" />
              {recognitionInfo.level}
            </Badge>
            <span className="text-sm text-muted-foreground">
              £{(stats?.totalDonated || 0).toFixed(2)} total donated
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <DonorCommunicationQuickAccess />
          <Button asChild className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
            <Link href="/donor/donate/monetary">
              <BanknoteIcon className="h-4 w-4 mr-2" />
              Donate Money
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/donor/donate/items">
              <PackageIcon className="h-4 w-4 mr-2" />
              Donate Items
            </Link>
          </Button>
        </div>
      </motion.div>
      
      {/* Impact Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
              <BanknoteIcon className="h-4 w-4" />
              Total Donated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">£{(stats?.totalDonated || 0).toFixed(2)}</div>
            <p className="text-xs text-blue-600 mt-1">
              From {stats?.donationCount || 0} donations
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
              <UsersIcon className="h-4 w-4" />
              Families Helped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{impactMetrics?.familiesHelped || 15}</div>
            <p className="text-xs text-green-600 mt-1">
              Direct community impact
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-700">
              <TargetIcon className="h-4 w-4" />
              Impact Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{stats?.impactScore || 0}/100</div>
            <div className="mt-2">
              <Progress value={stats?.impactScore || 0} className="h-2 bg-purple-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <TrendingUpIcon className="h-4 w-4" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{stats?.currentStreak || 6}</div>
            <p className="text-xs text-orange-600 mt-1">
              Months of giving
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-gradient-to-br from-slate-50 to-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ZapIcon className="h-5 w-5 mr-2 text-yellow-600" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common donor activities and tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="h-auto p-4 flex-col" asChild>
                <Link href="/donor/donate/monetary">
                  <BanknoteIcon className="h-6 w-6 mb-2" />
                  <span className="text-sm">Quick Donate</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col" asChild>
                <Link href="/donor/history">
                  <ReceiptIcon className="h-6 w-6 mb-2" />
                  <span className="text-sm">View History</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col" asChild>
                <Link href="/donor/impact">
                  <BarChart3Icon className="h-6 w-6 mb-2" />
                  <span className="text-sm">Impact Report</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col" asChild>
                <Link href="/donor/profile">
                  <SettingsIcon className="h-6 w-6 mb-2" />
                  <span className="text-sm">Profile</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Urgent Needs */}
      {urgentNeeds && urgentNeeds.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-amber-700">
                <ArrowUpCircleIcon className="h-5 w-5 mr-2" />
                Urgent Community Needs
              </CardTitle>
              <CardDescription className="text-amber-600">
                Items currently in high demand - your donation can make an immediate impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UrgentNeedsList needs={urgentNeeds} />
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-100">
                <Link href="/donor/donate/items">
                  <PackageIcon className="h-4 w-4 mr-2" />
                  Donate Items Now
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}
      
      {/* Community Impact Overview */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Upcoming Dropoffs */}
        {upcomingDropoffs && upcomingDropoffs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TruckIcon className="h-5 w-5 mr-2" />
                Upcoming Dropoffs
              </CardTitle>
              <CardDescription>
                Your scheduled item donation dropoffs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingDropoffs.map((dropoff: any) => (
                  <div 
                    key={dropoff.id || dropoff.date + dropoff.time} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                  >
                    <div className="flex items-center">
                      <div className="bg-primary/10 p-2 rounded-md mr-4">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{dropoff.description}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {formatDate(dropoff.date)} at {dropoff.time}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/donor/dropoffs/${dropoff.id}`}>
                        Details
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Community Impact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HeartIcon className="h-5 w-5 mr-2" />
              Community Impact
            </CardTitle>
            <CardDescription>
              Your donations&apos; real-world impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Meals Provided</span>
                <span className="font-medium">{impactMetrics?.mealsProvided || 432}</span>
              </div>
              <Progress value={75} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm">People Helped</span>
                <span className="font-medium">{impactMetrics?.peopleHelped || 54}</span>
              </div>
              <Progress value={60} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm">CO2 Saved (kg)</span>
                <span className="font-medium">{impactMetrics?.co2Saved || 125}</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/donor/impact">
                View Detailed Impact
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
      
      {/* Donation History */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Recent Donation History</CardTitle>
            <Tabs defaultValue="all" value={donationType} onValueChange={setDonationType}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="monetary">Monetary</TabsTrigger>
                <TabsTrigger value="item">Items</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <DonationHistoryList donations={filteredDonations} />
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/donor/history">
                View Full Donation History
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Recognition & Achievements */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-700">
              <AwardIcon className="h-5 w-5 mr-2" />
              Recognition & Achievements
            </CardTitle>
            <CardDescription className="text-yellow-600">
              Your generosity is making a difference
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white/50 rounded-lg">
                <Badge className={`${recognitionInfo.bg} ${recognitionInfo.color} mb-2`}>
                  <recognitionInfo.icon className="h-4 w-4 mr-1" />
                  {recognitionInfo.level}
                </Badge>
                <p className="text-sm text-yellow-700">Current Level</p>
              </div>
              <div className="text-center p-4 bg-white/50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700">{stats.donationCount}</div>
                <p className="text-sm text-yellow-600">Total Donations</p>
              </div>
              <div className="text-center p-4 bg-white/50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700">{stats.currentStreak || 6}</div>
                <p className="text-sm text-yellow-600">Month Streak</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100" asChild>
              <Link href="/donor/recognition">
                View All Achievements
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
      
      {/* Floating Communication Button */}
      <DonorCommunicationFloatingButton />
    </div>
  );
}
