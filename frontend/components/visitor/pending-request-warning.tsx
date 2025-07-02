'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Calendar,
  ArrowRight,
  FileText
} from 'lucide-react';
import { HelpRequest } from '@/lib/types/visitor';
import { formatDate } from '@/lib/utils/date-utils';
import Link from 'next/link';

interface PendingRequestWarningProps {
  pendingRequests: HelpRequest[];
  eligibilityData?: any;
  requestedCategory?: 'Food' | 'General';
  onViewRequest?: (requestId: number) => void;
}

export const PendingRequestWarning: React.FC<PendingRequestWarningProps> = ({
  pendingRequests,
  eligibilityData,
  requestedCategory,
  onViewRequest
}) => {
  const getCategorySpecificMessage = () => {
    if (!eligibilityData || !requestedCategory) {
      return getStatusMessage(pendingRequests);
    }

    const categoryData = eligibilityData.categories?.[requestedCategory.toLowerCase()];
    if (categoryData && !categoryData.eligible) {
      // Use the specific reason from the backend eligibility logic
      return categoryData.reason;
    }

    // Fallback to generic pending request message
    return getStatusMessage(pendingRequests);
  };

  const getCategorySpecificGuidance = () => {
    if (!eligibilityData || !requestedCategory) {
      return getActionGuidance(pendingRequests);
    }

    const categoryData = eligibilityData.categories?.[requestedCategory.toLowerCase()];
    if (categoryData && !categoryData.eligible) {
      if (requestedCategory === 'Food') {
        return "Food support is available once per week. You can submit a new request for next week.";
      } else if (requestedCategory === 'General') {
        return "General support is available once every 4 weeks. You can submit a new request after the waiting period.";
      }
    }

    return getActionGuidance(pendingRequests);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        className: 'bg-yellow-50 text-yellow-700 border-yellow-300', 
        icon: <Clock className="h-3 w-3" />,
        label: 'Pending Review' 
      },
      approved: { 
        className: 'bg-blue-50 text-blue-700 border-blue-300', 
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Approved - Awaiting Ticket' 
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      className: 'bg-gray-50 text-gray-700 border-gray-300',
      icon: <AlertTriangle className="h-3 w-3" />,
      label: status
    };

    return (
      <Badge variant="outline" className={config.className}>
        {config.icon}
        <span className="ml-1">{config.label}</span>
      </Badge>
    );
  };

  const getStatusMessage = (requests: HelpRequest[]) => {
    const hasPending = requests.some(req => req.status === 'Pending');
    const hasApproved = requests.some(req => req.status === 'Approved');
    
    if (hasPending && hasApproved) {
      return "You have both pending and approved help requests.";
    } else if (hasPending) {
      return "You have a pending help request being reviewed.";
    } else if (hasApproved) {
      return "You have an approved help request awaiting ticket issuance.";
    }
    return "You have incomplete help requests.";
  };

  const getActionGuidance = (requests: HelpRequest[]) => {
    const hasPending = requests.some(req => req.status === 'Pending');
    const hasApproved = requests.some(req => req.status === 'Approved');
    
    if (hasPending && hasApproved) {
      return "Please wait for your pending request to be reviewed and for your approved request to receive a ticket before submitting a new request.";
    } else if (hasPending) {
      return "Please wait for your current request to be reviewed before submitting another one. Our team typically reviews requests within 1-2 business days.";
    } else if (hasApproved) {
      return "Your request has been approved and a ticket will be issued soon. You'll receive an email notification when your ticket is ready.";
    }
    return "Please complete or cancel your existing requests before creating a new one.";
  };

  return (
    <div className="space-y-4">
      <Alert variant="default" className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">
          {requestedCategory 
            ? `${requestedCategory} Support Not Available` 
            : 'Cannot Create New Help Request'}
        </AlertTitle>
        <AlertDescription className="text-amber-700">
          {getCategorySpecificMessage()}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Your Current Help Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRequests.map((request) => (
            <div key={request.id} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-lg">
                    {request.category} Request
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Reference: {request.reference}
                  </p>
                </div>
                {getStatusBadge(request.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-gray-600">Submitted:</span>
                    <span className="ml-1 font-medium">
                      {formatDate(request.createdAt)}
                    </span>
                  </div>
                  {request.visitDay && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-600">Requested visit:</span>
                      <span className="ml-1 font-medium">
                        {formatDate(request.visitDay)} at {request.timeSlot}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-gray-600 text-sm">
                    <span className="font-medium">Details:</span> {request.details}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  asChild
                >
                  <Link href={`/visitor/help-requests`}>
                    View Details
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                
                {request.status === 'Pending' && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-gray-600"
                    asChild
                  >
                    <Link href={`/visitor/help-requests`}>
                      Track Progress
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
            <p className="text-blue-800 text-sm mb-3">
              {getCategorySpecificGuidance()}
            </p>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-blue-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Check your email for updates on your request status
              </div>
              <div className="flex items-center text-blue-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                You can view your request status anytime in your dashboard
              </div>
              <div className="flex items-center text-blue-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                You'll receive a ticket via email once your request is approved
              </div>
              {requestedCategory && eligibilityData && (
                <div className="flex items-center text-blue-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {requestedCategory === 'Food' 
                    ? "You can submit a new food support request next week" 
                    : "You can submit a new general support request after 4 weeks"}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link href="/visitor/help-requests">
                <FileText className="h-4 w-4 mr-2" />
                View All My Requests
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/visitor">
                <ArrowRight className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
