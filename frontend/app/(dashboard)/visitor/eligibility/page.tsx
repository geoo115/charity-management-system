'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import EligibilityChecker from '@/components/visitor/eligibility-checker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Info, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Shield,
  FileText,
  MapPin,
  Calendar,
  Users,
  Heart,
  Utensils,
  Home,
  Baby,
  Accessibility,
  Phone,
  Mail,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  Star,
  Target,
  Award,
  TrendingUp,
  Activity,
  Zap,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface EligibilityStatus {
  overall: 'eligible' | 'partial' | 'ineligible' | 'pending';
  score: number;
  categories: {
    [key: string]: {
      status: 'eligible' | 'ineligible' | 'pending';
      reason?: string;
      next_steps?: string[];
    };
  };
  documents: {
    photo_id: 'verified' | 'pending' | 'missing';
    proof_of_address: 'verified' | 'pending' | 'missing';
  };
  recent_requests: {
    count: number;
    last_request: string | null;
    cooling_period: number;
  };
  recommendations: {
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    action_required: boolean;
  }[];
}

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  hours: string;
  eligibility_requirements: string[];
  waitlist_info?: string;
  capacity_status: 'available' | 'limited' | 'full';
}

export default function EligibilityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Enhanced state management
  const [eligibilityStatus, setEligibilityStatus] = useState<EligibilityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Service categories
  const serviceCategories: ServiceCategory[] = [
    {
      id: 'food_support',
      name: 'Food Support',
      description: 'Emergency food parcels and nutritional support',
      icon: <Utensils className="h-6 w-6" />,
      hours: 'Tuesday-Thursday, 11:30 AM - 2:30 PM',
      eligibility_requirements: [
        'Verified Photo ID',
        'Proof of Address',
        'No food support request in last 7 days'
      ],
      capacity_status: 'available'
    },
    {
      id: 'general_support',
      name: 'General Support',
      description: 'Clothing, household items, and basic necessities',
      icon: <Home className="h-6 w-6" />,
      hours: 'Tuesday-Thursday, 10:30 AM - 2:30 PM',
      eligibility_requirements: [
        'Verified Photo ID',
        'Proof of Address',
        'Active account for 24+ hours'
      ],
      capacity_status: 'limited'
    },
    {
      id: 'family_support',
      name: 'Family Support',
      description: 'Baby items, children\'s clothing, and family essentials',
      icon: <Baby className="h-6 w-6" />,
      hours: 'Tuesday & Thursday, 10:30 AM - 2:30 PM',
      eligibility_requirements: [
        'Verified Photo ID',
        'Proof of Address',
        'Evidence of children in household'
      ],
      capacity_status: 'available'
    },
    {
      id: 'disability_support',
      name: 'Disability Support',
      description: 'Specialized equipment and accessibility items',
      icon: <Accessibility className="h-6 w-6" />,
      hours: 'By appointment only',
      eligibility_requirements: [
        'Verified Photo ID',
        'Proof of Address',
        'Disability documentation'
      ],
      capacity_status: 'available'
    }
  ];

  // Load eligibility status
  const loadEligibilityStatus = useCallback(async () => {
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock eligibility data - in real app, this would come from API
      const mockStatus: EligibilityStatus = {
        overall: 'partial',
        score: 75,
        categories: {
          food_support: {
            status: 'eligible',
            reason: 'All requirements met'
          },
          general_support: {
            status: 'eligible',
            reason: 'All requirements met'
          },
          family_support: {
            status: 'pending',
            reason: 'Evidence of children required',
            next_steps: ['Upload birth certificate or child benefit letter']
          },
          disability_support: {
            status: 'ineligible',
            reason: 'Disability documentation required',
            next_steps: ['Provide medical documentation', 'Contact support team for guidance']
          }
        },
        documents: {
          photo_id: 'verified',
          proof_of_address: 'verified'
        },
        recent_requests: {
          count: 1,
          last_request: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          cooling_period: 0
        },
        recommendations: [
          {
            id: '1',
            title: 'Complete Family Support Documentation',
            description: 'Upload evidence of children to access family support services',
            priority: 'high',
            action_required: true
          },
          {
            id: '2',
            title: 'Consider Scheduled Visits',
            description: 'Book appointments to avoid wait times during peak hours',
            priority: 'medium',
            action_required: false
          },
          {
            id: '3',
            title: 'Explore Disability Support',
            description: 'Our disability support team can help with specialized needs',
            priority: 'low',
            action_required: false
          }
        ]
      };
      
      setEligibilityStatus(mockStatus);
    } catch (error) {
      toast({
        title: 'Error Loading Eligibility',
        description: 'Please try again or contact support if the problem persists',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Refresh eligibility status
  const refreshEligibility = async () => {
    setRefreshing(true);
    await loadEligibilityStatus();
    setRefreshing(false);
    toast({
      title: 'Eligibility Refreshed',
      description: 'Your eligibility status has been updated'
    });
  };

  useEffect(() => {
    loadEligibilityStatus();
  }, [loadEligibilityStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'eligible': return 'text-green-600 bg-green-50 border-green-200';
      case 'partial': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'pending': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'ineligible': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'eligible': return <CheckCircle className="h-4 w-4" />;
      case 'partial': return <AlertCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'ineligible': return <XCircle className="h-4 w-4" />;
      default: return <HelpCircle className="h-4 w-4" />;
    }
  };

  const getCapacityColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600';
      case 'limited': return 'text-yellow-600';
      case 'full': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Checking Eligibility</h3>
              <p className="text-muted-foreground">Please wait while we review your status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!eligibilityStatus) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to Load Eligibility</AlertTitle>
          <AlertDescription>
            There was an issue loading your eligibility status. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center">
            <Shield className="h-8 w-8 mr-3 text-primary" />
            Service Eligibility
          </h1>
          <p className="text-muted-foreground">
            Comprehensive eligibility assessment and service access guidance
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Badge variant="outline" className="flex items-center">
            <Activity className="h-3 w-3 mr-1" />
            Last Updated: {new Date().toLocaleDateString()}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshEligibility}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Target className="h-6 w-6 mr-2" />
            Overall Eligibility Status
          </CardTitle>
          <CardDescription>
            Your current eligibility across all service categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(eligibilityStatus.overall)}`}>
                {getStatusIcon(eligibilityStatus.overall)}
                <span className="ml-2 capitalize">{eligibilityStatus.overall}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Current Status</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {eligibilityStatus.score}%
              </div>
              <p className="text-sm text-muted-foreground">Eligibility Score</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {Object.values(eligibilityStatus.categories).filter(c => c.status === 'eligible').length}
              </div>
              <p className="text-sm text-muted-foreground">Services Available</p>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Eligibility Progress</span>
              <span>{eligibilityStatus.score}%</span>
            </div>
            <Progress value={eligibilityStatus.score} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center">
            <Heart className="h-4 w-4 mr-2" />
            Services
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="guidance" className="flex items-center">
            <BookOpen className="h-4 w-4 mr-2" />
            Guidance
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Document Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Photo ID</span>
                    <Badge className={getStatusColor(eligibilityStatus.documents.photo_id)}>
                      {getStatusIcon(eligibilityStatus.documents.photo_id)}
                      <span className="ml-1 capitalize">{eligibilityStatus.documents.photo_id}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Proof of Address</span>
                    <Badge className={getStatusColor(eligibilityStatus.documents.proof_of_address)}>
                      {getStatusIcon(eligibilityStatus.documents.proof_of_address)}
                      <span className="ml-1 capitalize">{eligibilityStatus.documents.proof_of_address}</span>
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-green-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Recent Requests</span>
                    <span className="font-medium">{eligibilityStatus.recent_requests.count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Request</span>
                    <span className="text-sm text-muted-foreground">
                      {eligibilityStatus.recent_requests.last_request 
                        ? new Date(eligibilityStatus.recent_requests.last_request).toLocaleDateString()
                        : 'None'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cooling Period</span>
                    <span className="text-sm font-medium">
                      {eligibilityStatus.recent_requests.cooling_period > 0 
                        ? `${eligibilityStatus.recent_requests.cooling_period} days` 
                        : 'None'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="h-5 w-5 mr-2" />
                Personalized Recommendations
              </CardTitle>
              <CardDescription>
                Actions to improve your eligibility and access to services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eligibilityStatus.recommendations.map((rec) => (
                  <div key={rec.id} className="flex items-start space-x-4 p-4 bg-muted/50 rounded-lg">
                    <div className={`p-2 rounded-lg ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-600' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      <Zap className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium">{rec.title}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                            {rec.priority}
                          </Badge>
                          {rec.action_required && (
                            <Button size="sm">
                              Take Action
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Legacy Eligibility Checker */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Eligibility Check</CardTitle>
              <CardDescription>
                Comprehensive eligibility assessment tool
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EligibilityChecker />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <div className="grid gap-6">
            {serviceCategories.map((category) => {
              const categoryStatus = eligibilityStatus.categories[category.id];
              return (
                <Card key={category.id} className="relative overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {category.icon}
                        </div>
                        <div>
                          <CardTitle className="text-xl">{category.name}</CardTitle>
                          <CardDescription>{category.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge className={getStatusColor(categoryStatus?.status || 'pending')}>
                          {getStatusIcon(categoryStatus?.status || 'pending')}
                          <span className="ml-1 capitalize">{categoryStatus?.status || 'pending'}</span>
                        </Badge>
                        <Badge variant="outline" className={getCapacityColor(category.capacity_status)}>
                          {category.capacity_status === 'available' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {category.capacity_status === 'limited' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {category.capacity_status === 'full' && <XCircle className="h-3 w-3 mr-1" />}
                          {category.capacity_status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3 flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Operating Hours
                        </h4>
                        <p className="text-sm text-muted-foreground">{category.hours}</p>
                        
                        {categoryStatus?.reason && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Status Reason</h4>
                            <p className="text-sm text-muted-foreground">{categoryStatus.reason}</p>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-3 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Requirements
                        </h4>
                        <ul className="space-y-1">
                          {category.eligibility_requirements.map((req, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-center">
                              <CheckCircle2 className="h-3 w-3 mr-2 text-green-500" />
                              {req}
                            </li>
                          ))}
                        </ul>
                        
                        {categoryStatus?.next_steps && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2 text-blue-600">Next Steps</h4>
                            <ul className="space-y-1">
                              {categoryStatus.next_steps.map((step, index) => (
                                <li key={index} className="text-sm text-blue-600 flex items-center">
                                  <ArrowRight className="h-3 w-3 mr-2" />
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {categoryStatus?.status === 'eligible' && (
                      <div className="mt-4 pt-4 border-t">
                        <Button className="w-full sm:w-auto">
                          <Calendar className="h-4 w-4 mr-2" />
                          Request {category.name}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Document Verification Status
              </CardTitle>
              <CardDescription>
                Manage and verify your identity documents for service access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Photo ID</h4>
                      <Badge className={getStatusColor(eligibilityStatus.documents.photo_id)}>
                        {getStatusIcon(eligibilityStatus.documents.photo_id)}
                        <span className="ml-1 capitalize">{eligibilityStatus.documents.photo_id}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Valid government-issued photo identification
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <p>Accepted documents:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Driving License</li>
                        <li>Passport</li>
                        <li>National ID Card</li>
                        <li>Biometric Residence Permit</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Proof of Address</h4>
                      <Badge className={getStatusColor(eligibilityStatus.documents.proof_of_address)}>
                        {getStatusIcon(eligibilityStatus.documents.proof_of_address)}
                        <span className="ml-1 capitalize">{eligibilityStatus.documents.proof_of_address}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Recent document showing your current address
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <p>Accepted documents (within 3 months):</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Utility Bills</li>
                        <li>Bank Statements</li>
                        <li>Council Tax Bill</li>
                        <li>Housing Benefit Letter</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Document Security</AlertTitle>
                    <AlertDescription>
                      Your documents are securely stored and encrypted. We only use them to verify your eligibility for services.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Need to Upload Documents?</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Visit our documents page to upload or update your verification documents.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => window.location.href = '/visitor/documents'}>
                      <FileText className="h-4 w-4 mr-2" />
                      Manage Documents
                    </Button>
                  </div>
                  
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Quick Tips</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Ensure documents are clear and readable</li>
                      <li>• Upload recent documents (within 3 months for address)</li>
                      <li>• Photos should show all corners of the document</li>
                      <li>• Processing usually takes 24-48 hours</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guidance Tab */}
        <TabsContent value="guidance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Eligibility Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">General Requirements</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Must be 18+ years old or accompanied by adult</li>
                    <li>• Must reside in Lewisham or neighboring boroughs</li>
                    <li>• Must provide valid identification</li>
                    <li>• Must demonstrate genuine need for support</li>
                  </ul>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-2">Frequency Limits</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Food support: Once per week</li>
                    <li>• General support: Once per month</li>
                    <li>• Family support: Twice per month</li>
                    <li>• Emergency support: As needed</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Contact Support</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>020 8XXX XXXX</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>support@lewishamdonationhub.org</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Tuesday-Thursday, 10:00 AM - 3:00 PM</span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-2">Useful Links</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Upload Documents
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Book Appointment
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      FAQs
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Important Notice</AlertTitle>
            <AlertDescription>
              Eligibility criteria may change based on service capacity and community needs. 
              We review all applications fairly and aim to support as many people as possible 
              within our available resources.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
