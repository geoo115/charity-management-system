'use client';

import { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { UserIcon, MailIcon, PhoneIcon, MapPinIcon, CreditCardIcon, SettingsIcon, BellIcon, ShieldIcon, CalendarIcon, EditIcon, SaveIcon, TrashIcon, PlusIcon, CheckIcon, XIcon, Settings, Edit } from 'lucide-react';
import { fetchDonorProfile } from '@/lib/api/donor';
import LoadingSpinner from '@/components/common/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';

export default function DonorProfilePage() {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetchDonorProfile();
        setProfileData(data);
        setEditedData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile data');
        console.error('Profile error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading your profile..." />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const { personalInfo, preferences, paymentMethods, recurringDonations } = profileData;

  const handleSave = () => {
    // Mock save functionality
    console.log('Saving profile data:', editedData);
    setEditing(false);
    // In real implementation, this would call an API to save the data
  };

  const handleCancel = () => {
    setEditedData(profileData);
    setEditing(false);
  };

  const addPaymentMethod = () => {
    // Mock add payment method
    console.log('Adding new payment method');
  };

  const removePaymentMethod = (id: number) => {
    // Mock remove payment method
    console.log('Removing payment method:', id);
  };

  const updateRecurringDonation = (id: number, updates: any) => {
    // Mock update recurring donation
    console.log('Updating recurring donation:', id, updates);
  };

  const cancelRecurringDonation = (id: number) => {
    // Mock cancel recurring donation
    console.log('Cancelling recurring donation:', id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal information and donation preferences
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          {editing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <XIcon className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <SaveIcon className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <EditIcon className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </motion.div>

      {/* Profile Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="payment">Payment Methods</TabsTrigger>
            <TabsTrigger value="recurring">Recurring Donations</TabsTrigger>
          </TabsList>
          
          {/* Personal Information */}
          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Your basic contact and personal details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={editedData?.personalInfo?.firstName || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        personalInfo: {
                          ...editedData.personalInfo,
                          firstName: e.target.value
                        }
                      })}
                      disabled={!editing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={editedData?.personalInfo?.lastName || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        personalInfo: {
                          ...editedData.personalInfo,
                          lastName: e.target.value
                        }
                      })}
                      disabled={!editing}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="email"
                      type="email"
                      value={editedData?.personalInfo?.email || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        personalInfo: {
                          ...editedData.personalInfo,
                          email: e.target.value
                        }
                      })}
                      disabled={!editing}
                    />
                    <Badge variant="outline">Verified</Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={editedData?.personalInfo?.phone || ''}
                    onChange={(e) => setEditedData({
                      ...editedData,
                      personalInfo: {
                        ...editedData.personalInfo,
                        phone: e.target.value
                      }
                    })}
                    disabled={!editing}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={editedData?.personalInfo?.address || ''}
                    onChange={(e) => setEditedData({
                      ...editedData,
                      personalInfo: {
                        ...editedData.personalInfo,
                        address: e.target.value
                      }
                    })}
                    disabled={!editing}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences */}
          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <SettingsIcon className="h-5 w-5 mr-2" />
                  Donation Preferences
                </CardTitle>
                <CardDescription>
                  Customize your donation experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Donation Types</h4>
                  <div className="space-y-2">
                    {['monetary', 'items'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Switch
                          id={type}
                          checked={editedData?.preferences?.donationTypes?.includes(type)}
                          onCheckedChange={(checked) => {
                            const types = checked 
                              ? [...(editedData.preferences.donationTypes || []), type]
                              : (editedData.preferences.donationTypes || []).filter((t: string) => t !== type);
                            setEditedData({
                              ...editedData,
                              preferences: {
                                ...editedData.preferences,
                                donationTypes: types
                              }
                            });
                          }}
                          disabled={!editing}
                        />
                        <Label htmlFor={type} className="capitalize">
                          {type} donations
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Communication Preferences</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Preferred Communication Method</Label>
                      <Select
                        value={editedData?.preferences?.communicationMethod || 'email'}
                        onValueChange={(value) => setEditedData({
                          ...editedData,
                          preferences: {
                            ...editedData.preferences,
                            communicationMethod: value
                          }
                        })}
                        disabled={!editing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="newsletter"
                        checked={editedData?.preferences?.newsletterSubscription}
                        onCheckedChange={(checked) => setEditedData({
                          ...editedData,
                          preferences: {
                            ...editedData.preferences,
                            newsletterSubscription: checked
                          }
                        })}
                        disabled={!editing}
                      />
                      <Label htmlFor="newsletter">Subscribe to newsletter</Label>
                    </div>

                    <div className="space-y-2">
                      <Label>Impact Report Frequency</Label>
                      <Select
                        value={editedData?.preferences?.impactReportFrequency || 'monthly'}
                        onValueChange={(value) => setEditedData({
                          ...editedData,
                          preferences: {
                            ...editedData.preferences,
                            impactReportFrequency: value
                          }
                        })}
                        disabled={!editing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Privacy & Tax</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="anonymous"
                        checked={editedData?.preferences?.anonymousDonations}
                        onCheckedChange={(checked) => setEditedData({
                          ...editedData,
                          preferences: {
                            ...editedData.preferences,
                            anonymousDonations: checked
                          }
                        })}
                        disabled={!editing}
                      />
                      <Label htmlFor="anonymous">Make donations anonymous</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="giftAid"
                        checked={editedData?.preferences?.giftAidEligible}
                        onCheckedChange={(checked) => setEditedData({
                          ...editedData,
                          preferences: {
                            ...editedData.preferences,
                            giftAidEligible: checked
                          }
                        })}
                        disabled={!editing}
                      />
                      <Label htmlFor="giftAid">Eligible for Gift Aid (UK taxpayers)</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Methods */}
          <TabsContent value="payment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  Payment Methods
                </CardTitle>
                <CardDescription>
                  Manage your saved payment methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentMethods.map((method: any) => (
                    <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <CreditCardIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            •••• •••• •••• {method.last4}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Expires {method.expiry}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {method.isDefault && (
                          <Badge variant="outline">Default</Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removePaymentMethod(method.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button variant="outline" className="w-full" onClick={addPaymentMethod}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recurring Donations */}
          <TabsContent value="recurring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Recurring Donations
                </CardTitle>
                <CardDescription>
                  Manage your automatic donation subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recurringDonations.map((donation: any) => (
                    <div key={donation.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{donation.description}</h4>
                          <p className="text-sm text-muted-foreground">
                            £{donation.amount.toFixed(2)} {donation.frequency}
                          </p>
                        </div>
                        <Badge variant={donation.status === 'active' ? 'default' : 'secondary'}>
                          {donation.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                        <span>Next donation: {new Date(donation.nextDonation).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <EditIcon className="h-4 w-4 mr-1" />
                          Modify
                        </Button>
                        <Button variant="outline" size="sm">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => cancelRecurringDonation(donation.id)}
                        >
                          <XIcon className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button variant="outline" className="w-full">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Set Up New Recurring Donation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
