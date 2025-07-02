'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { fetchVolunteerApplicationStatus } from '@/lib/api/volunteer';
import { VolunteerApplicationStatus } from '@/lib/types/volunteer';
import LoadingSpinner from '@/components/common/loading-spinner';

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Under Review',
    description: 'Your application is currently being reviewed by our team.'
  },
  approved: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Approved',
    description: 'Congratulations! Your application has been approved.'
  },
  rejected: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Not Approved',
    description: 'Unfortunately, your application was not approved at this time.'
  },
  additional_info_required: {
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Additional Information Required',
    description: 'We need some additional information to process your application.'
  }
};

export default function ApplicationStatusPage() {
  const router = useRouter();
  const [applicationStatus, setApplicationStatus] = useState<VolunteerApplicationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadApplicationStatus = async () => {
    try {
      const statusData = await fetchVolunteerApplicationStatus();
      setApplicationStatus(statusData as VolunteerApplicationStatus);
    } catch (err: any) {
      console.error('Error loading application status:', err);
      setError(err.message || 'Failed to load application status');
      
      // Set empty state instead of mock data
      setApplicationStatus(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadApplicationStatus();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadApplicationStatus();
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'pending': return 25;
      case 'additional_info_required': return 50;
      case 'approved': return 100;
      case 'rejected': return 100;
      default: return 0;
    }
  };

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
      case 'not_started':
        return <Badge className="bg-gray-100 text-gray-700">Not Started</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading application status..." />;
  }

  if (!applicationStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Application Found</h3>
            <p className="text-muted-foreground mb-4">
              We couldn't find your volunteer application. Please contact support if you believe this is an error.
            </p>
            <Button onClick={() => router.push('/volunteer')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = statusConfig[applicationStatus.status as keyof typeof statusConfig];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Application Status</h1>
          <p className="text-muted-foreground">Track your volunteer application progress</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Notice</AlertTitle>
          <AlertDescription>
            {error} - Showing sample data for demonstration.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <StatusIcon className={`h-8 w-8 ${statusInfo.color}`} />
              <div>
                <CardTitle>Application Status: {statusInfo.label}</CardTitle>
                <CardDescription>{statusInfo.description}</CardDescription>
              </div>
            </div>
            <Badge className={`${statusInfo.bgColor} ${statusInfo.color}`}>
              {applicationStatus.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{getStatusProgress(applicationStatus.status)}%</span>
            </div>
            <Progress value={getStatusProgress(applicationStatus.status)} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Submitted</p>
              <p className="font-medium">
                {new Date(applicationStatus.submittedAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Updated</p>
              <p className="font-medium">
                {new Date(applicationStatus.lastUpdated).toLocaleDateString()}
              </p>
            </div>
          </div>

          {applicationStatus.estimatedCompletionDate && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <Calendar className="h-4 w-4 inline mr-1" />
                Estimated completion: {new Date(applicationStatus.estimatedCompletionDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Required Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Required Documents</CardTitle>
            <CardDescription>Complete these requirements to proceed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {applicationStatus.requiredDocuments.map((doc: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{doc.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {doc.required ? 'Required' : 'Optional'}
                  </p>
                </div>
                {getDocumentStatusBadge(doc.status)}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Get in touch with your volunteer coordinator</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{applicationStatus.contactInfo.coordinatorName}</p>
                  <p className="text-sm text-muted-foreground">Volunteer Coordinator</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{applicationStatus.contactInfo.coordinatorEmail}</p>
                  <p className="text-sm text-muted-foreground">Email</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{applicationStatus.contactInfo.coordinatorPhone}</p>
                  <p className="text-sm text-muted-foreground">Phone</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{applicationStatus.contactInfo.officeHours}</p>
                  <p className="text-sm text-muted-foreground">Office Hours</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button className="w-full" variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Contact Coordinator
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Steps */}
      {applicationStatus.nextSteps && applicationStatus.nextSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>What you need to do next</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {applicationStatus.nextSteps.map((step: string, index: number) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                    {index + 1}
                  </div>
                  <p className="flex-1">{step}</p>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        {applicationStatus.status === 'approved' && (
          <Button onClick={() => router.push('/volunteer')} className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Access Volunteer Dashboard</span>
          </Button>
        )}
        
        {applicationStatus.status === 'additional_info_required' && (
          <Button onClick={() => router.push('/volunteer/profile')} className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Update Application</span>
          </Button>
        )}
        
        {applicationStatus.status === 'rejected' && (
          <Button variant="outline" onClick={() => router.push('/volunteer/profile')}>
            Reapply
          </Button>
        )}
      </div>

      {applicationStatus.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{applicationStatus.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
