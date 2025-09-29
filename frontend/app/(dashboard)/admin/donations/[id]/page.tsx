'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { AdminDonation, getDonations, updateDonationStatus, sendDonationReceipt } from '@/lib/api/admin-comprehensive';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Mail, Phone, Calendar, DollarSign, CreditCard, CheckCircle, XCircle, Download, User, FileText, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';
import { formatDistanceToNow } from 'date-fns';

export default function DonationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [donation, setDonation] = useState<AdminDonation | null>(null);
  const [loading, setLoading] = useState(true);

  const donationId = params.id as string;

  useEffect(() => {
    if (user?.role === 'Admin' && donationId) {
      loadDonation();
    }
  }, [user, donationId]);

  const loadDonation = async () => {
    try {
      setLoading(true);
      // Since we don't have a single donation endpoint, we'll get all donations and filter
      const response = await getDonations({ page: 1, per_page: 1000 });
      const foundDonation = response.donations.find(d => d.id === donationId);
      
      if (foundDonation) {
        setDonation(foundDonation);
      } else {
        toast({
          title: 'Error',
          description: 'Donation not found',
          variant: 'destructive',
        });
        router.push('/admin/donations');
      }
    } catch (error: any) {
      console.error('Error loading donation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load donation',
        variant: 'destructive',
      });
      router.push('/admin/donations');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: 'pending' | 'completed' | 'failed' | 'refunded') => {
    if (!donation) return;

    try {
      await updateDonationStatus(donation.id, status);
      toast({
        title: 'Success',
        description: 'Donation status updated successfully',
      });
      loadDonation();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update donation status',
        variant: 'destructive',
      });
    }
  };

  const handleSendReceipt = async () => {
    if (!donation) return;

    try {
      await sendDonationReceipt(donation.id);
      toast({
        title: 'Success',
        description: 'Receipt sent successfully',
      });
      loadDonation();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send receipt',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return <LoadingSpinner message="Loading donation details..." />;
  }

  if (!donation) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Donation Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested donation could not be found.</p>
          <Button onClick={() => router.push('/admin/donations')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Donations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/donations')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Donations
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Donation Details</h1>
            <p className="text-muted-foreground">
              Donation ID: {donation.id}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {!donation.receipt_sent && (
            <Button onClick={handleSendReceipt}>
              <Mail className="h-4 w-4 mr-2" />
              Send Receipt
            </Button>
          )}
          {donation.status === 'pending' && (
            <>
              <Button onClick={() => handleStatusUpdate('completed')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Completed
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleStatusUpdate('failed')}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Mark Failed
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Donation Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Donation Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Amount:</span>
              <span className="text-lg font-bold">
                {formatCurrency(donation.amount, donation.currency)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Type:</span>
              <Badge variant="outline">{donation.type}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <Badge className={getStatusColor(donation.status)}>
                {donation.status}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Payment Method:</span>
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 mr-1" />
                {donation.payment_method.replace('_', ' ')}
              </div>
            </div>

            {donation.campaign && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Campaign:</span>
                <span>{donation.campaign}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Date:</span>
              <span>
                {formatDistanceToNow(new Date(donation.created_at), { addSuffix: true })}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Receipt:</span>
              {donation.receipt_sent ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Sent
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <XCircle className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Donor Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Donor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Name:</span>
              <span>
                {donation.is_anonymous ? 'Anonymous Donor' : donation.donor_name}
              </span>
            </div>

            {!donation.is_anonymous && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Email:</span>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  <a 
                    href={`mailto:${donation.donor_email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {donation.donor_email}
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Anonymous:</span>
              <Badge variant={donation.is_anonymous ? 'default' : 'secondary'}>
                {donation.is_anonymous ? 'Yes' : 'No'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Additional Details */}
        {(donation.notes || donation.goods) && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Additional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {donation.goods && (
                <div>
                  <span className="text-sm font-medium">Items Donated:</span>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {donation.goods}
                  </p>
                </div>
              )}
              
              {donation.notes && (
                <div>
                  <span className="text-sm font-medium">Notes:</span>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {donation.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
