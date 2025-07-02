'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft,
  Download,
  Calendar,
  Clock,
  User,
  FileText,
  RefreshCw,
  X
} from 'lucide-react';
import { getHelpRequestDetails, cancelHelpRequest } from '@/lib/api/help-requests';
import { HelpRequest } from '@/lib/types/visitor';
import { formatDate } from '@/lib/utils/date-utils';
import { useToast } from '@/components/ui/use-toast';

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    case 'approved':
    case 'ticketissued':
      return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
    case 'completed':
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Completed</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    case 'cancelled':
      return <Badge variant="outline">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function HelpRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [request, setRequest] = useState<HelpRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const requestId = params.id as string;

  const loadRequest = async () => {
    try {
      setLoading(true);
      const data = await getHelpRequestDetails(parseInt(requestId));
      setRequest(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load help request details');
      toast({
        title: "Error loading request",
        description: err.message || 'Failed to load help request details',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requestId) {
      loadRequest();
    }
  }, [requestId]);

  const handleCancel = async () => {
    if (!request || !confirm('Are you sure you want to cancel this help request? This action cannot be undone.')) {
      return;
    }

    try {
      setCancelling(true);
      await cancelHelpRequest(parseInt(requestId));
      toast({
        title: "Request cancelled",
        description: "Your help request has been cancelled successfully."
      });
      router.push('/visitor/help-requests');
    } catch (err: any) {
      toast({
        title: "Cancellation failed",
        description: err.message || 'Failed to cancel help request',
        variant: "destructive"
      });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading help request details...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error || 'Help request not found'}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const canCancel = ['Pending', 'Approved'].includes(request.status) && request.status !== 'Cancelled';
  const hasTicket = ['Approved', 'TicketIssued'].includes(request.status);

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={() => router.back()} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Help Request Details</h1>
          <p className="text-gray-600">Reference: {request.reference}</p>
        </div>
      </div>

      {/* Request Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              Request Information
            </CardTitle>
            {getStatusBadge(request.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Category</label>
              <p className="text-gray-900">{request.category}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">{getStatusBadge(request.status)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Submitted</label>
              <p className="text-gray-900 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(new Date(request.createdAt))}
              </p>
            </div>
            {request.visitDay && (
              <div>
                <label className="text-sm font-medium text-gray-500">Scheduled Visit</label>
                <p className="text-gray-900 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {request.visitDay} at {request.timeSlot}
                </p>
              </div>
            )}
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Details</label>
            <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">{request.details}</p>
          </div>

          {request.rejectionReason && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <label className="text-sm font-medium text-red-800">Rejection Reason</label>
              <p className="text-red-700 mt-1">{request.rejectionReason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {hasTicket && (
          <Button asChild>
            <Link href={`/visitor/help-request/${request.id}/ticket`}>
              <Download className="h-4 w-4 mr-2" />
              View Ticket
            </Link>
          </Button>
        )}
        
        {canCancel && (
          <Button 
            variant="destructive" 
            onClick={handleCancel}
            disabled={cancelling}
          >
            <X className="h-4 w-4 mr-2" />
            {cancelling ? 'Cancelling...' : 'Cancel Request'}
          </Button>
        )}
      </div>
    </div>
  );
}