'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Icons } from '@/components/common/icons';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define the form schema
const formSchema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  role: z.enum(['Visitor', 'Volunteer', 'Donor']),
  roleSpecificData: z.record(z.any()).optional(),
});

function RegisterForm() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  
  // Set initial tab based on URL parameter
  const initialRole = roleParam && ['visitor', 'volunteer', 'donor'].includes(roleParam.toLowerCase())
    ? roleParam.toLowerCase()
    : 'visitor';
  
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(initialRole);

  // Helper function to ensure field values are never undefined
  const ensureFieldValue = (field: any) => ({
    ...field,
    value: field.value ?? '',
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      city: '',
      postcode: '',
      role: initialRole.charAt(0).toUpperCase() + initialRole.slice(1) as 'Visitor' | 'Volunteer' | 'Donor',
      roleSpecificData: {
        // Visitor fields
        householdSize: '1',
        dietaryRequirements: '',
        accessibilityNeeds: '',
        // Volunteer fields
        skills: [],
        experience: '',
        availability: [],
        // Donor fields
        preferredDonationType: 'Both',
        giftAidEligible: false,
        donationFrequency: 'One-time',
      },
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      // Prepare role-specific data
      let roleSpecificData: Record<string, any> = {};

      if (data.role === 'Visitor') {
        roleSpecificData.visitor = {
          householdSize: form.watch('roleSpecificData.householdSize') || '1',
          dietaryRequirements: form.watch('roleSpecificData.dietaryRequirements') || '',
          accessibilityNeeds: form.watch('roleSpecificData.accessibilityNeeds') || '',
        };
      } else if (data.role === 'Volunteer') {
        roleSpecificData.volunteer = {
          skills: form.watch('roleSpecificData.skills') || [],
          experience: form.watch('roleSpecificData.experience') || '',
          availability: form.watch('roleSpecificData.availability') || [],
        };
      } else if (data.role === 'Donor') {
        roleSpecificData.donor = {
          preferredDonationType: form.watch('roleSpecificData.preferredDonationType') || 'Both',
          giftAidEligible: form.watch('roleSpecificData.giftAidEligible') || false,
          donationFrequency: form.watch('roleSpecificData.donationFrequency') || 'One-time',
        };
      }

      const registrationData = {
        ...data,
        roleSpecificData,
      };

      await register(registrationData);
      
      toast({
        title: 'Registration successful',
        description: 'Your account has been created successfully',
      });
      
      // Redirect based on role
      if (data.role === 'Volunteer') {
        router.push('/volunteer/application-status');
      } else {
        router.push(`/${data.role.toLowerCase()}/dashboard`);
      }
      
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message || 'An error occurred during registration',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update role when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    form.setValue('role', value === 'visitor' ? 'Visitor' : value === 'volunteer' ? 'Volunteer' : 'Donor');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <img 
              src="/logo.svg" 
              alt="Lewisham Charity" 
              className="h-16" 
            />
          </Link>
        </div>
        
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
            <CardDescription className="text-center">
              Select your role and fill in your details to join Lewisham Charity
            </CardDescription>
          </CardHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent>
                <Tabs 
                  defaultValue={activeTab} 
                  value={activeTab} 
                  onValueChange={handleTabChange}
                  className="w-full mb-6"
                >
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="visitor">Visitor</TabsTrigger>
                    <TabsTrigger value="volunteer">Volunteer</TabsTrigger>
                    <TabsTrigger value="donor">Donor</TabsTrigger>
                  </TabsList>
                  
                  {/* Base Registration Fields for all roles */}
                  <div className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="john.doe@example.com" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input placeholder="••••••••" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="020 1234 5678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="col-span-1 md:col-span-2">
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Example St" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="postcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postcode</FormLabel>
                            <FormControl>
                              <Input placeholder="SE13 5AB" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="London" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Role-specific fields */}
                  <TabsContent value="visitor" className="space-y-4 mt-4">
                    <FormField
                      control={form.control}
                      name="roleSpecificData.householdSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Household Size</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" placeholder="1" {...ensureFieldValue(field)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="roleSpecificData.dietaryRequirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dietary Requirements</FormLabel>
                          <FormControl>
                            <Input placeholder="Vegetarian, allergies, etc." {...ensureFieldValue(field)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="roleSpecificData.accessibilityNeeds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Accessibility Needs</FormLabel>
                          <FormControl>
                            <Input placeholder="Wheelchair access, etc." {...ensureFieldValue(field)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="volunteer" className="space-y-4 mt-4">
                    <FormField
                      control={form.control}
                      name="roleSpecificData.skills"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skills</FormLabel>
                          <FormControl>
                            <Input placeholder="Driving, Admin, Counselling, etc." {...ensureFieldValue(field)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="roleSpecificData.experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experience</FormLabel>
                          <FormControl>
                            <Input placeholder="Any relevant experience" {...ensureFieldValue(field)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="roleSpecificData.availability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Availability</FormLabel>
                          <FormControl>
                            <Input placeholder="Weekdays, Weekends, etc." {...ensureFieldValue(field)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="donor" className="space-y-4 mt-4">
                    <FormField
                      control={form.control}
                      name="roleSpecificData.preferredDonationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Donation Type</FormLabel>
                          <FormControl>
                            <RadioGroup 
                              defaultValue={field.value || "Both"} 
                              onValueChange={field.onChange}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Money" id="money" />
                                <FormLabel htmlFor="money">Money</FormLabel>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Items" id="items" />
                                <FormLabel htmlFor="items">Items</FormLabel>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Both" id="both" />
                                <FormLabel htmlFor="both">Both</FormLabel>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="roleSpecificData.giftAidEligible"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                          <FormControl>
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300"
                              checked={field.value || false}
                              onChange={field.onChange}
                              id="giftAid"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel htmlFor="giftAid">I am eligible for Gift Aid</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
              
              <CardFooter className="flex flex-col">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
                <div className="mt-4 text-center text-sm">
                  Already have an account?{' '}
                  <Link 
                    href="/login" 
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}