'use client';

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Clock, 
  Calendar, 
  MapPin, 
  Users, 
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { VolunteerShift } from '@/lib/types/volunteer';
import { formatDate, formatTime } from '@/lib/utils/date-utils';

interface ShiftConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetShift: VolunteerShift | null;
  conflictingShifts: VolunteerShift[];
  onResolve: (resolution: ConflictResolution) => void;
  onCancel: () => void;
}

interface ConflictResolution {
  action: 'cancel_conflicting' | 'modify_time' | 'request_override' | 'choose_different';
  shiftToCancel?: number;
  reason?: string;
}

export default function ShiftConflictDialog({
  open,
  onOpenChange,
  targetShift,
  conflictingShifts,
  onResolve,
  onCancel
}: ShiftConflictDialogProps) {
  const [selectedResolution, setSelectedResolution] = useState<string>('');
  const [selectedShiftToCancel, setSelectedShiftToCancel] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  if (!targetShift) return null;

  const handleResolve = () => {
    let resolution: ConflictResolution;

    switch (selectedResolution) {
      case 'cancel_conflicting':
        resolution = {
          action: 'cancel_conflicting',
          shiftToCancel: selectedShiftToCancel!,
          reason: reason || 'Cancelled to resolve scheduling conflict'
        };
        break;
      case 'modify_time':
        resolution = {
          action: 'modify_time',
          reason: 'Request time modification'
        };
        break;
      case 'request_override':
        resolution = {
          action: 'request_override',
          reason: reason || 'Special circumstances require both shifts'
        };
        break;
      default:
        resolution = {
          action: 'choose_different'
        };
    }

    onResolve(resolution);
  };

  const isResolutionValid = () => {
    if (selectedResolution === 'cancel_conflicting') {
      return selectedShiftToCancel !== null;
    }
    if (selectedResolution === 'request_override') {
      return reason.trim().length > 0;
    }
    return selectedResolution !== '';
  };

  const getTimeOverlap = (shift1: VolunteerShift, shift2: VolunteerShift) => {
    const start1 = new Date(`${shift1.date} ${shift1.startTime}`);
    const end1 = new Date(`${shift1.date} ${shift1.endTime}`);
    const start2 = new Date(`${shift2.date} ${shift2.startTime}`);
    const end2 = new Date(`${shift2.date} ${shift2.endTime}`);

    const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
    const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));
    
    const overlapMinutes = Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));
    
    return {
      hasOverlap: overlapMinutes > 0,
      minutes: overlapMinutes,
      hours: Math.round(overlapMinutes / 60 * 10) / 10
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Schedule Conflict Detected
          </DialogTitle>
          <DialogDescription>
            The shift you're trying to sign up for conflicts with your existing schedule. 
            Please choose how to resolve this conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Target Shift */}
          <div>
            <h4 className="font-medium mb-2">Shift you want to sign up for:</h4>
            <div className="p-4 border rounded-lg bg-blue-50">
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-semibold">{targetShift.title}</h5>
                  <div className="space-y-1 text-sm text-muted-foreground mt-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(targetShift.date)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {formatTime(targetShift.startTime)} - {formatTime(targetShift.endTime)}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {targetShift.location}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-blue-100">New</Badge>
              </div>
            </div>
          </div>

          {/* Conflicting Shifts */}
          <div>
            <h4 className="font-medium mb-2">Conflicting shifts:</h4>
            <div className="space-y-3">
              {conflictingShifts.map((shift) => {
                const overlap = getTimeOverlap(targetShift, shift);
                return (
                  <div key={shift.id} className="p-4 border rounded-lg bg-red-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-semibold">{shift.title}</h5>
                        <div className="space-y-1 text-sm text-muted-foreground mt-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {formatDate(shift.date)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {shift.location}
                          </div>
                        </div>
                        {overlap.hasOverlap && (
                          <div className="mt-2">
                            <Badge variant="destructive" className="text-xs">
                              {overlap.hours} hour overlap
                            </Badge>
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="bg-red-100">Existing</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resolution Options */}
          <div>
            <h4 className="font-medium mb-3">Choose a resolution:</h4>
            <div className="space-y-3">
              {/* Cancel conflicting shift */}
              <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="resolution"
                    value="cancel_conflicting"
                    checked={selectedResolution === 'cancel_conflicting'}
                    onChange={(e) => setSelectedResolution(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Cancel existing shift</div>
                    <div className="text-sm text-muted-foreground">
                      Cancel one of your conflicting shifts to make room for the new one
                    </div>
                    {selectedResolution === 'cancel_conflicting' && (
                      <div className="mt-3 space-y-2">
                        <select
                          value={selectedShiftToCancel || ''}
                          onChange={(e) => setSelectedShiftToCancel(Number(e.target.value))}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">Select shift to cancel</option>
                          {conflictingShifts.map((shift) => (
                            <option key={shift.id} value={shift.id}>
                              {shift.title} - {formatDate(shift.date)} at {formatTime(shift.startTime)}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Reason for cancellation (optional)"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Request time modification */}
              <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="resolution"
                    value="modify_time"
                    checked={selectedResolution === 'modify_time'}
                    onChange={(e) => setSelectedResolution(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Request time modification</div>
                    <div className="text-sm text-muted-foreground">
                      Ask the volunteer coordinator to modify shift times to avoid conflict
                    </div>
                  </div>
                </label>
              </div>

              {/* Request override */}
              <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="resolution"
                    value="request_override"
                    checked={selectedResolution === 'request_override'}
                    onChange={(e) => setSelectedResolution(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Request special override</div>
                    <div className="text-sm text-muted-foreground">
                      Request permission to keep both shifts (requires coordinator approval)
                    </div>
                    {selectedResolution === 'request_override' && (
                      <div className="mt-3">
                        <textarea
                          placeholder="Explain why you need both shifts..."
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="w-full p-2 border rounded h-20"
                          required
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Choose different shift */}
              <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="resolution"
                    value="choose_different"
                    checked={selectedResolution === 'choose_different'}
                    onChange={(e) => setSelectedResolution(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Choose a different shift</div>
                    <div className="text-sm text-muted-foreground">
                      Cancel this sign-up and look for shifts that don't conflict
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Warning about late cancellations */}
          {selectedResolution === 'cancel_conflicting' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Cancelling shifts with short notice may affect your volunteer rating. 
                Consider providing adequate notice when possible.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleResolve}
            disabled={!isResolutionValid()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {selectedResolution === 'choose_different' ? 'Go Back' : 'Resolve Conflict'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
