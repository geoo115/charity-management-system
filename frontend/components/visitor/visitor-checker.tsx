"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Clock, User, Calendar, Phone, Mail, AlertTriangle, CheckCircle, History } from 'lucide-react';
import { checkVisitorEligibility } from '@/lib/api/help-requests';

interface PreviousVisit {
  id?: number;
  date: string;
  category: string;
  status: string;
}

interface VisitorCheckResult {
  hasRequestedRecently: boolean;
  isFirstTimeVisitor: boolean;
  previousVisits: PreviousVisit[];
}

export const VisitorChecker: React.FC = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<VisitorCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!email && !phone) {
      setError('Please provide either email or phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await checkVisitorEligibility(email, phone);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to check visitor history');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEmail('');
    setPhone('');
    setResult(null);
    setError(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Approved</Badge>;
      case 'ticket_issued':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Completed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Rejected</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Check Visitor History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="visitor@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+44 7xxx xxx xxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={handleCheck} disabled={loading} className="flex-1">
              {loading ? 'Checking...' : 'Check Visitor'}
            </Button>
            {result && (
              <Button variant="outline" onClick={handleReset}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Visitor History Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                {result.isFirstTimeVisitor ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <User className="w-5 h-5 text-blue-600" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {result.isFirstTimeVisitor ? 'First Time Visitor' : 'Returning Visitor'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {result.isFirstTimeVisitor ? 'No previous visits' : 'Has visit history'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                {result.hasRequestedRecently ? (
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {result.hasRequestedRecently ? 'Recent Request' : 'No Recent Request'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {result.hasRequestedRecently ? 'Within last 7 days' : 'Can request support'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium">Total Visits</p>
                  <p className="text-xs text-muted-foreground">
                    {result.previousVisits.length} requests made
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {result.hasRequestedRecently && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  This visitor has made a request within the last 7 days. Please check if they need 
                  emergency support or if this is a follow-up request.
                </AlertDescription>
              </Alert>
            )}

            {result.isFirstTimeVisitor && (
              <Alert className="border-blue-200 bg-blue-50">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  This is a first-time visitor. They may need additional guidance and explanation 
                  of our services and processes.
                </AlertDescription>
              </Alert>
            )}

            {/* Previous Visits */}
            {result.previousVisits.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Previous Visits ({result.previousVisits.length})
                  </h4>
                  <div className="space-y-2">
                    {result.previousVisits.map((visit, index) => (
                      <div key={visit.id || `visit-${visit.date}-${visit.category}-${index}`} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{visit.category} Support</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(visit.date)}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(visit.status)}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VisitorChecker;
