'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Ticket,
  User,
  RefreshCw,
  Calendar,
  MapPin,
  Heart,
  Shield,
  TrendingUp,
  Phone,
  Bell,
  ChevronRight,
  Star,
  Zap,
  Users,
  Home,
  Info,
  Eye,
  Sparkles,
  Activity,
  Smile,
  Target,
  Gift
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { fetchUserDashboard, fetchVisitorProfile, getQueueStatus } from '@/lib/api/visitor';
import { VisitorDashboardData, VisitorProfile, QueueStatus } from '@/lib/types/visitor';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleOnHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02 }
};

const EnhancedVisitorDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<VisitorDashboardData | null>(null);
  const [userProfile, setUserProfile] = useState<VisitorProfile | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    // Check if this is user's first visit today
    const lastWelcome = localStorage.getItem('lastWelcome');
    const today = new Date().toDateString();
    if (lastWelcome !== today) {
      setShowWelcome(true);
      localStorage.setItem('lastWelcome', today);
    }
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardResponse, profileResponse, queueResponse] = await Promise.allSettled([
        fetchUserDashboard(),
        fetchVisitorProfile(),
        getQueueStatus()
      ]);
      
      if (dashboardResponse.status === 'fulfilled') {
        setDashboardData(dashboardResponse.value);
      }
      if (profileResponse.status === 'fulfilled') {
        setUserProfile(profileResponse.value);
      }
      if (queueResponse.status === 'fulfilled') {
        setQueueStatus(queueResponse.value);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: "Error loading dashboard",
        description: "Failed to load dashboard data. Please try refreshing.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
      toast({
        title: "Dashboard updated",
        description: "Your information has been refreshed."
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Helper functions
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getProgressToVerification = () => {
    if (!dashboardData?.docStatus) return 0;
    const { photoIdApproved, proofAddressApproved } = dashboardData.docStatus;
    if (photoIdApproved && proofAddressApproved) return 100;
    if (photoIdApproved || proofAddressApproved) return 50;
    return 0;
  };

  const getNextAction = () => {
    if (!dashboardData) return null;
    
    const { docStatus, stats } = dashboardData;
    
    if (!docStatus.verificationComplete) {
      return {
        title: "Complete Verification",
        description: "Upload required documents to access all services",
        href: "/visitor/documents",
        icon: Shield,
        priority: "high",
        color: "bg-amber-500"
      };
    }
    
    if (stats.pendingRequests > 0) {
      return {
        title: "Check Request Status",
        description: `You have ${stats.pendingRequests} pending request${stats.pendingRequests > 1 ? 's' : ''}`,
        href: "/visitor/help-requests",
        icon: Clock,
        priority: "medium",
        color: "bg-blue-500"
      };
    }
    
    if (stats.upcomingTickets > 0) {
      return {
        title: "Upcoming Visit",
        description: "Check your scheduled visit details",
        href: "/visitor/tickets",
        icon: Calendar,
        priority: "medium",
        color: "bg-green-500"
      };
    }
    
    return {
      title: "Request Support",
      description: "Submit a new help request when you need assistance",
      href: "/visitor/help-request/new",
      icon: Plus,
      priority: "low",
      color: "bg-purple-500"
    };
  };

  // Show loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <RefreshCw className="h-12 w-12 text-blue-600 mb-4" />
          </motion.div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading your dashboard...</h2>
          <p className="text-gray-600">Please wait while we gather your information</p>
        </div>
      </div>
    );
  }

  const userName = userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : "Visitor";
  const isVerified = dashboardData?.docStatus?.verificationComplete || false;
  const pendingRequests = dashboardData?.stats?.pendingRequests || 0;
  const upcomingTickets = dashboardData?.stats?.upcomingTickets || 0;
  const totalVisits = dashboardData?.stats?.totalVisits || 0;
  const completedVisits = dashboardData?.stats?.completedVisits || 0;
  const progressPercent = getProgressToVerification();
  const nextAction = getNextAction();

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
      {/* Welcome Message */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-4 right-4 left-4 z-50 max-w-md mx-auto"
          >
            <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 shadow-lg">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Welcome back, {userName.split(' ')[0]}!</strong> We're here to help you today.
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWelcome(false)}
                  className="ml-2 h-6 w-6 p-0"
                >
                  ×
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Dynamic Greeting */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Smile className="h-8 w-8 text-yellow-500" />
            </motion.div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {getGreeting()}, {userName.split(' ')[0]}
              </h1>
              <p className="text-lg text-gray-600">
                {currentTime.toLocaleDateString('en-GB', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {queueStatus?.isActive && queueStatus.position > 0 && (
            <Badge className="bg-green-100 text-green-800 px-3 py-1 text-sm font-medium animate-pulse">
              Queue Position: #{queueStatus.position}
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Verification Progress */}
      {!isVerified && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-amber-600" />
                  <div>
                    <CardTitle className="text-amber-900">Account Verification</CardTitle>
                    <CardDescription className="text-amber-700">
                      {progressPercent}% Complete - Upload documents to access all services
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  {progressPercent === 0 ? 'Not Started' : progressPercent === 50 ? 'In Progress' : 'Complete'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={progressPercent} className="h-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${dashboardData?.docStatus?.photoIdApproved ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {dashboardData?.docStatus?.photoIdApproved ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-400" />
                    )}
                    <span className={`text-sm font-medium ${dashboardData?.docStatus?.photoIdApproved ? 'text-green-800' : 'text-gray-700'}`}>
                      Photo ID
                    </span>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${dashboardData?.docStatus?.proofAddressApproved ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {dashboardData?.docStatus?.proofAddressApproved ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-400" />
                    )}
                    <span className={`text-sm font-medium ${dashboardData?.docStatus?.proofAddressApproved ? 'text-green-800' : 'text-gray-700'}`}>
                      Proof of Address
                    </span>
                  </div>
                </div>
                <Link href="/visitor/documents">
                  <Button className="w-full bg-amber-600 hover:bg-amber-700">
                    <FileText className="h-4 w-4 mr-2" />
                    Upload Documents Now
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Next Action Card */}
      {nextAction && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${nextAction.color} text-white`}>
                    <nextAction.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{nextAction.title}</h3>
                    <p className="text-sm text-gray-600">{nextAction.description}</p>
                  </div>
                </div>
                <Link href={nextAction.href}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Take Action
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Overview with Enhanced Visuals */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Pending Requests */}
        <motion.div variants={fadeInUp}>
          <Card className="hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                  <p className="text-3xl font-bold text-gray-900">{pendingRequests}</p>
                  <p className="text-xs text-gray-500">Active submissions</p>
                </div>
                <div className="relative">
                  <Clock className="h-12 w-12 text-amber-500 group-hover:scale-110 transition-transform" />
                  {pendingRequests > 0 && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full"
                    />
                  )}
                </div>
              </div>
              {pendingRequests > 0 && (
                <Link href="/visitor/help-requests">
                  <Button variant="outline" size="sm" className="w-full mt-4 group-hover:bg-amber-50">
                    View Details
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Visits */}
        <motion.div variants={fadeInUp}>
          <Card className="hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Upcoming Visits</p>
                  <p className="text-3xl font-bold text-gray-900">{upcomingTickets}</p>
                  <p className="text-xs text-gray-500">Scheduled appointments</p>
                </div>
                <Ticket className="h-12 w-12 text-green-500 group-hover:scale-110 transition-transform" />
              </div>
              {upcomingTickets > 0 && (
                <Link href="/visitor/tickets">
                  <Button variant="outline" size="sm" className="w-full mt-4 group-hover:bg-green-50">
                    View Tickets
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Total Visits */}
        <motion.div variants={fadeInUp}>
          <Card className="hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Total Visits</p>
                  <p className="text-3xl font-bold text-gray-900">{totalVisits}</p>
                  <p className="text-xs text-gray-500">All time</p>
                </div>
                <Activity className="h-12 w-12 text-blue-500 group-hover:scale-110 transition-transform" />
              </div>
              <Link href="/visitor/visits">
                <Button variant="outline" size="sm" className="w-full mt-4 group-hover:bg-blue-50">
                  View History
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Verification Status */}
        <motion.div variants={fadeInUp}>
          <Card className="hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Verification</p>
                  <Badge 
                    variant={isVerified ? "default" : "secondary"}
                    className={`text-sm px-3 py-1 ${isVerified ? 'bg-green-100 text-green-800' : ''}`}
                  >
                    {isVerified ? "Verified" : "Pending"}
                  </Badge>
                  <p className="text-xs text-gray-500">Account status</p>
                </div>
                {isVerified ? (
                  <CheckCircle className="h-12 w-12 text-green-500 group-hover:scale-110 transition-transform" />
                ) : (
                  <Shield className="h-12 w-12 text-gray-400 group-hover:scale-110 transition-transform" />
                )}
              </div>
              {!isVerified && (
                <Link href="/visitor/documents">
                  <Button variant="outline" size="sm" className="w-full mt-4 group-hover:bg-gray-50">
                    Complete Verification
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Quick Actions Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6" />
              <div>
                <CardTitle>Request Support</CardTitle>
                <CardDescription className="text-purple-100">
                  Choose the type of assistance you need
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Food Support */}
              <motion.div
                whileHover="hover"
                variants={scaleOnHover}
                className="group"
              >
                <Link href="/visitor/help-request/new?category=Food">
                  <Card className={`transition-all duration-300 ${isVerified 
                    ? 'hover:shadow-lg border-green-200 hover:border-green-300' 
                    : 'opacity-60 cursor-not-allowed border-gray-200'
                  }`}>
                    <CardContent className="p-6 text-center">
                      <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${
                        isVerified ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Heart className="h-8 w-8" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">Food Support</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Essential food packages and nutritional support
                      </p>
                      <Badge 
                        variant={isVerified ? "default" : "secondary"}
                        className={`${isVerified ? 'bg-green-500' : ''}`}
                      >
                        {isVerified ? 'Available' : 'Verification Required'}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>

              {/* General Support */}
              <motion.div
                whileHover="hover"
                variants={scaleOnHover}
                className="group"
              >
                <Link href="/visitor/help-request/new?category=General">
                  <Card className={`transition-all duration-300 ${isVerified 
                    ? 'hover:shadow-lg border-blue-200 hover:border-blue-300' 
                    : 'opacity-60 cursor-not-allowed border-gray-200'
                  }`}>
                    <CardContent className="p-6 text-center">
                      <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${
                        isVerified ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Users className="h-8 w-8" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">General Support</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Information, guidance, and community resources
                      </p>
                      <Badge 
                        variant={isVerified ? "default" : "secondary"}
                        className={`${isVerified ? 'bg-blue-500' : ''}`}
                      >
                        {isVerified ? 'Available' : 'Verification Required'}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>

              {/* Emergency Support */}
              <motion.div
                whileHover="hover"
                variants={scaleOnHover}
                className="group"
              >
                <Link href="/visitor/help-request/new?category=Emergency">
                  <Card className="transition-all duration-300 hover:shadow-lg border-red-200 hover:border-red-300 bg-gradient-to-br from-red-50 to-orange-50">
                    <CardContent className="p-6 text-center">
                      <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                        <AlertCircle className="h-8 w-8" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2 text-red-800">Emergency Support</h3>
                      <p className="text-sm text-red-700 mb-4">
                        Urgent assistance available 24/7
                      </p>
                      <Badge variant="destructive">
                        Always Available
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            </div>

            {!isVerified && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Info className="h-5 w-5 text-amber-600" />
                  <p className="text-sm text-amber-800">
                    <strong>Complete verification</strong> to access Food and General support services. 
                    Emergency support is always available regardless of verification status.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-purple-600" />
              <div>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Fast access to common features and tools
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { 
                  href: "/visitor/help-requests", 
                  icon: FileText, 
                  title: "My Requests", 
                  description: "Track status & history",
                  color: "text-blue-600",
                  bgColor: "bg-blue-50 hover:bg-blue-100"
                },
                { 
                  href: "/visitor/profile", 
                  icon: User, 
                  title: "My Profile", 
                  description: "Update information",
                  color: "text-green-600",
                  bgColor: "bg-green-50 hover:bg-green-100"
                },
                { 
                  href: "/visitor/queue", 
                  icon: Clock, 
                  title: "Queue Status", 
                  description: "Check wait times",
                  color: "text-purple-600",
                  bgColor: "bg-purple-50 hover:bg-purple-100"
                },
                { 
                  href: "/visitor/feedback", 
                  icon: Star, 
                  title: "Feedback", 
                  description: "Share experience",
                  color: "text-yellow-600",
                  bgColor: "bg-yellow-50 hover:bg-yellow-100"
                }
              ].map((link, index) => (
                <motion.div
                  key={link.href}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href={link.href}>
                    <Button 
                      variant="outline" 
                      className={`w-full h-auto p-4 ${link.bgColor} border-gray-200 hover:border-gray-300 transition-all duration-300`}
                    >
                      <div className="text-left space-y-2">
                        <div className="flex items-center gap-3">
                          <link.icon className={`h-5 w-5 ${link.color}`} />
                          <span className="font-medium text-gray-900">{link.title}</span>
                        </div>
                        <p className="text-xs text-gray-600">{link.description}</p>
                      </div>
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Emergency Contact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Phone className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-red-900">24/7 Emergency Support</h3>
                  <Badge variant="destructive" className="text-xs">URGENT</Badge>
                </div>
                <p className="text-sm text-red-700 mb-3">
                  If you need urgent help outside of our opening hours or have an emergency situation, 
                  please contact our dedicated emergency line immediately.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-red-200">
                    <Phone className="h-4 w-4 text-red-600" />
                    <span className="font-mono text-red-900 font-semibold">020-XXXX-XXXX</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-red-200">
                    <Clock className="h-4 w-4 text-red-600" />
                    <span className="text-red-900 font-medium">Available 24/7</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Operating Hours Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Centre Information</CardTitle>
                <CardDescription>Opening hours and location details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Opening Hours</h4>
                <div className="space-y-2 text-sm">
                  {[
                    { day: 'Monday', hours: 'Closed', color: 'text-gray-500' },
                    { day: 'Tuesday', hours: '10:30 AM - 2:30 PM', color: 'text-green-600' },
                    { day: 'Wednesday', hours: '10:30 AM - 2:30 PM', color: 'text-green-600' },
                    { day: 'Thursday', hours: '10:30 AM - 2:30 PM', color: 'text-green-600' },
                    { day: 'Friday', hours: 'Closed', color: 'text-gray-500' },
                    { day: 'Weekend', hours: 'Closed', color: 'text-gray-500' }
                  ].map((schedule, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">{schedule.day}</span>
                      <span className={schedule.color}>{schedule.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Location</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">Lewishame Charity</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Home className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">Community Centre, Lewisham</span>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3">
                    <MapPin className="h-4 w-4 mr-2" />
                    Get Directions
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default EnhancedVisitorDashboard;