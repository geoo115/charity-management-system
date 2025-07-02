'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileForm from '@/components/visitor/profile-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
  Save,
  X,
  Shield,
  Settings,
  History,
  FileText,
  Star,
  Award,
  Target,
  Bell,
  Globe,
  Smartphone,
  Heart,
  Home,
  Users,
  Camera,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { VisitorProfile } from '@/lib/types/visitor';
import { fetchVisitorProfile } from '@/lib/api/visitor';
import LoadingSpinner from '@/components/common/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils/date-utils';

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

export default function EnhancedProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<VisitorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      calculateProfileCompleteness(profile);
    }
  }, [profile]);

  const calculateProfileCompleteness = (profileData: VisitorProfile) => {
    const fields = [
      profileData.first_name,
      profileData.last_name,
      profileData.email,
      profileData.phone,
      profileData.address,
      profileData.city,
      profileData.postcode,
      profileData.emergencyContact,
      profileData.dietaryRequirements,
      profileData.householdSize > 0,
      profileData.accessibilityNeeds,
    ];
    
    const completedFields = fields.filter(field => 
      field !== undefined && field !== null && field !== ''
    ).length;
    
    const completeness = Math.round((completedFields / fields.length) * 100);
    setProfileCompleteness(completeness);
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchVisitorProfile();
      setProfile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
      toast({
        title: "Error",
        description: "Failed to load your profile information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadProfile();
      toast({
        title: "Profile refreshed",
        description: "Your profile has been updated with the latest information."
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

  const handleProfileUpdate = (updatedProfile: VisitorProfile) => {
    setProfile(updatedProfile);
    setEditMode(false);
    calculateProfileCompleteness(updatedProfile);
    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated."
    });
  };

  const getVerificationStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Not Verified
          </Badge>
        );
    }
  };

  const getCompletionRecommendations = () => {
    if (!profile) return [];
    
    const missing = [];
    if (!profile.phone) missing.push({ field: 'Phone Number', icon: Phone, priority: 'high' });
    if (!profile.address) missing.push({ field: 'Address', icon: Home, priority: 'high' });
    if (!profile.emergencyContact) missing.push({ field: 'Emergency Contact', icon: Users, priority: 'medium' });
    if (!profile.dietaryRequirements) missing.push({ field: 'Dietary Requirements', icon: Heart, priority: 'low' });
    if (!profile.accessibilityNeeds) missing.push({ field: 'Accessibility Needs', icon: Target, priority: 'low' });
    
    return missing;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <RefreshCw className="h-12 w-12 text-blue-600 mb-4" />
          </motion.div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading your profile...</h2>
          <p className="text-gray-600">Please wait while we gather your information</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!profile) return null;

  const recommendations = getCompletionRecommendations();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Enhanced Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                My Profile
              </h1>
              <p className="text-lg text-gray-600">Manage your personal information and preferences</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={editMode ? "destructive" : "default"}
            onClick={() => setEditMode(!editMode)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {editMode ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancel Edit
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Profile Completeness Card */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-green-900">Profile Completeness</CardTitle>
                  <p className="text-sm text-green-700">
                    {profileCompleteness === 100 ? 'Your profile is complete!' : `${recommendations.length} fields remaining`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">{profileCompleteness}%</div>
                <div className="text-sm text-green-600">Complete</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="relative">
                <Progress value={profileCompleteness} className="h-3" />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${profileCompleteness}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="absolute top-0 left-0 h-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-full"
                />
              </div>
              
              {recommendations.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                  {recommendations.slice(0, 3).map((rec, index) => (
                    <motion.div
                      key={rec.field}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className={`flex items-center gap-2 p-3 rounded-lg border ${
                        rec.priority === 'high' ? 'bg-red-50 border-red-200' :
                        rec.priority === 'medium' ? 'bg-amber-50 border-amber-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <rec.icon className={`h-4 w-4 ${
                        rec.priority === 'high' ? 'text-red-600' :
                        rec.priority === 'medium' ? 'text-amber-600' :
                        'text-gray-600'
                      }`} />
                      <span className="text-sm font-medium">{rec.field}</span>
                    </motion.div>
                  ))}
                </div>
              )}
              
              {profileCompleteness === 100 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Congratulations! Your profile is 100% complete.
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1">
            <TabsTrigger value="profile" className="flex items-center gap-2 py-3">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="verification" className="flex items-center gap-2 py-3">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Verification</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2 py-3">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2 py-3">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="profile" className="space-y-6 mt-6">
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Profile Overview Card */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                        <span className="text-blue-900">Personal Information</span>
                      </CardTitle>
                      {profile?.verificationStatus && getVerificationStatusBadge(profile.verificationStatus)}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {!editMode ? (
                      <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                      >
                        <motion.div variants={fadeInUp} className="space-y-6">
                          {[
                            { label: 'Full Name', value: `${profile?.first_name} ${profile?.last_name}`, icon: User },
                            { label: 'Email', value: profile?.email, icon: Mail },
                            { label: 'Phone', value: profile?.phone || 'Not provided', icon: Phone },
                            { label: 'Household Size', value: profile?.householdSize?.toString() || 'Not specified', icon: Users },
                          ].map((item, index) => (
                            <motion.div
                              key={item.label}
                              variants={fadeInUp}
                              className="group"
                            >
                              <label className="text-sm font-medium text-gray-500 mb-2 block">{item.label}</label>
                              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
                                <item.icon className="h-5 w-5 text-gray-600" />
                                <p className="text-gray-900 font-medium">{item.value}</p>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                        
                        <motion.div variants={fadeInUp} className="space-y-6">
                          {[
                            { 
                              label: 'Address', 
                              value: profile?.address ? `${profile.address}, ${profile.city} ${profile.postcode}` : 'Not provided', 
                              icon: MapPin,
                              multiline: true
                            },
                            { label: 'Emergency Contact', value: profile?.emergencyContact || 'Not provided', icon: Phone },
                            { label: 'Dietary Requirements', value: profile?.dietaryRequirements || 'None specified', icon: Heart },
                            { label: 'Accessibility Needs', value: profile?.accessibilityNeeds || 'None specified', icon: Target },
                          ].map((item, index) => (
                            <motion.div
                              key={item.label}
                              variants={fadeInUp}
                              className="group"
                            >
                              <label className="text-sm font-medium text-gray-500 mb-2 block">{item.label}</label>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
                                <item.icon className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                                <p className="text-gray-900 font-medium">{item.value}</p>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      </motion.div>
                    ) : (
                      <ProfileForm 
                        profile={profile} 
                        onUpdate={handleProfileUpdate}
                        onCancel={() => setEditMode(false)}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Account Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Clock className="h-6 w-6 text-gray-600" />
                      </div>
                      <span>Account Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-6 w-6 text-blue-600" />
                          <div>
                            <label className="text-sm font-medium text-blue-800">Member Since</label>
                            <p className="text-blue-900 font-semibold">{formatDate(profile?.registrationDate || '')}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center space-x-3">
                          <Clock className="h-6 w-6 text-green-600" />
                          <div>
                            <label className="text-sm font-medium text-green-800">Last Visit</label>
                            <p className="text-green-900 font-semibold">
                              {profile?.lastVisit ? formatDate(profile.lastVisit) : 'No visits yet'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="verification" className="space-y-6 mt-6">
              <motion.div
                key="verification"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
                    <CardTitle className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Shield className="h-6 w-6 text-amber-600" />
                      </div>
                      <span className="text-amber-900">Verification Status</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-full ${
                            profile.verificationStatus === 'verified' ? 'bg-green-100' :
                            profile.verificationStatus === 'pending' ? 'bg-amber-100' :
                            'bg-red-100'
                          }`}>
                            {profile.verificationStatus === 'verified' ? (
                              <CheckCircle className="h-8 w-8 text-green-600" />
                            ) : profile.verificationStatus === 'pending' ? (
                              <Clock className="h-8 w-8 text-amber-600" />
                            ) : (
                              <AlertTriangle className="h-8 w-8 text-red-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">Overall Verification</h3>
                            <p className="text-gray-600">Complete verification to access all services</p>
                          </div>
                        </div>
                        {profile?.verificationStatus && getVerificationStatusBadge(profile.verificationStatus)}
                      </div>
                      
                      {profile.verificationStatus !== 'verified' && (
                        <Alert className="border-amber-200 bg-amber-50">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertTitle className="text-amber-900">Document Verification Required</AlertTitle>
                          <AlertDescription className="text-amber-800">
                            Please upload your Photo ID and Proof of Address to complete verification.
                            <Button variant="link" className="p-0 ml-2 text-amber-700" asChild>
                              <a href="/visitor/documents">Upload Documents</a>
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}

                      {profile.verificationStatus === 'verified' && (
                        <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Award className="h-6 w-6 text-green-600" />
                            <div>
                              <h4 className="font-semibold text-green-900">Verification Complete!</h4>
                              <p className="text-sm text-green-700">You have full access to all our services.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-6 mt-6">
              <motion.div
                key="preferences"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                    <CardTitle className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Settings className="h-6 w-6 text-purple-600" />
                      </div>
                      <span className="text-purple-900">Account Preferences</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {[
                        {
                          icon: Bell,
                          title: 'Email Notifications',
                          description: 'Receive updates about your requests and appointments',
                          color: 'text-blue-600',
                          bg: 'bg-blue-50'
                        },
                        {
                          icon: Smartphone,
                          title: 'SMS Notifications',
                          description: 'Get text updates for urgent matters and reminders',
                          color: 'text-green-600',
                          bg: 'bg-green-50'
                        },
                        {
                          icon: Globe,
                          title: 'Language Preference',
                          description: 'Choose your preferred language for communications',
                          color: 'text-purple-600',
                          bg: 'bg-purple-50'
                        }
                      ].map((pref, index) => (
                        <motion.div
                          key={pref.title}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`p-3 rounded-lg ${pref.bg}`}>
                              <pref.icon className={`h-6 w-6 ${pref.color}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold">{pref.title}</h3>
                              <p className="text-sm text-gray-600">{pref.description}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="ml-4">
                            Configure
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6 mt-6">
              <motion.div
                key="activity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50">
                    <CardTitle className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <History className="h-6 w-6 text-gray-600" />
                      </div>
                      <span className="text-gray-900">Recent Activity</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {[
                        { icon: FileText, title: 'Profile updated', time: '2 days ago', color: 'text-blue-500', bg: 'bg-blue-50' },
                        { icon: Shield, title: 'Document uploaded', time: '1 week ago', color: 'text-green-500', bg: 'bg-green-50' },
                        { icon: Camera, title: 'Photo ID verified', time: '2 weeks ago', color: 'text-purple-500', bg: 'bg-purple-50' },
                        { icon: User, title: 'Account created', time: formatDate(profile?.registrationDate || ''), color: 'text-gray-500', bg: 'bg-gray-50' },
                      ].map((activity, index) => (
                        <motion.div
                          key={activity.title}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className={`p-3 rounded-lg ${activity.bg}`}>
                            <activity.icon className={`h-6 w-6 ${activity.color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{activity.title}</p>
                            <p className="text-sm text-gray-600">{activity.time}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </motion.div>
    </div>
  );
}
