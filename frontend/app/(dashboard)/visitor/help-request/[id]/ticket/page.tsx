'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/auth-context';
import { getHelpRequestDetails } from '@/lib/api/help-requests';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  QrCode, 
  Calendar, 
  Clock, 
  MapPin,
  Printer,
  Share2,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/date-utils';
import LoadingSpinner from '@/components/common/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TicketData {
  id: string;
  reference: string;
  qrCode: string;
  visitDate: string;
  timeSlot: string;
  category: string;
  location: string;
  instructions: string[];
  checkInDetails: {
    address: string;
    contactNumber: string;
    arrivalInstructions: string;
  };
  status: 'active' | 'used' | 'expired' | 'pending';
  expiresAt: string;
}

export default function TicketPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTicket = async () => {
      try {
        // Get help request details which includes ticket information
        const helpRequest = await getHelpRequestDetails(parseInt(params.id as string));
        
        // Check if help request is approved or has ticket issued status
        if (!['Approved', 'TicketIssued'].includes(helpRequest.status)) {
          throw new Error('This help request is not yet approved for a ticket');
        }
        
        // Generate ticket number if not available
        const ticketNumber = helpRequest.ticketNumber || `PENDING-${helpRequest.reference}`;
        const isPendingTicket = !helpRequest.ticketNumber;
        
        // Transform help request data to ticket format
        const ticketData: TicketData = {
          id: ticketNumber,
          reference: helpRequest.reference || ticketNumber,
          qrCode: (helpRequest as any).qrCode || (helpRequest as any).qr_code || `QR-${ticketNumber}`,
          visitDate: helpRequest.visitDay || helpRequest.createdAt,
          timeSlot: helpRequest.timeSlot || 'Not scheduled',
          category: helpRequest.category,
          location: 'Lewishame Charity',
          instructions: [
            'Arrive 15 minutes before your appointment time',
            'Bring valid photo ID and proof of address',
            'Show this ticket at reception for check-in'
          ],
          checkInDetails: {
            address: '123 Community Road, Lewisham, SE13 7XX',
            contactNumber: '020 8XXX XXXX',
            arrivalInstructions: 'Please report to the main reception desk and show your ticket'
          },
          status: isPendingTicket ? 'pending' : (helpRequest.status === 'TicketIssued' ? 'active' : 'expired'),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        };
        
        setTicket(ticketData);
      } catch (err: any) {
        setError(err.message || 'Failed to load ticket');
      } finally {
        setLoading(false);
      }
    };

    loadTicket();
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!ticket) return;
    
    try {
      // Use the backend API directly for downloading
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/v1/help-requests/${params.id}/ticket/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to download ticket');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${ticket.reference}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Download failed:', err);
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleShare = async () => {
    if (!ticket) return;

    const shareData = {
      title: `Visit Ticket - ${ticket.reference}`,
      text: `My visit ticket for ${formatDate(ticket.visitDate)} at ${ticket.timeSlot}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your ticket..." />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!ticket) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTitle>Ticket Not Found</AlertTitle>
        <AlertDescription>
          The requested ticket could not be found or you don&apos;t have permission to view it.
        </AlertDescription>
      </Alert>
    );
  }

  const isExpired = new Date(ticket.expiresAt) < new Date();
  const isUsed = ticket.status === 'used';
  const isPendingTicket = ticket.status === 'pending';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/visitor/help-requests">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button 
            size="sm" 
            onClick={handleDownload}
            disabled={isPendingTicket}
            title={isPendingTicket ? "Download will be available once your ticket is issued" : "Download ticket"}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Ticket Status Alert */}
      {isPendingTicket && (
        <Alert variant="default" className="bg-yellow-50 border-yellow-200">
          <AlertTitle>Ticket Pending</AlertTitle>
          <AlertDescription>
            Your help request has been approved! Your ticket will be issued shortly. 
            Please check back later or contact us if you need immediate assistance.
          </AlertDescription>
        </Alert>
      )}
      
      {(isExpired || isUsed) && (
        <Alert variant={isUsed ? "default" : "destructive"}>
          <AlertTitle>
            {isUsed ? "Ticket Used" : "Ticket Expired"}
          </AlertTitle>
          <AlertDescription>
            {isUsed 
              ? "This ticket has already been used for check-in."
              : "This ticket has expired and cannot be used for check-in."
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Main Ticket Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <QrCode className="h-8 w-8 text-primary mr-2" />
            <CardTitle className="text-2xl">
              {isPendingTicket ? 'Ticket Preview' : 'Visit Ticket'}
            </CardTitle>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-lg px-4 py-2">
              #{ticket.reference}
            </Badge>
            <Badge 
              className={
                ticket.status === 'active' ? 'bg-green-50 text-green-700 border-green-300' :
                ticket.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                ticket.status === 'used' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                'bg-red-50 text-red-700 border-red-300'
              }
            >
              {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center">
            {isPendingTicket ? (
              <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">QR Code will be generated</p>
                <p className="text-gray-500 text-sm">when your ticket is issued</p>
              </div>
            ) : (
              <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                <Image 
                  src={ticket.qrCode} 
                  alt="QR Code for check-in" 
                  width={192}
                  height={192}
                />
              </div>
            )}
          </div>

          {/* Visit Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-3 text-muted-foreground" />
                <div>
                  <p className="font-medium">Visit Date</p>
                  <p className="text-sm text-muted-foreground">{formatDate(ticket.visitDate)}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-3 text-muted-foreground" />
                <div>
                  <p className="font-medium">Time Slot</p>
                  <p className="text-sm text-muted-foreground">{ticket.timeSlot}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center">
                <MapPin className="h-5 w-5 mr-3 text-muted-foreground" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">{ticket.location}</p>
                </div>
              </div>
              <div>
                <p className="font-medium">Category</p>
                <Badge variant="outline">{ticket.category}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check-in Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Check-in Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Location Details:</h4>
            <p className="text-sm text-muted-foreground">{ticket.checkInDetails.address}</p>
            <p className="text-sm text-muted-foreground">
              Contact: {ticket.checkInDetails.contactNumber}
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Arrival Instructions:</h4>
            <p className="text-sm text-muted-foreground">{ticket.checkInDetails.arrivalInstructions}</p>
          </div>

          {ticket.instructions.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Important Notes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {ticket.instructions.map((instruction, index) => (
                  <li key={`instruction-${index}`} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expiry Notice */}
      {!isExpired && !isUsed && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800">
              <strong>Please note:</strong> This ticket expires on{' '}
              <span className="font-medium">{formatDate(ticket.expiresAt)}</span>.
              Make sure to arrive on time for your scheduled visit.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
