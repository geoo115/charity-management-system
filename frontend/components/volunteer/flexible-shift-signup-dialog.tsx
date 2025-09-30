'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import FlexibleTimePicker from './flexible-time-picker';
import { VolunteerShift } from '@/lib/types/volunteer';

// Base shift interface that works with both VolunteerShift and ShiftDetails
interface BaseShift {
  id: number;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  enrolled: number;
  role: string;
  coordinator?: string | {
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  type?: 'fixed' | 'flexible' | 'open';
  minimumHours?: number;
  maximumHours?: number;
  flexibleTimeRange?: {
    start: string;
    end: string;
  };
}

interface FlexibleShiftSignupDialogProps {
  shift: BaseShift | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (shiftId: number, timeSelection: {
    startTime: string;
    endTime: string;
    duration: number;
  }) => Promise<void>;
}

export default function FlexibleShiftSignupDialog({
  shift,
  open,
  onClose,
  onConfirm
}: FlexibleShiftSignupDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!shift) return null;

  // Parse the shift's time range to determine available hours
  const getAvailableTimeRange = () => {
    // For flexible shifts, use the full shift time range
    return {
      start: shift.startTime,
      end: shift.endTime
    };
  };

  // Determine minimum and maximum hours based on shift requirements
  const getTimeConstraints = () => {
    // These could come from shift metadata or be configurable
    // For now, using reasonable defaults
    const shiftDurationHours = calculateShiftDuration(shift.startTime, shift.endTime);
    
    return {
      minimumHours: Math.max(1, Math.floor(shiftDurationHours * 0.25)), // Minimum 25% of shift
      maximumHours: shiftDurationHours // Maximum the full shift duration
    };
  };

  const calculateShiftDuration = (startTime: string, endTime: string) => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    return (endTotalMinutes - startTotalMinutes) / 60;
  };

  const handleTimeSelection = async (timeSelection: {
    startTime: string;
    endTime: string;
    duration: number;
  }) => {
    setLoading(true);
    try {
      await onConfirm(shift.id, timeSelection);
      onClose();
      toast({
        title: 'Success!',
        description: `You've signed up for ${timeSelection.duration} hours from ${timeSelection.startTime} to ${timeSelection.endTime}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Sign-up Failed',
        description: error.message || 'Failed to sign up for shift with selected time.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const isFlexibleShift = (shift as any)?.type === 'flexible';
  const availableTimeRange = getAvailableTimeRange();
  const timeConstraints = getTimeConstraints();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isFlexibleShift ? 'Choose Your Hours' : 'Confirm Shift Sign-up'}
          </DialogTitle>
        </DialogHeader>
        
        {isFlexibleShift ? (
          <FlexibleTimePicker
            shiftId={shift.id}
            shiftTitle={shift.title}
            shiftDate={shift.date}
            availableTimeRange={availableTimeRange}
            minimumHours={timeConstraints.minimumHours}
            maximumHours={timeConstraints.maximumHours}
            onTimeSelection={handleTimeSelection}
            onCancel={onClose}
            loading={loading}
          />
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">{shift.title}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Date:</strong> {new Date(shift.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {shift.startTime} - {shift.endTime}</p>
                <p><strong>Location:</strong> {shift.location}</p>
                <p><strong>Role:</strong> {shift.role}</p>
              </div>
            </div>
            
            {/* Standard shift confirmation would go here */}
            <p className="text-sm text-gray-600">
              This is a fixed-time shift. You&apos;ll be committing to the full duration from {shift.startTime} to {shift.endTime}.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={() => handleTimeSelection({
                  startTime: shift.startTime,
                  endTime: shift.endTime,
                  duration: calculateShiftDuration(shift.startTime, shift.endTime)
                })}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Confirming...' : 'Confirm Sign-up'}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
