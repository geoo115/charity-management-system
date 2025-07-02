'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  User,
  Calendar,
  HelpCircle
} from 'lucide-react';
import { EligibilityStatus } from '@/lib/types/visitor';
import { getVisitorEligibility } from '@/lib/api/visitor';
import LoadingSpinner from '@/components/common/loading-spinner';
import { useToast } from '@/components/ui/use-toast';

interface EligibilityCheckerProps {
  onEligibilityChange?: (eligible: boolean) => void;
  showActions?: boolean;
}

export const EligibilityChecker: React.FC<EligibilityCheckerProps> = ({ 
  onEligibilityChange, 
  showActions = true 
}) => {
  const [eligibility, setEligibility] = useState<EligibilityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadEligibility();
  }, []);

  useEffect(() => {
    if (eligibility && onEligibilityChange) {
      onEligibilityChange(eligibility.eligible);
    }
  }, [eligibility, onEligibilityChange]);

  const loadEligibility = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getVisitorEligibility();
      setEligibility(data);
    } catch (err: any) {
      setError(err.message || 'Failed to check eligibility');
      toast({
        title: "Error",
        description: "Failed to check your eligibility status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (approved: boolean) => {
    return approved ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getEligibilityBadge = (eligible: boolean) => {
    return eligible ? (
      <Badge variant="outline" className="bg-green-50 text-green-700">
        Eligible
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-50 text-red-700">
        Not Eligible
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <LoadingSpinner />
            <span className="ml-2">Checking eligibility...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadEligibility}
            className="mt-2"
          >
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!eligibility) return null;

  return (
    <div className="space-y-4">
      {/* Overall Eligibility Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <HelpCircle className="h-5 w-5 mr-2" />
              Service Eligibility
            </span>
            {getEligibilityBadge(eligibility.eligible)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Verification Status */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Document Verification
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">Photo ID</span>
                {getStatusIcon(eligibility.photo_id_approved)}
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">Proof of Address</span>
                {getStatusIcon(eligibility.proof_address_approved)}
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center">
              <User className="h-4 w-4 mr-2" />
              Account Status
            </h4>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm">Account Active</span>
              {getStatusIcon(eligibility.account_active)}
            </div>
          </div>

          {/* Recent Requests */}
          {eligibility.recent_requests > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Recent Activity
              </h4>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  You have {eligibility.recent_requests} request(s) in the last 30 days.
                </p>
              </div>
            </div>
          )}

          {/* Service Categories */}
          <div className="space-y-3">
            <h4 className="font-medium">Service Categories</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium">Food Support</span>
                  <p className="text-xs text-gray-600">{eligibility.categories.food.reason}</p>
                </div>
                {getStatusIcon(eligibility.categories.food.eligible)}
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium">General Support</span>
                  <p className="text-xs text-gray-600">{eligibility.categories.general.reason}</p>
                </div>
                {getStatusIcon(eligibility.categories.general.eligible)}
              </div>
            </div>
          </div>

          {/* Next Steps */}
          {eligibility.next_steps && eligibility.next_steps.length > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Next Steps</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {eligibility.next_steps.map((step, index) => (
                    <li key={index} className="text-sm">{step}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {showActions && (
            <div className="flex gap-2 pt-4">
              {eligibility.eligible ? (
                <Button asChild>
                  <a href="/visitor/help-request/new">Submit Help Request</a>
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <a href="/visitor/documents">Upload Documents</a>
                </Button>
              )}
              <Button variant="outline" onClick={loadEligibility}>
                Refresh Status
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EligibilityChecker;
