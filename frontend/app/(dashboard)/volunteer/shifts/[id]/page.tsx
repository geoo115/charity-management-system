'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';

import {
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Star,
  ArrowLeft,
  Share2,
  Heart,
  Zap,
  Target,
  Info,
  Calendar as CalendarIcon,
  Globe,
  Briefcase,
  Award,
  MessageSquare,
  Navigation,
  FileText,
  Shield
} from 'lucide-react';

import { VolunteerShift } from '@/lib/types/volunteer';
import { formatDate, formatTime } from '@/lib/utils/date-utils';
import { 
  fetchShiftDetails, 
  signupForShift, 
  validateShiftAvailability, 
  cancelShift 
} from '@/lib/api/volunteer';
import FlexibleShiftSignupDialog from '@/components/volunteer/flexible-shift-signup-dialog';

interface ShiftDetails extends Omit<VolunteerShift, 'coordinator'> {
  coordinator?: {
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  requirements?: string[];
  benefits?: string[];
  equipment?: string[];
  notes?: string;
  directions?: string;
  parkingInfo?: string;
  accessibility?: string;
  emergencyContact?: {
    name: string;
    phone: string;
  };
  relatedShifts?: VolunteerShift[];
  impactDescription?: string;
  skillsRequired?: string[];
  skillsPreferred?: string[];
  minimumAge?: number;
  physicalRequirements?: string[];
  backgroundCheckRequired?: boolean;
  mealProvided?: boolean;
  transportationProvided?: boolean;
}

export default function ShiftDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [shift, setShift] = useState<ShiftDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [userStatus, setUserStatus] = useState<'available' | 'signed_up' | 'ineligible'>('available');
  const [showFlexibleDialog, setShowFlexibleDialog] = useState(false);

  const shiftId = params.id as string;

  useEffect(() => {
    const loadShiftDetails = async () => {
      try {
        setLoading(true);
        
        // Load shift details from API
        const shiftData = await fetchShiftDetails(shiftId) as ShiftDetails;
        setShift(shiftData);
        
        // Check user's status for this shift
        const validationResult = await validateShiftAvailability(parseInt(shiftId)) as any;
        if (validationResult?.available) {
          setUserStatus('available');
        } else if (validationResult?.reason?.includes('already signed up')) {
          setUserStatus('signed_up');
        } else {
          setUserStatus('ineligible');
        }
        
      } catch (err: any) {
        setError(err.message || 'Failed to load shift details');
        setShift(null);
      } finally {
        setLoading(false);
      }
    };

    if (shiftId) {
      loadShiftDetails();
    }
  }, [shiftId]);

  const handleSignUp = async () => {
    if (!shift) return;
    
    // Check if this is a flexible shift
    if ((shift as any).type === 'flexible') {
      setShowFlexibleDialog(true);
      return;
    }
    
    setActionLoading(true);
    try {
      await signupForShift(shift.id);
      setUserStatus('signed_up');
      toast({
        title: 'Success!',
        description: 'You have successfully signed up for this shift.',
      });
    } catch (err: any) {
      toast({
        title: 'Sign-up Failed',
        description: err.message || 'Failed to sign up for shift',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFlexibleShiftSignup = async (shiftId: number, timeSelection: {
    startTime: string;
    endTime: string;
    duration: number;
  }) => {
    try {
      await signupForShift(shiftId, timeSelection);
      setUserStatus('signed_up');
      toast({
        title: 'Success!',
        description: `You've signed up for ${timeSelection.duration} hours from ${timeSelection.startTime} to ${timeSelection.endTime}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Sign-up Failed',
        description: err.message || 'Failed to sign up for flexible shift',
        variant: 'destructive'
      });
      throw err; // Re-throw to let dialog handle the error state
    }
  };

  const handleCancel = async () => {
    if (!shift) return;
    
    const confirmCancel = window.confirm('Are you sure you want to cancel your participation in this shift?');
    if (!confirmCancel) return;
    
    setActionLoading(true);
    try {
      await cancelShift(shift.id);
      setUserStatus('available');
      toast({
        title: 'Cancelled',
        description: 'You have successfully cancelled your participation.',
      });
    } catch (err: any) {
      toast({
        title: 'Cancellation Failed',
        description: err.message || 'Failed to cancel shift',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: shift?.title,
        text: `Check out this volunteer opportunity: ${shift?.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link Copied',
        description: 'Share link copied to clipboard',
      });
    }
  };

  const getStatusBadge = () => {
    switch (userStatus) {
      case 'signed_up':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Signed Up</Badge>;
      case 'ineligible':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Ineligible</Badge>;
      default:
        return <Badge variant="outline"><CalendarIcon className="h-3 w-3 mr-1" />Available</Badge>;
    }
  };

  const getPriorityBadge = () => {
    switch (shift?.priority) {
      case 'urgent':
        return <Badge variant="destructive" className="animate-pulse"><Zap className="h-3 w-3 mr-1" />Urgent</Badge>;
      case 'high':
        return <Badge variant="secondary" className="bg-orange-500 text-white"><Star className="h-3 w-3 mr-1" />High Priority</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading shift details..." />;
  }

  if (error && !shift) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>Shift not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const enrollmentPercentage = (shift.enrolled / shift.capacity) * 100;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{shift.title}</h1>
          <p className="text-muted-foreground">{shift.role}</p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {getPriorityBadge()}
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">{formatDate(shift.date)}</p>
                    <p className="text-sm text-muted-foreground">Date</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">{shift.startTime} - {shift.endTime}</p>
                    <p className="text-sm text-muted-foreground">Duration</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium">{shift.location}</p>
                    <p className="text-sm text-muted-foreground">Location</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-medium">{shift.enrolled} / {shift.capacity} volunteers</p>
                    <p className="text-sm text-muted-foreground">Enrollment</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Enrollment Progress</span>
                  <span>{Math.round(enrollmentPercentage)}%</span>
                </div>
                <Progress value={enrollmentPercentage} className="h-2" />
              </div>

              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-muted-foreground">{shift.description}</p>
              </div>

              {shift.impactDescription && (
                <>
                  <Separator />
                  <div className="bg-blue-50 p-4 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <Heart className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Your Impact</h4>
                        <p className="text-blue-700 text-sm mt-1">{shift.impactDescription}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Requirements & Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Requirements & Skills
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {shift.requirements && (
                <div>
                  <h4 className="font-medium mb-2">Requirements</h4>
                  <ul className="space-y-1">
                    {shift.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {shift.skillsRequired && shift.skillsRequired.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">Required Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {shift.skillsRequired.map((skill, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {shift.skillsPreferred && shift.skillsPreferred.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-blue-600">Preferred Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {shift.skillsPreferred.map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {shift.physicalRequirements && shift.physicalRequirements.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Physical Requirements</h4>
                  <ul className="space-y-1">
                    {shift.physicalRequirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Shield className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* What to Bring & Logistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                What to Bring & Logistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {shift.equipment && (
                <div>
                  <h4 className="font-medium mb-2">What to Bring</h4>
                  <ul className="space-y-1">
                    {shift.equipment.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">{shift.mealProvided ? 'Meal included' : 'Bring snacks'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">{shift.transportationProvided ? 'Transport provided' : 'Own transport'}</span>
                </div>
              </div>

              {shift.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Important Notes</h4>
                    <p className="text-sm text-muted-foreground">{shift.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Location & Directions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location & Directions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {shift.directions && (
                  <div>
                    <h4 className="font-medium mb-1">Directions</h4>
                    <p className="text-sm text-muted-foreground">{shift.directions}</p>
                  </div>
                )}
                
                {shift.parkingInfo && (
                  <div>
                    <h4 className="font-medium mb-1">Parking Information</h4>
                    <p className="text-sm text-muted-foreground">{shift.parkingInfo}</p>
                  </div>
                )}
                
                {shift.accessibility && (
                  <div>
                    <h4 className="font-medium mb-1">Accessibility</h4>
                    <p className="text-sm text-muted-foreground">{shift.accessibility}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Card */}
          <Card>
            <CardHeader>
              <CardTitle>Take Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {userStatus === 'available' && (
                <Button 
                  onClick={handleSignUp} 
                  disabled={actionLoading}
                  className="w-full"
                  size="lg"
                >
                  {actionLoading ? 'Signing Up...' : 'Sign Up for This Shift'}
                </Button>
              )}
              
              {userStatus === 'signed_up' && (
                <div className="space-y-3">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      You&apos;re signed up for this shift! Check your email for confirmation details.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    variant="outline" 
                    onClick={handleCancel} 
                    disabled={actionLoading}
                    className="w-full"
                  >
                    {actionLoading ? 'Cancelling...' : 'Cancel My Participation'}
                  </Button>
                </div>
              )}
              
              {userStatus === 'ineligible' && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    You&apos;re not eligible for this shift. Check the requirements or contact support.
                  </AlertDescription>
                </Alert>
              )}

              <Button variant="outline" className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Ask a Question
              </Button>
            </CardContent>
          </Card>

          {/* Coordinator Card */}
          {shift.coordinator && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Shift Coordinator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarImage src={shift.coordinator.avatar} />
                    <AvatarFallback>{shift.coordinator.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{shift.coordinator.name}</p>
                    <div className="space-y-1 mt-2">
                      <a href={`mailto:${shift.coordinator.email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                        <Mail className="h-3 w-3" />
                        {shift.coordinator.email}
                      </a>
                      {shift.coordinator.phone && (
                        <a href={`tel:${shift.coordinator.phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                          <Phone className="h-3 w-3" />
                          {shift.coordinator.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benefits Card */}
          {shift.benefits && shift.benefits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  What You&apos;ll Gain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {shift.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Emergency Contact */}
          {shift.emergencyContact && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{shift.emergencyContact.name}</p>
                  <a href={`tel:${shift.emergencyContact.phone}`} className="flex items-center gap-2 text-sm text-red-600 hover:underline">
                    <Phone className="h-3 w-3" />
                    {shift.emergencyContact.phone}
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Flexible Shift Signup Dialog */}
      <FlexibleShiftSignupDialog
        shift={shift}
        open={showFlexibleDialog}
        onClose={() => setShowFlexibleDialog(false)}
        onConfirm={handleFlexibleShiftSignup}
      />
    </div>
  );
}
