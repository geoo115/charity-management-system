'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Users, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  MapPin
} from 'lucide-react';
import { QueueStatus } from '@/lib/types/visitor';
import { getQueueStatus } from '@/lib/api/visitor';
import LoadingSpinner from '@/components/common/loading-spinner';
import { useToast } from '@/components/ui/use-toast';

interface QueueStatusDisplayProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onUpdate?: (queueData: any) => void;
}

export const QueueStatusDisplay: React.FC<QueueStatusDisplayProps> = ({ 
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  onUpdate
}) => {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const loadQueueStatus = async () => {
    try {
      setError(null);
      const data = await getQueueStatus();
      setQueueStatus(data);
      setLastUpdated(new Date());
      
      // Call onUpdate callback if provided
      if (onUpdate) {
        onUpdate(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load queue status');
      console.warn('Queue status error:', err);
      
      // Don't show error toast for unauthenticated users or when queue is not available
      if (!err.message?.includes('401') && !err.message?.includes('Unauthorized')) {
        toast({
          title: "Queue Status",
          description: "Queue information is currently unavailable",
          variant: "default",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueueStatus();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadQueueStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getQueueStatusColor = (position: number, total: number) => {
    const progress = ((total - position + 1) / total) * 100;
    if (progress >= 80) return 'text-green-600';
    if (progress >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <LoadingSpinner />
            <span className="ml-2">Loading queue status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadQueueStatus}
            className="mt-2"
          >
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!queueStatus) return null;

  return (
    <div className="space-y-4">
      {/* Queue Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Queue Status
            </span>
            <div className="flex items-center space-x-2">
              {queueStatus.isActive ? (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Inactive
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={loadQueueStatus}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {queueStatus.isActive ? (
            <>
              {/* Your Position */}
              <div className="text-center">
                <div className="text-4xl font-bold mb-2 text-primary">
                  #{queueStatus.position}
                </div>
                <p className="text-muted-foreground">Your position in queue</p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Queue Progress</span>
                  <span>{Math.round(((queueStatus.totalInQueue - queueStatus.position + 1) / queueStatus.totalInQueue) * 100)}%</span>
                </div>
                <Progress 
                  value={((queueStatus.totalInQueue - queueStatus.position + 1) / queueStatus.totalInQueue) * 100}
                  className="h-2"
                />
              </div>

              {/* Queue Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-blue-600">
                    {queueStatus.estimatedWaitTime}
                  </div>
                  <p className="text-xs text-muted-foreground">Est. wait (min)</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-semibold text-purple-600">
                    {queueStatus.totalInQueue}
                  </div>
                  <p className="text-xs text-muted-foreground">Total in queue</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-semibold text-orange-600">
                    {queueStatus.averageServiceTime}
                  </div>
                  <p className="text-xs text-muted-foreground">Avg. service (min)</p>
                </div>
              </div>

              {/* Currently Serving */}
              {queueStatus.currentlyServing && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-center space-x-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      Currently serving: <strong>{queueStatus.currentlyServing}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Estimated Time */}
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Estimated Service Time</AlertTitle>
                <AlertDescription>
                  Based on current queue position and average service time, 
                  you&apos;ll be served in approximately <strong>{formatWaitTime(queueStatus.estimatedWaitTime)}</strong>.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Queue Not Active</AlertTitle>
              <AlertDescription>
                The queue is currently not active. Please check back during service hours 
                or contact staff for assistance.
              </AlertDescription>
            </Alert>
          )}

          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-center text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
              {autoRefresh && " (Auto-refreshing every 30 seconds)"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What to Expect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
              1
            </div>
            <div>
              <p className="font-medium">Wait for Your Turn</p>
              <p className="text-sm text-muted-foreground">
                Stay nearby and monitor your queue position. We&apos;ll call your number when it&apos;s your turn.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
              2
            </div>
            <div>
              <p className="font-medium">Bring Required Items</p>
              <p className="text-sm text-muted-foreground">
                Make sure you have your ticket/reference number and any required documents.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
              3
            </div>
            <div>
              <p className="font-medium">Service Delivery</p>
              <p className="text-sm text-muted-foreground">
                Our staff will assist you with your requested services.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QueueStatusDisplay;
