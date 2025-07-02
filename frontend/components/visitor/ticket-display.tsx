"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  QrCode, 
  Download, 
  Printer, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Hash,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { getHelpRequestTicket } from '@/lib/api/help-requests';

interface TicketInfo {
  ticketNumber: string;
  qrCode: string;
  reference: string;
  category: string;
  visitDate: string;
  timeSlot: string;
  visitorName: string;
  status: string;
  instructions?: string;
  location?: string;
}

interface TicketDisplayProps {
  helpRequestId?: number;
  ticketNumber?: string;
  embedded?: boolean;
}

export const TicketDisplay: React.FC<TicketDisplayProps> = ({ 
  helpRequestId, 
  ticketNumber, 
  embedded = false 
}) => {
  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTicket = async () => {
    if (!helpRequestId && !ticketNumber) {
      setError('Please provide a help request ID or ticket number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data;
      if (helpRequestId) {
        data = await getHelpRequestTicket(helpRequestId);
      } else {
        // TODO: Implement ticket lookup by number
        throw new Error('Ticket lookup by number not yet implemented');
      }
      setTicket(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket information');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!ticket) return;

    // Create a simple text version of the ticket
    const ticketText = `
Lewishame Charity - Service Ticket

Ticket Number: ${ticket.ticketNumber}
Reference: ${ticket.reference}
Visitor: ${ticket.visitorName}
Service: ${ticket.category} Support
Date: ${formatDate(ticket.visitDate)}
Time: ${ticket.timeSlot}

Please bring this ticket to your appointment.
Location: ${ticket.location || 'Lewishame Charity'}

${ticket.instructions || 'Please arrive 10 minutes early and bring required documents.'}
    `;

    const blob = new Blob([ticketText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${ticket.ticketNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ticket_issued':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'used':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'expired':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  // Auto-load ticket if IDs are provided
  React.useEffect(() => {
    if ((helpRequestId || ticketNumber) && !ticket && !loading) {
      loadTicket();
    }
  }, [helpRequestId, ticketNumber]);

  if (embedded && !ticket) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <QrCode className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading ticket...' : 'No ticket available'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && !ticket && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Service Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={loadTicket} disabled={loading}>
              {loading ? 'Loading...' : 'Load Ticket'}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {ticket && (
        <Card className="print:shadow-none print:border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <QrCode className="w-6 h-6 text-primary" />
              <CardTitle className="text-xl">Service Ticket</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Lewishame Charity</p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* QR Code Section */}
            <div className="text-center space-y-4">
              <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                {ticket.qrCode ? (
                  <img 
                    src={ticket.qrCode} 
                    alt="Ticket QR Code" 
                    className="w-32 h-32 mx-auto"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gray-100 flex items-center justify-center rounded">
                    <QrCode className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="font-mono text-lg font-bold">{ticket.ticketNumber}</p>
                <Badge className={getStatusColor(ticket.status)}>
                  {ticket.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Ticket Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Reference</p>
                    <p className="font-medium">{ticket.reference}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Visitor Name</p>
                    <p className="font-medium">{ticket.visitorName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Service Type</p>
                    <p className="font-medium">{ticket.category} Support</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Visit Date</p>
                    <p className="font-medium">{formatDate(ticket.visitDate)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time Slot</p>
                    <p className="font-medium">{ticket.timeSlot}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">{ticket.location || 'Lewishame Charity'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            {ticket.instructions && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Important Instructions</h4>
                  <p className="text-sm text-muted-foreground">{ticket.instructions}</p>
                </div>
              </>
            )}

            {/* Default Instructions */}
            <Alert className="print:hidden">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Please arrive 10 minutes early and bring this ticket along with any required documents. 
                Show the QR code to staff upon arrival.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            {!embedded && (
              <div className="flex gap-2 print:hidden">
                <Button onClick={handlePrint} variant="outline" className="flex-1">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Ticket
                </Button>
                <Button onClick={handleDownload} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TicketDisplay;
