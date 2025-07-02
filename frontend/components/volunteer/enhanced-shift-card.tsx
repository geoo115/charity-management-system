'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Star, 
  Heart,
  Zap,
  CheckCircle,
  User,
  Eye,
  UserPlus,
  Bookmark,
  BookmarkCheck,
  Share2,
  MessageSquare,
  AlertTriangle,
  Award,
  Shield,
  Globe
} from 'lucide-react';
import { VolunteerShift } from '@/lib/types/volunteer';
import { formatDate, formatTime } from '@/lib/utils/date-utils';
import Link from 'next/link';

interface EnhancedShiftCardProps {
  shift: VolunteerShift;
  onSignUp?: (shiftId: number) => void;
  onBookmark?: (shiftId: number) => void;
  isBookmarked?: boolean;
  showActions?: boolean;
  compact?: boolean;
  showCoordinator?: boolean;
  userStatus?: 'available' | 'signed_up' | 'ineligible' | 'conflicted';
  className?: string;
}

export default function EnhancedShiftCard({
  shift,
  onSignUp,
  onBookmark,
  isBookmarked = false,
  showActions = true,
  compact = false,
  showCoordinator = false,
  userStatus = 'available',
  className = ''
}: EnhancedShiftCardProps) {
  const [signingUp, setSigningUp] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  const handleSignUp = async () => {
    if (!onSignUp || signingUp) return;
    setSigningUp(true);
    try {
      await onSignUp(shift.id);
    } finally {
      setSigningUp(false);
    }
  };

  const handleBookmark = async () => {
    if (!onBookmark || bookmarking) return;
    setBookmarking(true);
    try {
      await onBookmark(shift.id);
    } finally {
      setBookmarking(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: shift.title,
        text: `Check out this volunteer opportunity: ${shift.title}`,
        url: `${window.location.origin}/volunteer/shifts/${shift.id}`,
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/volunteer/shifts/${shift.id}`);
    }
  };

  // Calculate enrollment percentage
  const enrollmentPercentage = (shift.enrolled / shift.capacity) * 100;
  const spotsLeft = shift.capacity - shift.enrolled;

  // Get priority styling
  const getPriorityBadge = () => {
    const shiftData = shift as any;
    switch (shiftData.priority) {
      case 'urgent':
        return <Badge variant="destructive" className="animate-pulse"><Zap className="h-3 w-3 mr-1" />Urgent</Badge>;
      case 'high':
        return <Badge variant="secondary" className="bg-orange-500 text-white"><Star className="h-3 w-3 mr-1" />High Priority</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    switch (userStatus) {
      case 'signed_up':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Signed Up</Badge>;
      case 'ineligible':
        return <Badge variant="destructive">Ineligible</Badge>;
      case 'conflicted':
        return <Badge variant="secondary" className="bg-yellow-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Conflict</Badge>;
      default:
        return null;
    }
  };

  const getFlexibleShiftBadge = () => {
    const shiftData = shift as any;
    if (shiftData.type === 'flexible') {
      return <Badge variant="outline" className="border-blue-500 text-blue-600"><Clock className="h-3 w-3 mr-1" />Flexible Hours</Badge>;
    }
    return null;
  };

  const getTimeDisplay = () => {
    const shiftData = shift as any;
    if (shiftData.type === 'flexible') {
      const minHours = shiftData.minimumHours || 2;
      const maxHours = shiftData.maximumHours || 8;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Available: {shift.startTime} - {shift.endTime}</span>
          </div>
          <div className="text-sm text-muted-foreground ml-5">
            Choose {minHours}-{maxHours} hours within this window
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4" />
        <span>{shift.startTime} - {shift.endTime}</span>
      </div>
    );
  };

  const getAvailabilityColor = () => {
    if (spotsLeft === 0) return 'text-red-500';
    if (spotsLeft <= 2) return 'text-orange-500';
    return 'text-green-500';
  };

  const getCardBorder = () => {
    const shiftData = shift as any;
    if (shiftData.priority === 'urgent') return 'border-l-4 border-l-red-500';
    if (shiftData.priority === 'high') return 'border-l-4 border-l-orange-500';
    if (userStatus === 'signed_up') return 'border-l-4 border-l-green-500';
    return '';
  };

  if (compact) {
    return (
      <Card className={`hover:shadow-md transition-all duration-200 ${getCardBorder()} ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-2">
                <h3 className="font-semibold text-sm truncate">{shift.title}</h3>
                {getPriorityBadge()}
                {getFlexibleShiftBadge()}
                {getStatusBadge()}
              </div>
              
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(shift.date)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {(shift as any).type === 'flexible' ? 
                    `${shift.startTime}-${shift.endTime} (flexible)` : 
                    `${shift.startTime} - ${shift.endTime}`
                  }
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {shift.location}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <Progress value={enrollmentPercentage} className="flex-1 h-1" />
                <span className={`text-xs font-medium ${getAvailabilityColor()}`}>
                  {spotsLeft} left
                </span>
              </div>
            </div>

            {showActions && (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/volunteer/shifts/${shift.id}`}>
                    <Eye className="h-3 w-3" />
                  </Link>
                </Button>
                
                {userStatus === 'available' && onSignUp && (
                  <Button 
                    size="sm" 
                    onClick={handleSignUp}
                    disabled={signingUp || spotsLeft === 0}
                  >
                    <UserPlus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-lg transition-all duration-300 ${getCardBorder()} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <h3 className="font-semibold text-lg leading-tight">{shift.title}</h3>
              {getPriorityBadge()}
              {getFlexibleShiftBadge()}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{shift.role}</p>
            
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge()}
              <Badge variant="outline" className="text-xs">
                {shift.status}
              </Badge>
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-1">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleBookmark}
                disabled={bookmarking}
                className={isBookmarked ? 'text-yellow-500' : ''}
              >
                {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Time and Location Info */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm">{formatDate(shift.date)}</p>
              <p className="text-xs text-muted-foreground">Date</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
              <Clock className="h-4 w-4 text-green-600" />
            </div>
            <div>
              {(shift as any).type === 'flexible' ? (
                <div>
                  <p className="font-medium text-sm">{shift.startTime} - {shift.endTime}</p>
                  <p className="text-xs text-muted-foreground">
                    Choose {(shift as any).minimumHours || 2}-{(shift as any).maximumHours || 8} hours
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-sm">{shift.startTime} - {shift.endTime}</p>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const start = new Date(`2000-01-01T${shift.startTime}`);
                      const end = new Date(`2000-01-01T${shift.endTime}`);
                      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                      return `${hours} hours`;
                    })()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">
              <MapPin className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-sm">{shift.location}</p>
              <p className="text-xs text-muted-foreground">Location</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-sm">{shift.enrolled} / {shift.capacity}</p>
              <p className="text-xs text-muted-foreground">Volunteers</p>
            </div>
          </div>
        </div>

        {/* Enrollment Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Volunteer Progress</span>
            <span className={`font-medium ${getAvailabilityColor()}`}>
              {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
            </span>
          </div>
          <Progress value={enrollmentPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(enrollmentPercentage)}% filled</span>
            <span>{shift.capacity} total</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-sm text-muted-foreground line-clamp-2">{shift.description}</p>
        </div>

        {/* Skills and Requirements */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {(shift as any).skills?.slice(0, 3).map((skill: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {(shift as any).skills?.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{(shift as any).skills.length - 3} more
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {(shift as any).backgroundCheckRequired && (
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Background check
              </div>
            )}
            {(shift as any).remote && (
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Remote option
              </div>
            )}
          </div>
        </div>

        {/* Coordinator */}
        {showCoordinator && (shift as any).coordinator && (
          <>
            <Separator />
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={(shift as any).coordinator.avatar} />
                <AvatarFallback>
                  {(shift as any).coordinator.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{(shift as any).coordinator.name}</p>
                <p className="text-xs text-muted-foreground">Shift Coordinator</p>
              </div>
            </div>
          </>
        )}

        {/* Impact */}
        {(shift as any).impactDescription && (
          <div className="bg-blue-50 p-3 rounded-lg border">
            <div className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Your Impact</p>
                <p className="text-xs text-blue-700 mt-1">{(shift as any).impactDescription}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/volunteer/shifts/${shift.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </Button>

            {userStatus === 'available' && onSignUp && (
              <Button 
                onClick={handleSignUp}
                disabled={signingUp || spotsLeft === 0}
                className="flex-1"
              >
                {signingUp ? (
                  'Signing Up...'
                ) : spotsLeft === 0 ? (
                  'Full'
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Sign Up
                  </>
                )}
              </Button>
            )}

            {userStatus === 'signed_up' && (
              <Button variant="default" className="flex-1" disabled>
                <CheckCircle className="h-4 w-4 mr-2" />
                Signed Up
              </Button>
            )}

            {userStatus === 'conflicted' && (
              <Button variant="secondary" className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" />
                Resolve Conflict
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
