'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Heart, 
  CreditCard, 
  Gift, 
  Users, 
  Utensils,
  Home,
  GraduationCap,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils/currency';

interface DonationAmount {
  value: number;
  label: string;
  description: string;
}

const predefinedAmounts: DonationAmount[] = [
  { value: 10, label: '£10', description: 'Provides 2 meals for a family' },
  { value: 25, label: '£25', description: 'Supports a week of groceries' },
  { value: 50, label: '£50', description: 'Helps with utility bills' },
  { value: 100, label: '£100', description: 'Covers housing support costs' },
];

const donationCategories = [
  { id: 'food', label: 'Food Support', icon: Utensils, description: 'Provide meals and groceries to families in need' },
  { id: 'housing', label: 'Housing Support', icon: Home, description: 'Help with rent, utilities, and essential household items' },
  { id: 'education', label: 'Education Support', icon: GraduationCap, description: 'Support children with school supplies and activities' },
  { id: 'general', label: 'General Support', icon: Users, description: 'Flexible support where it\'s needed most' },
];

export default function DonatePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [giftAid, setGiftAid] = useState(false);
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const finalAmount = selectedAmount || parseFloat(customAmount) || 0;

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const calculateGiftAidBonus = (amount: number) => {
    return giftAid ? amount * 0.25 : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (finalAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid donation amount.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const donationData = {
        amount: finalAmount,
        category: selectedCategory,
        isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : null,
        giftAid,
        message: message.trim() || null,
        isAnonymous,
      };

      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/donations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(donationData),
      });

      if (!response.ok) {
        throw new Error('Failed to process donation');
      }

      const result = await response.json();

      // Redirect to payment processing
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        toast({
          title: "Donation Submitted",
          description: "Thank you for your generous donation!",
        });
        router.push('/donor/donations');
      }
    } catch (error: any) {
      toast({
        title: "Donation Failed",
        description: error.message || "Failed to process donation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Heart className="h-8 w-8 mr-3 text-red-500" />
            Make a Donation
          </h1>
          <p className="text-muted-foreground mt-2">
            Your generosity helps us support families and individuals in our community.
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/donor">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Donation Details */}
          <div className="space-y-6">
            {/* Amount Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Donation Amount</CardTitle>
                <CardDescription>
                  Choose an amount or enter a custom donation amount
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {predefinedAmounts.map((amount) => (
                    <Button
                      key={amount.value}
                      type="button"
                      variant={selectedAmount === amount.value ? "default" : "outline"}
                      onClick={() => handleAmountSelect(amount.value)}
                      className="h-auto p-4 flex flex-col items-center"
                    >
                      <span className="text-lg font-bold">{amount.label}</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        {amount.description}
                      </span>
                    </Button>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="custom-amount">Custom Amount (£)</Label>
                  <Input
                    id="custom-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Category Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Support Category</CardTitle>
                <CardDescription>
                  Choose where you'd like your donation to have the most impact
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {donationCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <div
                        key={category.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedCategory === category.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <Icon className="h-5 w-5 mt-0.5 text-primary" />
                          <div className="flex-1">
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name="category"
                                value={category.id}
                                checked={selectedCategory === category.id}
                                onChange={() => setSelectedCategory(category.id)}
                                className="mr-2"
                              />
                              <h4 className="font-medium">{category.label}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {category.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recurring Donation */}
            <Card>
              <CardHeader>
                <CardTitle>Donation Frequency</CardTitle>
                <CardDescription>
                  Regular donations help us plan support more effectively
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recurring"
                    checked={isRecurring}
                    onCheckedChange={(checked) => setIsRecurring(checked === true)}
                  />
                  <Label htmlFor="recurring">Make this a recurring donation</Label>
                </div>
                
                {isRecurring && (
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <select
                      id="frequency"
                      value={recurringFrequency}
                      onChange={(e) => setRecurringFrequency(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Additional Options */}
          <div className="space-y-6">
            {/* Gift Aid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gift className="h-5 w-5 mr-2" />
                  Gift Aid
                </CardTitle>
                <CardDescription>
                  If you're a UK taxpayer, we can claim an extra 25p for every £1 you donate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="gift-aid"
                    checked={giftAid}
                    onCheckedChange={(checked) => setGiftAid(checked === true)}
                  />
                  <Label htmlFor="gift-aid">
                    Yes, I am a UK taxpayer and would like to add Gift Aid
                  </Label>
                </div>
                
                {giftAid && finalAmount > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center text-green-800">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">
                        Gift Aid will add £{calculateGiftAidBonus(finalAmount).toFixed(2)} to your donation
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personal Message */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Message (Optional)</CardTitle>
                <CardDescription>
                  Add a message of support for the community
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Your message of support..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                  />
                  <Label htmlFor="anonymous">Make this donation anonymous</Label>
                </div>
              </CardContent>
            </Card>

            {/* Donation Summary */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Donation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Donation Amount:</span>
                  <span className="font-medium">£{finalAmount.toFixed(2)}</span>
                </div>
                {giftAid && (
                  <div className="flex justify-between text-green-600">
                    <span>Gift Aid Bonus:</span>
                    <span className="font-medium">£{calculateGiftAidBonus(finalAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Impact:</span>
                    <span>£{(finalAmount + calculateGiftAidBonus(finalAmount)).toFixed(2)}</span>
                  </div>
                </div>
                {isRecurring && (
                  <Badge variant="outline" className="w-full justify-center py-2">
                    Recurring {recurringFrequency}
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button 
              type="submit" 
              size="lg" 
              className="w-full"
              disabled={loading || finalAmount <= 0}
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <Heart className="h-4 w-4 mr-2" />
                  Donate £{finalAmount.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
