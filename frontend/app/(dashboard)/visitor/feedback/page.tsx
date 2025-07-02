'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import FeedbackForm from '@/components/visitor/feedback-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Star, 
  MessageSquare, 
  TrendingUp,
  Calendar,
  Info,
  Plus
} from 'lucide-react';
import { VisitorFeedback } from '@/lib/types/visitor';
import { getVisitorFeedbackHistory } from '@/lib/api/visitor';
import LoadingSpinner from '@/components/common/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils/date-utils';

export default function FeedbackPage() {
  const { user } = useAuth();
  const [feedbackHistory, setFeedbackHistory] = useState<VisitorFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewFeedbackForm, setShowNewFeedbackForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFeedbackHistory();
  }, []);

  const loadFeedbackHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getVisitorFeedbackHistory();
      setFeedbackHistory(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load feedback history');
      toast({
        title: "Error",
        description: "Failed to load your feedback history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = (feedback: VisitorFeedback) => {
    setFeedbackHistory(prev => [feedback, ...prev]);
    setShowNewFeedbackForm(false);
    toast({
      title: "Success",
      description: "Your feedback has been submitted successfully!",
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const calculateAverageRating = () => {
    if (feedbackHistory.length === 0) return "0.0";
    const sum = feedbackHistory.reduce((acc, feedback) => acc + feedback.overallRating, 0);
    return (sum / feedbackHistory.length).toFixed(1);
  };

  const getRecommendationRate = () => {
    if (feedbackHistory.length === 0) return 0;
    const recommended = feedbackHistory.filter(feedback => feedback.wouldRecommend).length;
    return Math.round((recommended / feedbackHistory.length) * 100);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
          <span className="ml-2">Loading feedback history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Feedback & Reviews</h1>
          <p className="text-muted-foreground">
            Share your experience and view your previous feedback.
          </p>
        </div>
        <Button 
          onClick={() => setShowNewFeedbackForm(!showNewFeedbackForm)}
          className="flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Feedback
        </Button>
      </div>

      {/* Information Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Your Feedback Matters</AlertTitle>
        <AlertDescription>
          Your feedback helps us improve our services and better serve the community. 
          Thank you for taking the time to share your experience with us.
        </AlertDescription>
      </Alert>

      {/* Feedback Statistics */}
      {feedbackHistory.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Rating</p>
                  <p className="text-2xl font-bold">{calculateAverageRating()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
              <div className="flex items-center mt-2">
                {renderStars(Math.round(parseFloat(calculateAverageRating())))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                  <p className="text-2xl font-bold">{feedbackHistory.length}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Would Recommend</p>
                  <p className="text-2xl font-bold">{getRecommendationRate()}%</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Feedback Form */}
      {showNewFeedbackForm && (
        <FeedbackForm
          visitId={0} // This would need to be selected from available visits
          onSubmitSuccess={handleFeedbackSubmit}
          onCancel={() => setShowNewFeedbackForm(false)}
        />
      )}

      {/* Feedback History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Your Feedback History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feedbackHistory.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback yet</h3>
              <p className="text-gray-500 mb-4">
                You haven't submitted any feedback. Share your experience to help us improve our services.
              </p>
              <Button onClick={() => setShowNewFeedbackForm(true)}>
                Submit Your First Feedback
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackHistory.map((feedback) => (
                <div key={feedback.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">Visit #{feedback.visitId}</span>
                        <Badge variant="outline">
                          {formatDate(feedback.createdAt, { relative: true })}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <span className="mr-1">Overall:</span>
                          {renderStars(feedback.overallRating)}
                        </div>
                        <div className="flex items-center">
                          <span className="mr-1">Service:</span>
                          {renderStars(feedback.serviceRating)}
                        </div>
                        <div className="flex items-center">
                          <span className="mr-1">Staff:</span>
                          {renderStars(feedback.staffRating)}
                        </div>
                      </div>
                    </div>
                    {feedback.wouldRecommend && (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Would Recommend
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Comments:</span>
                      <p className="text-sm text-gray-700 mt-1">{feedback.comments}</p>
                    </div>

                    {feedback.suggestions && (
                      <div>
                        <span className="text-sm font-medium">Suggestions:</span>
                        <p className="text-sm text-gray-700 mt-1">{feedback.suggestions}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
