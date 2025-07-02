'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { submitVisitorFeedback } from '@/lib/api/visitor';
import { VisitorFeedback } from '@/lib/types/visitor';

const feedbackSchema = z.object({
  visitId: z.number(),
  overallRating: z.number().min(1, 'Please provide an overall rating').max(5),
  serviceRating: z.number().min(1, 'Please rate the service').max(5),
  staffRating: z.number().min(1, 'Please rate the staff').max(5),
  waitTimeRating: z.number().min(1, 'Please rate the wait time').max(5),
  comments: z.string().min(10, 'Please provide more detailed feedback'),
  suggestions: z.string().optional(),
  wouldRecommend: z.boolean(),
});

interface FeedbackFormProps {
  visitId: number;
  visitReference?: string;
  onSubmitSuccess?: (feedback: VisitorFeedback) => void;
  onCancel?: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  visitId,
  visitReference,
  onSubmitSuccess,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof feedbackSchema>>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      visitId,
      overallRating: 0,
      serviceRating: 0,
      staffRating: 0,
      waitTimeRating: 0,
      comments: '',
      suggestions: '',
      wouldRecommend: true,
    },
  });

  const onSubmit = async (values: z.infer<typeof feedbackSchema>) => {
    setLoading(true);
    try {
      const feedback = await submitVisitorFeedback(values);
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! It helps us improve our services.",
      });
      
      if (onSubmitSuccess) {
        onSubmitSuccess(feedback);
      }
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit your feedback",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: number; 
    onChange: (value: number) => void;
    label: string;
  }) => {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <div className="flex items-center space-x-1">
          {Array.from({ length: 5 }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onChange(index + 1)}
              className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              <Star
                className={`h-6 w-6 ${
                  index < value 
                    ? 'text-yellow-400 fill-current' 
                    : 'text-gray-300 hover:text-yellow-200'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600">
            {value > 0 ? `${value}/5` : 'Not rated'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share Your Feedback</CardTitle>
        {visitReference && (
          <p className="text-sm text-muted-foreground">
            Visit Reference: {visitReference}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Rating Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="overallRating"
                render={({ field }) => (
                  <FormItem>
                    <StarRating
                      value={field.value}
                      onChange={field.onChange}
                      label="Overall Experience"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceRating"
                render={({ field }) => (
                  <FormItem>
                    <StarRating
                      value={field.value}
                      onChange={field.onChange}
                      label="Service Quality"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="staffRating"
                render={({ field }) => (
                  <FormItem>
                    <StarRating
                      value={field.value}
                      onChange={field.onChange}
                      label="Staff Helpfulness"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="waitTimeRating"
                render={({ field }) => (
                  <FormItem>
                    <StarRating
                      value={field.value}
                      onChange={field.onChange}
                      label="Wait Time"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Comments */}
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tell us about your experience</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Please share your thoughts about the service, staff, and overall experience..."
                      rows={4}
                    />
                  </FormControl>
                  <FormDescription>
                    Your detailed feedback helps us understand what we're doing well and where we can improve.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Suggestions */}
            <FormField
              control={form.control}
              name="suggestions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Suggestions for improvement (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Any suggestions on how we can improve our services?"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Would Recommend */}
            <FormField
              control={form.control}
              name="wouldRecommend"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Would you recommend our services to others?</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === 'true')}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Yes, I would recommend</SelectItem>
                      <SelectItem value="false">No, I would not recommend</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Submit Feedback
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default FeedbackForm;
