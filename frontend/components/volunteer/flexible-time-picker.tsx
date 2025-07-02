'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  Timer,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlexibleTimePickerProps {
  shiftId: number;
  shiftTitle: string;
  shiftDate: string;
  availableTimeRange: {
    start: string; // e.g., "09:00"
    end: string;   // e.g., "17:00"
  };
  minimumHours?: number;
  maximumHours?: number;
  onTimeSelection: (selection: {
    startTime: string;
    endTime: string;
    duration: number;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

interface TimeSlot {
  hour: number;
  minute: number;
  display: string;
  value: string;
}

export default function FlexibleTimePicker({
  shiftId,
  shiftTitle,
  shiftDate,
  availableTimeRange,
  minimumHours = 2,
  maximumHours = 8,
  onTimeSelection,
  onCancel,
  loading = false
}: FlexibleTimePickerProps) {
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Generate time slots in 30-minute intervals
  useEffect(() => {
    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = availableTimeRange.start.split(':').map(Number);
    const [endHour, endMinute] = availableTimeRange.end.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMinute = startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    while (currentHour * 60 + currentMinute <= endTotalMinutes) {
      const display = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      slots.push({
        hour: currentHour,
        minute: currentMinute,
        display,
        value: display
      });
      
      // Increment by 30 minutes
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour++;
      }
    }
    
    setTimeSlots(slots);
  }, [availableTimeRange]);

  // Calculate duration when times change
  useEffect(() => {
    if (selectedStartTime && selectedEndTime) {
      const [startHour, startMinute] = selectedStartTime.split(':').map(Number);
      const [endHour, endMinute] = selectedEndTime.split(':').map(Number);
      
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      
      if (endTotalMinutes <= startTotalMinutes) {
        setError('End time must be after start time');
        setDuration(0);
        return;
      }
      
      const durationMinutes = endTotalMinutes - startTotalMinutes;
      const durationHours = durationMinutes / 60;
      
      if (durationHours < minimumHours) {
        setError(`Minimum commitment is ${minimumHours} hours`);
      } else if (durationHours > maximumHours) {
        setError(`Maximum commitment is ${maximumHours} hours`);
      } else {
        setError('');
      }
      
      setDuration(durationHours);
    } else {
      setDuration(0);
      setError('');
    }
  }, [selectedStartTime, selectedEndTime, minimumHours, maximumHours]);

  // Get available end times based on selected start time
  const getAvailableEndTimes = () => {
    if (!selectedStartTime) return [];
    
    const [startHour, startMinute] = selectedStartTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    
    return timeSlots.filter(slot => {
      const slotTotalMinutes = slot.hour * 60 + slot.minute;
      const durationMinutes = slotTotalMinutes - startTotalMinutes;
      const durationHours = durationMinutes / 60;
      
      return slotTotalMinutes > startTotalMinutes && 
             durationHours >= minimumHours && 
             durationHours <= maximumHours;
    });
  };

  const handleConfirm = () => {
    if (!selectedStartTime || !selectedEndTime || error || duration === 0) {
      return;
    }
    
    onTimeSelection({
      startTime: selectedStartTime,
      endTime: selectedEndTime,
      duration
    });
  };

  const formatDuration = (hours: number) => {
    if (hours === 0) return '';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (minutes === 0) {
      return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
    } else {
      return `${wholeHours}h ${minutes}m`;
    }
  };

  const getQuickSelections = () => {
    const selections = [];
    
    // Generate common time blocks
    const commonBlocks = [
      { hours: 2, label: '2 hours' },
      { hours: 3, label: '3 hours' },
      { hours: 4, label: '4 hours' },
      { hours: 6, label: '6 hours' },
      { hours: 8, label: '8 hours' }
    ].filter(block => block.hours >= minimumHours && block.hours <= maximumHours);
    
    const [rangeStartHour] = availableTimeRange.start.split(':').map(Number);
    const [rangeEndHour] = availableTimeRange.end.split(':').map(Number);
    
    for (const block of commonBlocks) {
      // Morning slot
      if (rangeStartHour + block.hours <= rangeEndHour) {
        selections.push({
          label: `Morning ${block.label}`,
          startTime: `${rangeStartHour.toString().padStart(2, '0')}:00`,
          endTime: `${(rangeStartHour + block.hours).toString().padStart(2, '0')}:00`,
          duration: block.hours
        });
      }
      
      // Afternoon slot (if possible)
      const afternoonStart = Math.max(12, rangeStartHour);
      if (afternoonStart + block.hours <= rangeEndHour) {
        selections.push({
          label: `Afternoon ${block.label}`,
          startTime: `${afternoonStart.toString().padStart(2, '0')}:00`,
          endTime: `${(afternoonStart + block.hours).toString().padStart(2, '0')}:00`,
          duration: block.hours
        });
      }
    }
    
    return selections.slice(0, 4); // Limit to 4 quick selections
  };

  const quickSelections = getQuickSelections();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Choose Your Time
        </CardTitle>
        <CardDescription>
          Select your preferred time slot for <strong>{shiftTitle}</strong> on {new Date(shiftDate).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Available Time Range Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Available time range: {availableTimeRange.start} - {availableTimeRange.end} 
            <br />
            Minimum commitment: {minimumHours} hours | Maximum commitment: {maximumHours} hours
          </AlertDescription>
        </Alert>

        {/* Quick Selections */}
        {quickSelections.length > 0 && (
          <div>
            <Label className="text-sm font-medium mb-3 block">Quick Selections</Label>
            <div className="grid grid-cols-2 gap-2">
              {quickSelections.map((selection, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedStartTime(selection.startTime);
                    setSelectedEndTime(selection.endTime);
                  }}
                  className={cn(
                    "justify-start text-left h-auto py-2",
                    selectedStartTime === selection.startTime && selectedEndTime === selection.endTime &&
                    "ring-2 ring-primary"
                  )}
                >
                  <div>
                    <div className="font-medium">{selection.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {selection.startTime} - {selection.endTime}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Custom Time Selection */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Custom Time Selection</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time" className="text-sm">Start Time</Label>
              <Select value={selectedStartTime} onValueChange={setSelectedStartTime}>
                <SelectTrigger id="start-time">
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="end-time" className="text-sm">End Time</Label>
              <Select 
                value={selectedEndTime} 
                onValueChange={setSelectedEndTime}
                disabled={!selectedStartTime}
              >
                <SelectTrigger id="end-time">
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableEndTimes().map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Duration Display */}
        {duration > 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium text-green-900">
                Duration: {formatDuration(duration)}
              </div>
              <div className="text-sm text-green-700">
                {selectedStartTime} - {selectedEndTime}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedStartTime || !selectedEndTime || !!error || loading}
            className="min-w-[120px]"
          >
            {loading ? 'Confirming...' : 'Confirm Selection'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
