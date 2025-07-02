'use client';

import { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  HeartIcon, 
  UsersIcon, 
  UtensilsIcon, 
  LeafIcon,
  TrendingUpIcon,
  BarChart3Icon,
  MapPinIcon,
  CalendarIcon,
  AwardIcon,
  TargetIcon,
  PieChartIcon,
  LineChartIcon
} from 'lucide-react';
import { fetchDonorImpact } from '@/lib/api/donor';
import LoadingSpinner from '@/components/common/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion } from 'framer-motion';

export default function DonorImpactPage() {
  const [impactData, setImpactData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImpact = async () => {
      try {
        const data = await fetchDonorImpact();
        setImpactData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load impact data');
        console.error('Impact error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadImpact();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading your impact data..." />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const { personalImpact, impactTimeline, categoryBreakdown } = impactData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Impact</h1>
          <p className="text-muted-foreground mt-2">
            See how your generosity is making a real difference in the community
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline">
            <BarChart3Icon className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </motion.div>

      {/* Personal Impact Overview */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
              <UsersIcon className="h-4 w-4" />
              Families Helped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{personalImpact.familiesHelped}</div>
            <p className="text-xs text-green-600 mt-1">
              Direct community impact
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
              <UtensilsIcon className="h-4 w-4" />
              Meals Provided
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{personalImpact.mealsProvided}</div>
            <p className="text-xs text-blue-600 mt-1">
              Through your donations
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-700">
              <HeartIcon className="h-4 w-4" />
              People Helped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{personalImpact.peopleHelped}</div>
            <p className="text-xs text-purple-600 mt-1">
              Individual lives touched
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <LeafIcon className="h-4 w-4" />
              CO2 Saved (kg)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{personalImpact.co2Saved}</div>
            <p className="text-xs text-orange-600 mt-1">
              Environmental impact
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Impact Timeline and Category Breakdown */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Impact Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUpIcon className="h-5 w-5 mr-2" />
              Impact Timeline
            </CardTitle>
            <CardDescription>
              Your donation impact over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {impactTimeline.map((timeline: any) => (
                <motion.div
                  key={timeline.month || `timeline-${timeline.donations}-${timeline.impact}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="bg-primary/10 p-2 rounded-md">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{timeline.month}</p>
                      <Badge variant="outline">{timeline.donations} donations</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {timeline.impact}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="h-5 w-5 mr-2" />
              Donation Categories
            </CardTitle>
            <CardDescription>
              How your donations are distributed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryBreakdown.map((category: any) => (
                <motion.div
                  key={category.category || `category-${category.amount}-${category.percentage}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium">{category.category}</span>
                    <span className="text-sm text-muted-foreground">
                      £{category.amount.toFixed(2)} ({category.percentage}%)
                    </span>
                  </div>
                  <Progress value={category.percentage} className="h-2" />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Community Impact Comparison */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-slate-50 to-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AwardIcon className="h-5 w-5 mr-2" />
              Community Impact Score
            </CardTitle>
            <CardDescription>
              Your impact compared to the community average
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="text-4xl font-bold text-primary">
                {personalImpact.communityScore}/100
              </div>
              <p className="text-muted-foreground">
                You're in the top {personalImpact.communityScore}% of donors in the community
              </p>
              <div className="flex justify-center">
                <Badge className="text-lg px-4 py-2">
                  🏆 Community Champion
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
} 