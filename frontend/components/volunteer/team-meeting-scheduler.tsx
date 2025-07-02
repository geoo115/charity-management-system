'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Video, 
  Phone, 
  Plus, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Share2
} from 'lucide-react';

interface TeamMeeting {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  meeting_type: 'in_person' | 'virtual' | 'hybrid';
  meeting_url?: string;
  created_by: number;
  team_id: number;
  attendees: TeamMember[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  recurring: boolean;
  recurring_pattern?: 'daily' | 'weekly' | 'monthly';
  reminder_sent: boolean;
  notes?: string;
  agenda?: string[];
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  response_status: 'accepted' | 'declined' | 'pending' | 'tentative';
  attendance_status?: 'attended' | 'absent' | 'late';
}

interface TeamMeetingSchedulerProps {
  teamId: number;
  onMeetingCreate?: (meeting: any) => Promise<void>;
  onMeetingUpdate?: (meetingId: string, updates: any) => Promise<void>;
  onMeetingDelete?: (meetingId: string) => Promise<void>;
  onAttendanceUpdate?: (meetingId: string, memberId: number, status: string) => Promise<void>;
}

export default function TeamMeetingScheduler({
  teamId,
  onMeetingCreate,
  onMeetingUpdate,
  onMeetingDelete,
  onAttendanceUpdate
}: TeamMeetingSchedulerProps) {
  const [meetings, setMeetings] = useState<TeamMeeting[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMeetingDetails, setShowMeetingDetails] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<TeamMeeting | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadMeetings();
    loadTeamMembers();
  }, [teamId, currentDate]);

  const loadMeetings = async () => {
    try {
      const response = await fetch(`/api/v1/volunteer/lead/teams/${teamId}/meetings`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings || []);
      }
    } catch (error) {
      console.error('Error loading meetings:', error);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const response = await fetch(`/api/v1/volunteer/lead/teams/${teamId}/members`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const handleMeetingCreate = async (meetingData: any) => {
    try {
      const response = await fetch('/api/v1/volunteer/lead/teams/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...meetingData,
          team_id: teamId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMeetings(prev => [data.meeting, ...prev]);
        setShowCreateDialog(false);
        
        if (onMeetingCreate) {
          await onMeetingCreate(data.meeting);
        }
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
    }
  };

  const handleMeetingUpdate = async (meetingId: string, updates: any) => {
    try {
      const response = await fetch(`/api/v1/volunteer/lead/teams/meetings/${meetingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setMeetings(prev => prev.map(m => m.id === meetingId ? data.meeting : m));
        
        if (onMeetingUpdate) {
          await onMeetingUpdate(meetingId, updates);
        }
      }
    } catch (error) {
      console.error('Error updating meeting:', error);
    }
  };

  const handleMeetingDelete = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;

    try {
      const response = await fetch(`/api/v1/volunteer/lead/teams/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setMeetings(prev => prev.filter(m => m.id !== meetingId));
        
        if (onMeetingDelete) {
          await onMeetingDelete(meetingId);
        }
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
    }
  };

  const handleAttendanceUpdate = async (meetingId: string, memberId: number, status: 'attended' | 'absent' | 'late') => {
    try {
      const response = await fetch(`/api/v1/volunteer/lead/teams/meetings/${meetingId}/attendance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ member_id: memberId, status }),
      });

      if (response.ok) {
        setMeetings(prev => prev.map(m => {
          if (m.id === meetingId) {
            return {
              ...m,
              attendees: m.attendees.map(a => 
                a.id === memberId ? { ...a, attendance_status: status } : a
              )
            };
          }
          return m;
        }));
        
        if (onAttendanceUpdate) {
          await onAttendanceUpdate(meetingId, memberId, status);
        }
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  const getMeetingsForDate = (date: Date) => {
    return meetings.filter(meeting => {
      const meetingDate = new Date(meeting.start_time);
      return meetingDate.toDateString() === date.toDateString();
    });
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getMeetingStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'virtual':
        return <Video className="h-4 w-4 text-blue-500" />;
      case 'in_person':
        return <MapPin className="h-4 w-4 text-green-500" />;
      case 'hybrid':
        return <Users className="h-4 w-4 text-purple-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredMeetings = meetings.filter(meeting => {
    const matchesStatus = filterStatus === 'all' || meeting.status === filterStatus;
    const matchesType = filterType === 'all' || meeting.meeting_type === filterType;
    return matchesStatus && matchesType;
  });

  const calendarDays = getCalendarDays();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <span>Team Meeting Scheduler</span>
          </h2>
          <p className="text-gray-600 mt-1">Schedule and manage team meetings</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
          >
            {viewMode === 'calendar' ? 'List View' : 'Calendar View'}
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="in_person">In Person</SelectItem>
            <SelectItem value="virtual">Virtual</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map((day, index) => {
                const dayMeetings = getMeetingsForDate(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = day.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={index}
                    className={`min-h-[100px] p-2 border border-gray-200 ${
                      isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                    } ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className={`text-sm font-medium ${
                      isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                    } ${isToday ? 'text-blue-600' : ''}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1 mt-1">
                      {dayMeetings.slice(0, 2).map(meeting => (
                        <div
                          key={meeting.id}
                          className="text-xs p-1 rounded cursor-pointer hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMeeting(meeting);
                            setShowMeetingDetails(true);
                          }}
                        >
                          <div className="flex items-center space-x-1">
                            {getMeetingTypeIcon(meeting.meeting_type)}
                            <span className="truncate">{meeting.title}</span>
                          </div>
                          <Badge className={`text-xs ${getMeetingStatusColor(meeting.status)}`}>
                            {meeting.status}
                          </Badge>
                        </div>
                      ))}
                      {dayMeetings.length > 2 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayMeetings.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredMeetings.length > 0 ? (
            filteredMeetings.map(meeting => (
              <Card key={meeting.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getMeetingTypeIcon(meeting.meeting_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
                          <Badge className={getMeetingStatusColor(meeting.status)}>
                            {meeting.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{meeting.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(meeting.start_time)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{meeting.attendees.length} attendees</span>
                          </div>
                          {meeting.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{meeting.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedMeeting(meeting);
                          setShowMeetingDetails(true);
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No meetings found</p>
              <p className="text-sm">Schedule a meeting to get started!</p>
            </div>
          )}
        </div>
      )}

      {/* Create Meeting Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
            <DialogDescription>
              Create a new team meeting with all the details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="meeting-title">Meeting Title</Label>
              <Input id="meeting-title" placeholder="Enter meeting title..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meeting-description">Description</Label>
              <Textarea id="meeting-description" placeholder="Enter meeting description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input id="start-date" type="date" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input id="start-time" type="time" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input id="end-date" type="date" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input id="end-time" type="time" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meeting-type">Meeting Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select meeting type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In Person</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meeting-location">Location/Meeting URL</Label>
              <Input id="meeting-location" placeholder="Enter location or meeting URL..." />
            </div>
            <div className="grid gap-2">
              <Label>Attendees</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox id={`member-${member.id}`} />
                    <Label htmlFor={`member-${member.id}`} className="text-sm">
                      {member.name} ({member.role})
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              const title = (document.getElementById('meeting-title') as HTMLInputElement)?.value;
              const description = (document.getElementById('meeting-description') as HTMLTextAreaElement)?.value;
              const startDate = (document.getElementById('start-date') as HTMLInputElement)?.value;
              const startTime = (document.getElementById('start-time') as HTMLInputElement)?.value;
              const endDate = (document.getElementById('end-date') as HTMLInputElement)?.value;
              const endTime = (document.getElementById('end-time') as HTMLInputElement)?.value;
              const location = (document.getElementById('meeting-location') as HTMLInputElement)?.value;
              
              if (title && startDate && startTime && endDate && endTime) {
                const startDateTime = new Date(`${startDate}T${startTime}`);
                const endDateTime = new Date(`${endDate}T${endTime}`);
                
                const selectedMembers = teamMembers.filter(member => 
                  (document.getElementById(`member-${member.id}`) as HTMLInputElement)?.checked
                );
                
                handleMeetingCreate({
                  title,
                  description,
                  start_time: startDateTime.toISOString(),
                  end_time: endDateTime.toISOString(),
                  location,
                  meeting_type: 'in_person', // Default, should be from select
                  attendees: selectedMembers.map(m => ({ id: m.id, response_status: 'pending' }))
                });
              }
            }}>
              Schedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Details Dialog */}
      <Dialog open={showMeetingDetails} onOpenChange={setShowMeetingDetails}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{selectedMeeting?.title}</DialogTitle>
            <DialogDescription>
              Meeting details and attendee management
            </DialogDescription>
          </DialogHeader>
          {selectedMeeting && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Date & Time</Label>
                  <p className="text-sm text-gray-900">
                    {formatDate(selectedMeeting.start_time)} at {formatTime(selectedMeeting.start_time)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Duration</Label>
                  <p className="text-sm text-gray-900">
                    {Math.round((new Date(selectedMeeting.end_time).getTime() - new Date(selectedMeeting.start_time).getTime()) / (1000 * 60))} minutes
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Type</Label>
                  <div className="flex items-center space-x-2">
                    {getMeetingTypeIcon(selectedMeeting.meeting_type)}
                    <span className="text-sm text-gray-900 capitalize">
                      {selectedMeeting.meeting_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Location</Label>
                  <p className="text-sm text-gray-900">{selectedMeeting.location}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700">Description</Label>
                <p className="text-sm text-gray-900 mt-1">{selectedMeeting.description}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700">Attendees</Label>
                <div className="space-y-2 mt-2">
                  {selectedMeeting.attendees.map(attendee => (
                    <div key={attendee.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">{attendee.name}</p>
                        <p className="text-xs text-gray-500">{attendee.role}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={
                          attendee.response_status === 'accepted' ? 'bg-green-100 text-green-800' :
                          attendee.response_status === 'declined' ? 'bg-red-100 text-red-800' :
                          attendee.response_status === 'tentative' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {attendee.response_status}
                        </Badge>
                        {selectedMeeting.status === 'in_progress' && (
                          <Select
                            value={attendee.attendance_status || 'absent'}
                            onValueChange={(value) => handleAttendanceUpdate(selectedMeeting.id, attendee.id, value as 'attended' | 'absent' | 'late')}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="attended">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex space-x-2">
                  {selectedMeeting.meeting_url && (
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Join Meeting
                    </Button>
                  )}
                  <Button size="sm" variant="outline">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button size="sm" variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Handle edit
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleMeetingDelete(selectedMeeting.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 