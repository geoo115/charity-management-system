'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface Shift {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  role: string;
  max_volunteers: number;
  assigned_volunteer_id: number | null;
  assigned_volunteer?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  status: string;
}

interface ShiftCalendarProps {
  shifts: Shift[];
  onShiftClick: (shift: Shift) => void;
  onCreateShift: (date: Date, timeSlot?: string) => void;
  onEditShift: (shift: Shift) => void;
  onDeleteShift: (shiftId: number) => void;
}

export default function ShiftCalendarPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const handleShiftClick = (shift: Shift) => {
    // Handle shift click
    console.log('Shift clicked:', shift);
  };

  const handleCreateShift = (date: Date, timeSlot?: string) => {
    // Handle create shift
    console.log('Create shift for:', date, timeSlot);
  };

  const handleEditShift = (shift: Shift) => {
    // Handle edit shift
    console.log('Edit shift:', shift);
  };

  const handleDeleteShift = (shiftId: number) => {
    // Handle delete shift
    console.log('Delete shift:', shiftId);
  };

  useEffect(() => {
    // Load shifts data
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="p-6">Loading calendar...</div>;
  }

  return <ShiftCalendar 
    shifts={shifts}
    onShiftClick={handleShiftClick} 
    onCreateShift={handleCreateShift}
    onEditShift={handleEditShift}
    onDeleteShift={handleDeleteShift}
  />;
}

function ShiftCalendar({ 
  shifts, 
  onShiftClick, 
  onCreateShift,
  onEditShift, 
  onDeleteShift 
}: ShiftCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showShiftDialog, setShowShiftDialog] = useState(false);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];

  const getShiftsForDay = (date: Date) => {
    return shifts.filter(shift => 
      isSameDay(parseISO(shift.date), date)
    ).sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const getShiftForTimeSlot = (date: Date, timeSlot: string) => {
    return shifts.find(shift => 
      isSameDay(parseISO(shift.date), date) && 
      shift.start_time.startsWith(timeSlot.substring(0, 2))
    );
  };

  const handleShiftClick = (shift: Shift) => {
    setSelectedShift(shift);
    setShowShiftDialog(true);
    onShiftClick(shift);
  };

  const getShiftStatusColor = (shift: Shift) => {
    if (shift.assigned_volunteer_id) {
      return 'bg-green-100 border-green-300 text-green-800';
    }
    const shiftDate = parseISO(shift.date);
    const now = new Date();
    if (shiftDate < now) {
      return 'bg-red-100 border-red-300 text-red-800';
    }
    return 'bg-yellow-100 border-yellow-300 text-yellow-800';
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => 
      direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Shift Calendar</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium px-4">
              {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button variant="outline" onClick={() => setCurrentWeek(new Date())}>
          Today
        </Button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span>Assigned</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span>Open</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span>Past</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-8 border-b">
            <div className="p-3 font-medium border-r">Time</div>
            {weekDays.map(day => (
              <div key={day.toISOString()} className="p-3 border-r last:border-r-0">
                <div className="font-medium">{format(day, 'EEE')}</div>
                <div className="text-sm text-muted-foreground">{format(day, 'MMM dd')}</div>
                <div className="mt-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0"
                    onClick={() => onCreateShift(day)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Time slots grid */}
          {timeSlots.map(timeSlot => (
            <div key={timeSlot} className="grid grid-cols-8 border-b last:border-b-0">
              <div className="p-3 border-r font-mono text-sm">{timeSlot}</div>
              {weekDays.map(day => {
                const shift = getShiftForTimeSlot(day, timeSlot);
                return (
                  <div key={`${day.toISOString()}-${timeSlot}`} className="p-1 border-r last:border-r-0 min-h-[60px]">
                    {shift ? (
                      <div 
                        className={cn(
                          "p-2 rounded border cursor-pointer hover:shadow-sm transition-shadow",
                          getShiftStatusColor(shift)
                        )}
                        onClick={() => handleShiftClick(shift)}
                      >
                        <div className="font-medium text-xs truncate">{shift.role}</div>
                        <div className="text-xs opacity-75 truncate">{shift.location}</div>
                        <div className="text-xs opacity-75">
                          {shift.start_time} - {shift.end_time}
                        </div>
                        {shift.assigned_volunteer && (
                          <div className="text-xs font-medium truncate mt-1">
                            {shift.assigned_volunteer.first_name} {shift.assigned_volunteer.last_name}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        className="w-full h-full text-muted-foreground hover:bg-muted/50 rounded transition-colors flex items-center justify-center"
                        onClick={() => onCreateShift(day, timeSlot)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Shift Details Dialog */}
      <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
            <DialogDescription>
              {selectedShift && format(parseISO(selectedShift.date), 'EEEE, MMMM dd, yyyy')}
            </DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Role</h4>
                  <p>{selectedShift.role}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Time</h4>
                  <p>{selectedShift.start_time} - {selectedShift.end_time}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Location</h4>
                  <p>{selectedShift.location}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Capacity</h4>
                  <p>{selectedShift.assigned_volunteer_id ? 1 : 0} / {selectedShift.max_volunteers}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Description</h4>
                <p className="text-sm">{selectedShift.description}</p>
              </div>

              {selectedShift.assigned_volunteer && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Assigned Volunteer</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div>
                      <p className="font-medium">
                        {selectedShift.assigned_volunteer.first_name} {selectedShift.assigned_volunteer.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedShift.assigned_volunteer.email}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    onEditShift(selectedShift);
                    setShowShiftDialog(false);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    onDeleteShift(selectedShift.id);
                    setShowShiftDialog(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button onClick={() => setShowShiftDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
