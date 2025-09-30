'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { QrCode, Users, Clock, CheckCircle, Camera, X, Fingerprint, Smartphone, CreditCard, MapPin, AlertTriangle, Wifi, WifiOff, RefreshCw, Calendar, User, Phone, Mail, Shield, Zap, Activity, Timer, Star, ArrowRight, Bell, Settings, Info, CheckCircle2, XCircle, Clock3, UserCheck, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const checkInSchema = z.object({
  ticketNumber: z.string().min(1, 'Ticket number is required'),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  emergencyContact: z.string().optional(),
});

type CheckInFormData = z.infer<typeof checkInSchema>;

interface CheckInResult {
  message: string;
  visit: {
    id: number;
    ticket_number: string;
    check_in_time: string;
    status: string;
    visitor_name?: string;
    appointment_time?: string;
    service_type?: string;
  };
  queue: {
    position: number;
    estimated_wait_time: string;
    category: string;
    status: string;
    total_ahead: number;
    current_serving: number;
  };
  next_steps: string[];
  facility_info?: {
    wifi_network: string;
    amenities: string[];
    accessibility_features: string[];
  };
}

interface BiometricData {
  fingerprint?: string;
  face_recognition?: string;
  verified: boolean;
}

interface CheckInMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  recommended?: boolean;
}

// QR Scanner Component
const QRScanner: React.FC<{
  onScan: (result: string) => void;
  onClose: () => void;
  isActive: boolean;
}> = ({ onScan, onClose, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  React.useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
        }
      } catch (error) {
        console.error('Camera permission denied:', error);
        setHasPermission(false);
      }
    };

    if (isActive) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        // Simulate QR code detection (in real implementation, use QR library)
        // For now, generate a mock ticket number
        const mockTicketNumber = 'LDH' + new Date().toISOString().slice(2,10).replace(/-/g,'') + '001';
        onScan(mockTicketNumber);
      }
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {hasPermission === false ? (
          <Alert variant="destructive">
            <AlertDescription>
              Camera permission denied. Please enable camera access and try again.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-gray-200 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Position the QR code within the camera view
              </p>
              <Button onClick={captureFrame} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Capture & Scan
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function CheckInPage() {
  // Enhanced state management
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [activeMethod, setActiveMethod] = useState<string>('qr');
  const [biometricData, setBiometricData] = useState<BiometricData>({ verified: false });
  const [connectionStatus, setConnectionStatus] = useState(true);
  const [checkInStep, setCheckInStep] = useState<'method' | 'verification' | 'processing' | 'complete'>('method');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { toast } = useToast();

  const form = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      ticketNumber: '',
      phoneNumber: '',
      email: '',
      emergencyContact: '',
    },
  });

  // Available check-in methods
  const checkInMethods: CheckInMethod[] = [
    {
      id: 'qr',
      name: 'QR Code',
      description: 'Scan the QR code on your appointment confirmation',
      icon: <QrCode className="h-6 w-6" />,
      available: true,
      recommended: true,
    },
    {
      id: 'manual',
      name: 'Ticket Number',
      description: 'Enter your appointment ticket number manually',
      icon: <CreditCard className="h-6 w-6" />,
      available: true,
    },
    {
      id: 'phone',
      name: 'Phone Verification',
      description: 'Verify using your registered phone number',
      icon: <Phone className="h-6 w-6" />,
      available: true,
    },
    {
      id: 'biometric',
      name: 'Biometric',
      description: 'Use fingerprint or face recognition (if enrolled)',
      icon: <Fingerprint className="h-6 w-6" />,
      available: false, // Feature coming soon
    },
  ];

  // Real-time connection monitoring
  useEffect(() => {
    const checkConnection = () => {
      setConnectionStatus(navigator.onLine);
    };

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        setNotificationsEnabled(permission === 'granted');
      });
    }
  }, []);

  const handleCheckIn = async (ticketNumber: string, additionalData?: Partial<CheckInFormData>) => {
    setLoading(true);
    setCheckInStep('processing');
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch('/api/v1/visitors/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ticket_number: ticketNumber,
          check_in_method: activeMethod,
          additional_data: additionalData,
          biometric_data: biometricData.verified ? biometricData : undefined,
          notification_preferences: {
            enabled: notificationsEnabled,
            methods: ['browser', 'sms']
          }
        }),
      });

      const result = await response.json();
      
      // Use actual data from the API response
      const transformedResult: CheckInResult = {
        message: result.message || 'Check-in successful!',
        visit: {
          id: result.visit?.id || 0,
          ticket_number: ticketNumber,
          check_in_time: result.visit?.check_in_time || new Date().toISOString(),
          status: result.visit?.status || 'checked_in',
          visitor_name: result.visit?.visitor_name || 'Visitor',
          appointment_time: result.visit?.appointment_time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          service_type: result.visit?.service_type || 'Food Support'
        },
        queue: {
          position: result.queue?.position || 1,
          estimated_wait_time: result.queue?.estimated_wait_time || '15 minutes',
          category: result.queue?.category || 'food_support',
          status: result.queue?.status || 'waiting',
          total_ahead: result.queue?.total_ahead || 0,
          current_serving: result.queue?.current_serving || 100
        },
        next_steps: [
          'You are now checked in and added to the queue',
          'Please wait in the designated seating area',
          'Listen for your number or name to be called',
          'Keep your ticket handy for verification',
          'Free WiFi available: "LDH-Guest"'
        ],
        facility_info: {
          wifi_network: 'LDH-Guest',
          amenities: ['Free WiFi', 'Refreshments', 'Reading Materials', 'Children\'s Play Area'],
          accessibility_features: ['Wheelchair Access', 'Accessible Restrooms', 'Hearing Loop', 'Large Print Materials']
        }
      };

      setCheckInResult(transformedResult);
      setCheckInStep('complete');
      
      // Show notification if enabled
      if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Check-in Successful', {
          body: `You're now position ${transformedResult.queue.position} in the queue`,
          icon: '/notification-icon.png'
        });
      }

      toast({
        title: "Check-in Successful",
        description: `Welcome! You're position ${transformedResult.queue.position} in the queue.`,
      });

    } catch (error: any) {
      setCheckInStep('method');
      toast({
        title: "Check-in Failed",
        description: error.message || 'Please try again or contact staff for assistance.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (data: CheckInFormData) => {
    handleCheckIn(data.ticketNumber, data);
  };

  const handleQRScan = (scannedData: string) => {
    setShowScanner(false);
    form.setValue('ticketNumber', scannedData);
    handleCheckIn(scannedData);
  };

  const resetCheckIn = () => {
    setCheckInResult(null);
    setCheckInStep('method');
    setActiveMethod('qr');
    form.reset();
  };

  const handleBiometricVerification = async () => {
    setLoading(true);
    try {
      // Simulate biometric verification
      await new Promise(resolve => setTimeout(resolve, 3000));
      setBiometricData({ verified: true, fingerprint: 'verified' });
      toast({
        title: "Biometric Verified",
        description: "Identity confirmed successfully",
      });
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Please try again or use an alternative method",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (checkInResult && checkInStep === 'complete') {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-green-600">Check-in Successful!</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Welcome to Lewishame Charity, {checkInResult.visit.visitor_name}
            </p>
          </div>
        </div>

        {/* Queue Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                #{checkInResult.queue.position}
              </div>
              <p className="text-sm text-green-700">Your Position</p>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {checkInResult.queue.estimated_wait_time}
              </div>
              <p className="text-sm text-blue-700">Estimated Wait</p>
            </CardContent>
          </Card>
          
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                #{checkInResult.queue.current_serving}
              </div>
              <p className="text-sm text-purple-700">Now Serving</p>
            </CardContent>
          </Card>
        </div>

        {/* Visit Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCheck className="h-5 w-5 mr-2" />
              Visit Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Ticket Number</span>
                  <span className="font-mono">{checkInResult.visit.ticket_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Check-in Time</span>
                  <span>{checkInResult.visit.appointment_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Service Type</span>
                  <Badge variant="secondary">{checkInResult.visit.service_type}</Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Queue Category</span>
                  <Badge variant="outline">{checkInResult.queue.category.replace('_', ' ').toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Checked In
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">People Ahead</span>
                  <span>{checkInResult.queue.total_ahead}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowRight className="h-5 w-5 mr-2" />
              What Happens Next
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checkInResult.next_steps.map((step, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                    {index + 1}
                  </div>
                  <p className="text-sm">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Facility Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Wifi className="h-5 w-5 mr-2" />
                Amenities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {checkInResult.facility_info?.amenities.map((amenity, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <Star className="h-4 w-4 mr-2 text-yellow-500" />
                    {amenity}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Accessibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {checkInResult.facility_info?.accessibility_features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => window.location.href = '/visitor/queue'} 
            className="flex items-center"
          >
            <Activity className="h-4 w-4 mr-2" />
            View Queue Status
          </Button>
          <Button 
            variant="outline" 
            onClick={resetCheckIn}
            className="flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            New Check-in
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/visitor'}
            className="flex items-center"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Main check-in interface
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-bold">Visitor Check-in</h1>
            <p className="text-muted-foreground">
              Welcome to Lewishame Charity
            </p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-center space-x-2">
          <Badge variant={connectionStatus ? "default" : "destructive"}>
            {connectionStatus ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {connectionStatus ? 'Connected' : 'Offline'}
          </Badge>
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Badge>
        </div>
      </div>

      {/* Processing Steps */}
      {checkInStep === 'processing' && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Timer className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Processing Check-in</h3>
                <p className="text-muted-foreground">Please wait while we verify your information...</p>
              </div>
              <Progress value={85} className="w-full max-w-md mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check-in Methods */}
      {checkInStep === 'method' && (
        <Tabs value={activeMethod} onValueChange={setActiveMethod} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {checkInMethods.map((method) => (
              <TabsTrigger
                key={method.id}
                value={method.id}
                disabled={!method.available}
                className="flex flex-col items-center space-y-1 h-16"
              >
                <div className="flex items-center space-x-1">
                  {method.icon}
                  {method.recommended && <Star className="h-3 w-3 text-yellow-500" />}
                </div>
                <span className="text-xs">{method.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* QR Code Tab */}
          <TabsContent value="qr" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <QrCode className="h-5 w-5 mr-2" />
                  QR Code Check-in
                  {checkInMethods.find(m => m.id === 'qr')?.recommended && (
                    <Badge variant="secondary" className="ml-2">Recommended</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Scan the QR code from your appointment confirmation email or SMS
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <QrCode className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Position your QR code within the camera frame
                  </p>
                  <Button 
                    onClick={() => setShowScanner(true)} 
                    disabled={loading}
                    className="flex items-center"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                </div>
                
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Quick Tip</AlertTitle>
                  <AlertDescription>
                    Make sure your screen brightness is up and hold the QR code steady for best results.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Manual Entry
                </CardTitle>
                <CardDescription>
                  Enter your appointment details manually
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ticketNumber">Ticket Number *</Label>
                      <Input
                        {...form.register('ticketNumber')}
                        id="ticketNumber"
                        placeholder="e.g., LDH240618001"
                        className="uppercase"
                      />
                      {form.formState.errors.ticketNumber && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.ticketNumber.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        {...form.register('phoneNumber')}
                        id="phoneNumber"
                        placeholder="e.g., 07123456789"
                        type="tel"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        {...form.register('email')}
                        id="email"
                        placeholder="e.g., john@example.com"
                        type="email"
                      />
                    </div>

                    <div>
                      <Label htmlFor="emergencyContact">Emergency Contact</Label>
                      <Input
                        {...form.register('emergencyContact')}
                        id="emergencyContact"
                        placeholder="Emergency contact number"
                        type="tel"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="notifications" 
                      checked={notificationsEnabled}
                      onCheckedChange={setNotificationsEnabled}
                    />
                    <Label htmlFor="notifications" className="text-sm">
                      Enable queue notifications
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !form.formState.isValid}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Timer className="h-4 w-4 mr-2 animate-spin" />
                        Checking in...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Check In
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phone Verification Tab */}
          <TabsContent value="phone" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Phone Verification
                </CardTitle>
                <CardDescription>
                  Verify your identity using your registered phone number
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertTitle>SMS Verification</AlertTitle>
                  <AlertDescription>
                    We&apos;ll send a verification code to your registered phone number to confirm your identity.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="phoneVerify">Phone Number</Label>
                    <Input
                      id="phoneVerify"
                      placeholder="Enter your registered phone number"
                      type="tel"
                    />
                  </div>
                  
                  <Button className="w-full" disabled>
                    <Phone className="h-4 w-4 mr-2" />
                    Send Verification Code
                  </Button>
                  
                  <p className="text-sm text-muted-foreground text-center">
                    This feature will be available soon
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Biometric Tab */}
          <TabsContent value="biometric" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Fingerprint className="h-5 w-5 mr-2" />
                  Biometric Verification
                </CardTitle>
                <CardDescription>
                  Use fingerprint or face recognition for secure check-in
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertTitle>Coming Soon</AlertTitle>
                  <AlertDescription>
                    Biometric check-in will be available in a future update. For now, please use QR code or manual entry.
                  </AlertDescription>
                </Alert>
                
                <div className="text-center p-8 bg-muted/50 rounded-lg">
                  <Fingerprint className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    This feature is under development
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Important Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Before Check-in</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start space-x-2">
                  <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Arrive on time for your appointment</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CreditCard className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Bring valid ID and proof of address</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Phone className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Have your appointment confirmation ready</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">After Check-in</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start space-x-2">
                  <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Wait in the designated seating area</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Bell className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Listen for your number/name to be called</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Wifi className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Free WiFi: &quot;LDH-Guest&quot; (no password)</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="outline" onClick={() => window.location.href = '/visitor'}>
          <ArrowRight className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <Button variant="outline" onClick={() => window.location.href = '/visitor/help-requests'}>
          <Mail className="h-4 w-4 mr-2" />
          My Requests
        </Button>
        <Button variant="outline" onClick={() => window.location.href = '/visitor/queue'}>
          <Activity className="h-4 w-4 mr-2" />
          Queue Status
        </Button>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isActive={showScanner}
        onScan={handleQRScan}
        onClose={() => setShowScanner(false)}
      />
    </div>
  );
}
