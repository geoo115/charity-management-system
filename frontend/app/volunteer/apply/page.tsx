'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  UserPlus,
  Heart,
  Clock,
  CheckCircle,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

const formSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  address: z.string().min(10, 'Please enter your full address'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  emergencyContact: z.object({
    name: z.string().min(2, 'Emergency contact name is required'),
    relationship: z.string().min(2, 'Relationship is required'),
    phone: z.string().min(10, 'Emergency contact phone is required'),
  }),
  availability: z.array(z.string()).min(1, 'Please select at least one availability option'),
  skills: z.array(z.string()).min(1, 'Please select at least one skill area'),
  experience: z.string().min(50, 'Please provide more details about your experience'),
  motivation: z.string().min(100, 'Please provide more details about your motivation'),
  references: z.array(z.object({
    name: z.string().min(2, 'Reference name is required'),
    relationship: z.string().min(2, 'Relationship is required'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().min(10, 'Please enter a valid phone number'),
  })).min(2, 'Please provide at least 2 references'),
  agreements: z.object({
    backgroundCheck: z.boolean().refine(val => val === true, 'You must consent to a background check'),
    dataProcessing: z.boolean().refine(val => val === true, 'You must consent to data processing'),
    codeOfConduct: z.boolean().refine(val => val === true, 'You must agree to the code of conduct'),
  }),
});

const availabilityOptions = [
  { id: 'weekday_morning', label: 'Weekday Mornings (9am-1pm)' },
  { id: 'weekday_afternoon', label: 'Weekday Afternoons (1pm-5pm)' },
  { id: 'weekday_evening', label: 'Weekday Evenings (5pm-8pm)' },
  { id: 'weekend_morning', label: 'Weekend Mornings (9am-1pm)' },
  { id: 'weekend_afternoon', label: 'Weekend Afternoons (1pm-5pm)' },
  { id: 'weekend_evening', label: 'Weekend Evenings (5pm-8pm)' },
];

const skillAreas = [
  { id: 'food_distribution', label: 'Food Distribution & Packaging' },
  { id: 'customer_service', label: 'Customer Service & Reception' },
  { id: 'admin_support', label: 'Administrative Support' },
  { id: 'transport', label: 'Transport & Delivery' },
  { id: 'event_support', label: 'Event Support & Organization' },
  { id: 'fundraising', label: 'Fundraising & Community Outreach' },
  { id: 'it_support', label: 'IT & Digital Support' },
  { id: 'counseling', label: 'Counseling & Emotional Support' },
  { id: 'childcare', label: 'Childcare Support' },
  { id: 'translation', label: 'Translation Services' },
];

export default function VolunteerApplicationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      dateOfBirth: '',
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
      },
      availability: [],
      skills: [],
      experience: '',
      motivation: '',
      references: [
        { name: '', relationship: '', email: '', phone: '' },
        { name: '', relationship: '', email: '', phone: '' },
      ],
      agreements: {
        backgroundCheck: false,
        dataProcessing: false,
        codeOfConduct: false,
      },
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/volunteer/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to submit application');
      }

      const result = await response.json();
      
      toast({
        title: "Application Submitted",
        description: `Your volunteer application has been submitted successfully. Reference: ${result.reference}`,
      });
      
      router.push('/volunteer/application/success');
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your first name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your@email.com" {...field} />
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
                        <Input placeholder="07123 456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Full Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Your complete address including postcode" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <h4 className="font-semibold mb-4">Emergency Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="emergencyContact.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Emergency contact name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContact.relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Spouse, Parent, Friend" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContact.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="07123 456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Availability & Skills</h3>
              
              <FormField
                control={form.control}
                name="availability"
                render={() => (
                  <FormItem>
                    <FormLabel>When are you available to volunteer?</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {availabilityOptions.map((option) => (
                        <FormField
                          key={option.id}
                          control={form.control}
                          name="availability"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(option.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, option.id])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== option.id)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {option.label}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="skills"
                render={() => (
                  <FormItem>
                    <FormLabel>What skills and interests do you have?</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {skillAreas.map((skill) => (
                        <FormField
                          key={skill.id}
                          control={form.control}
                          name="skills"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(skill.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, skill.id])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== skill.id)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {skill.label}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Experience & Motivation</h3>
              
              <FormField
                control={form.control}
                name="experience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tell us about any relevant experience you have</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe any volunteer work, community involvement, or relevant skills you have..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="motivation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Why do you want to volunteer with us?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us what motivates you to volunteer and what you hope to achieve..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <h4 className="font-semibold mb-4">References</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Please provide 2 references who can speak to your character and reliability.
              </p>
              
              {[0, 1].map((index) => (
                <Card key={index} className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-base">Reference {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`references.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Reference name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`references.${index}.relationship`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relationship</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Former employer, Teacher" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`references.${index}.email`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="reference@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`references.${index}.phone`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="07123 456789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Agreements & Consent</h3>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="agreements.backgroundCheck"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Background Check Consent
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          I consent to a background check being carried out as part of the volunteer screening process.
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agreements.dataProcessing"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Data Processing Consent
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          I consent to my personal data being processed in accordance with the Privacy Policy for volunteer management purposes.
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agreements.codeOfConduct"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Code of Conduct Agreement
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          I agree to abide by the volunteer code of conduct and organizational policies.
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900">Ready to Submit</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      Please review all the information you&apos;ve provided and submit your application. 
                      We&apos;ll review your application and get back to you within 5-7 business days.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <UserPlus className="h-8 w-8 mr-3 text-primary" />
            Volunteer Application
          </h1>
          <p className="text-muted-foreground mt-2">
            Join our team and make a difference in your community
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-muted-foreground">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>
                {currentStep === 1 && "Personal Information"}
                {currentStep === 2 && "Availability & Skills"}
                {currentStep === 3 && "Experience & References"}
                {currentStep === 4 && "Final Steps"}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && "Tell us about yourself and provide emergency contact details"}
                {currentStep === 2 && "Let us know when you're available and what interests you"}
                {currentStep === 3 && "Share your experience and provide references"}
                {currentStep === 4 && "Review and agree to our terms"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderStepContent()}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            {currentStep < totalSteps ? (
              <Button type="button" onClick={nextStep}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={loading}>
                {loading ? (
                  'Submitting...'
                ) : (
                  <>
                    <Heart className="h-4 w-4 mr-2" />
                    Submit Application
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
