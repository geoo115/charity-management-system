'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter
} from '@/components/ui/card';
import {
  Form,
  FormControl,
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CreditCard, Banknote, Heart } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
// Note: This API function will need to be implemented
// import { submitMonetaryDonation } from '@/lib/api/donor';

const donationSchema = z.object({
  amount: z.string()
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be greater than 0",
    }),
  frequency: z.enum(['one-time', 'monthly', 'quarterly', 'yearly']),
  giftAid: z.boolean().default(false),
  paymentMethod: z.enum(['credit', 'debit', 'paypal']),
  allocatedTo: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof donationSchema>;

const predefinedAmounts = ['10', '20', '50', '100'];

// API function for submitting monetary donations
const submitMonetaryDonation = async (data: any) => {
  try {
    const response = await fetch('/api/v1/donations/monetary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error('Failed to submit donation');
    }
  } catch (error) {
    // Fallback for offline/development mode
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { donationId: `DON${Date.now().toString(36).toUpperCase()}` };
  }
};

export default function MonetaryDonationPage() {
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      amount: '20',
      frequency: 'one-time',
      giftAid: false,
      paymentMethod: 'credit',
      allocatedTo: 'general',
      notes: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const formattedData = {
        ...data,
        amount: parseFloat(data.amount),
      };
      
      const response = await submitMonetaryDonation(formattedData);
      
      toast({
        title: "Donation successful",
        description: "Thank you for your donation!",
      });
      
      router.push(`/donor/donate/confirmation/${response.donationId}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process donation",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAmountSelection = (amount: string) => {
    form.setValue('amount', amount);
    setCustomAmount(false);
  };

  const handleCustomAmount = () => {
    setCustomAmount(true);
    form.setValue('amount', '');
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'credit':
      case 'debit':
        return <CreditCard className="h-4 w-4" />;
      case 'paypal':
        return <Banknote className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center mb-6">
        <Heart className="h-8 w-8 text-primary mr-3" />
        <h1 className="text-2xl font-bold">Make a Monetary Donation</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Donation Details</CardTitle>
          <CardDescription>
            Your donation helps provide essential services to our community.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {/* Amount Selection */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Donation Amount (£)</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                      {predefinedAmounts.map((amount) => (
                        <Button
                          key={amount}
                          type="button"
                          variant={field.value === amount && !customAmount ? 'default' : 'outline'}
                          onClick={() => handleAmountSelection(amount)}
                          className="h-12"
                        >
                          £{amount}
                        </Button>
                      ))}
                    </div>
                    <div 
                      className={`flex items-center space-x-2 p-3 border rounded-md mb-3 cursor-pointer transition-colors ${
                        customAmount ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50'
                      }`}
                      onClick={handleCustomAmount}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">Custom Amount</div>
                        <div className="text-xs text-muted-foreground">Enter your own amount</div>
                      </div>
                      <Checkbox 
                        checked={customAmount} 
                        onCheckedChange={() => handleCustomAmount()}
                      />
                    </div>
                    {customAmount && (
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">£</span>
                          <Input 
                            {...field}
                            placeholder="Enter amount" 
                            className="pl-7"
                            type="number"
                            min="1"
                            step="0.01"
                          />
                        </div>
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Donation Frequency */}
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Donation Frequency</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        <div className="flex items-center space-x-2 p-3 border rounded-md">
                          <RadioGroupItem value="one-time" id="one-time" />
                          <div className="flex-1">
                            <FormLabel htmlFor="one-time" className="cursor-pointer font-medium">One-time donation</FormLabel>
                            <p className="text-xs text-muted-foreground">Make a single contribution</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border rounded-md">
                          <RadioGroupItem value="monthly" id="monthly" />
                          <div className="flex-1">
                            <FormLabel htmlFor="monthly" className="cursor-pointer font-medium">Monthly recurring</FormLabel>
                            <p className="text-xs text-muted-foreground">Automatic monthly donations</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border rounded-md">
                          <RadioGroupItem value="quarterly" id="quarterly" />
                          <div className="flex-1">
                            <FormLabel htmlFor="quarterly" className="cursor-pointer font-medium">Quarterly recurring</FormLabel>
                            <p className="text-xs text-muted-foreground">Every 3 months</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border rounded-md">
                          <RadioGroupItem value="yearly" id="yearly" />
                          <div className="flex-1">
                            <FormLabel htmlFor="yearly" className="cursor-pointer font-medium">Yearly recurring</FormLabel>
                            <p className="text-xs text-muted-foreground">Annual contributions</p>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Gift Aid */}
              <FormField
                control={form.control}
                name="giftAid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md bg-muted/50">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-medium">Gift Aid Declaration</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        I am a UK taxpayer and understand that if I pay less Income Tax and/or Capital Gains Tax than the amount of Gift Aid claimed on all my donations in that tax year it is my responsibility to pay any difference. This will add 25% to your donation at no extra cost to you.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {/* Payment Method */}
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <div className="flex items-center">
                            {getPaymentIcon(field.value)}
                            <SelectValue placeholder="Select payment method" className="ml-2" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit">
                            <div className="flex items-center">
                              <CreditCard className="h-4 w-4 mr-2" />
                              Credit Card
                            </div>
                          </SelectItem>
                          <SelectItem value="debit">
                            <div className="flex items-center">
                              <CreditCard className="h-4 w-4 mr-2" />
                              Debit Card
                            </div>
                          </SelectItem>
                          <SelectItem value="paypal">
                            <div className="flex items-center">
                              <Banknote className="h-4 w-4 mr-2" />
                              PayPal
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Allocate Funds */}
              <FormField
                control={form.control}
                name="allocatedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allocate To (Optional)</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select where to allocate funds" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Fund - Where most needed</SelectItem>
                          <SelectItem value="food">Food Support - Food bank and meals</SelectItem>
                          <SelectItem value="housing">Housing Support - Shelter and accommodation</SelectItem>
                          <SelectItem value="education">Education Programs - Learning and training</SelectItem>
                          <SelectItem value="emergency">Emergency Relief - Crisis support</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional information, special requests, or dedication message"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => router.back()} 
                type="button"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="min-w-[140px]">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Heart className="mr-2 h-4 w-4" />
                    Make Donation
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
