'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingSpinner from '@/components/common/loading-spinner';
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  Building2,
  User,
  Clock,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle,
  Users,
  FileText,
  Settings,
  BarChart3,
  Shield,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  getStaff, 
  getStaffPerformance, 
  getStaffSchedule, 
  getStaffAssignments,
  StaffProfile,
  StaffPerformanceMetric,
  StaffSchedule,
  StaffAssignment
} from '@/lib/api/staff';

export default function StaffDetailPage() {
  const params = useParams();
  const staffId = parseInt(params.id as string);
  
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [schedule, setSchedule] = useState<StaffSchedule[]>([]);
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (staffId) {
      loadStaffData();
    }
  }, [staffId]);

  const loadStaffData = async () => {
    try {
      setLoading(true);
      
      const [staffResponse, performanceResponse, scheduleResponse, assignmentsResponse] = await Promise.all([
        getStaff(staffId),
        getStaffPerformance(staffId).catch(() => ({ metrics: [], summary: null })),
        getStaffSchedule(staffId).catch(() => ({ schedule: [], current_shift: null })),
        getStaffAssignments(staffId).catch(() => [])
      ]);

      setStaff(staffResponse.staff);
      setPerformance(performanceResponse);
      setSchedule(scheduleResponse.schedule);
      setAssignments(assignmentsResponse);
    } catch (error: any) {
      console.error('Error loading staff data:', error);
      setError(error.message || 'Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active', icon: CheckCircle },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inactive', icon: Clock },
      suspended: { color: 'bg-red-100 text-red-800', label: 'Suspended', icon: AlertTriangle },
      training: { color: 'bg-yellow-100 text-yellow-800', label: 'Training', icon: Award }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getDepartmentIcon = (department: string) => {
    switch (department) {
      case 'food': return '🍽️';
      case 'emergency': return '🚨';
      case 'admin': return '📋';
      case 'support': return '🤝';
      default: return '👥';
    }
  };

  const getSkillsArray = (skills: string): string[] => {
    try {
      return skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  };

  const getCertificationsArray = (certifications: string): string[] => {
    try {
      return certifications ? certifications.split(',').map(c => c.trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  };

  const parseContactInfo = (contactInfo: string) => {
    try {
      return JSON.parse(contactInfo);
    } catch {
      return {};
    }
  };

  const parseEmergencyContact = (emergencyContact: string) => {
    try {
      return JSON.parse(emergencyContact);
    } catch {
      return {};
    }
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  };

  if (loading) {
    return <LoadingSpinner message="Loading staff details..." />;
  }

  if (error || !staff) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Staff member not found'}
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link href="/admin/staff">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Staff
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const contactInfo = parseContactInfo(staff.contact_info);
  const emergencyContact = parseEmergencyContact(staff.emergency_contact);
  const skills = getSkillsArray(staff.skills);
  const certifications = getCertificationsArray(staff.certifications);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <Link href="/admin/staff">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Staff
              </Button>
            </Link>
          </div>
          <div className="flex space-x-2">
            <Link href={`/admin/staff/${staff.id}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Link href={`/admin/staff/${staff.id}/schedule`}>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Staff Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl">
                    {staff.user.first_name[0]}{staff.user.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">
                        {staff.user.first_name} {staff.user.last_name}
                      </h1>
                      <p className="text-lg text-gray-600 mt-1">
                        {staff.position.charAt(0).toUpperCase() + staff.position.slice(1)} • {getDepartmentIcon(staff.department)} {staff.department.charAt(0).toUpperCase() + staff.department.slice(1)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Employee ID: {staff.employee_id}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(staff.status)}
                      <p className="text-sm text-gray-500 mt-2">
                        Hired {format(new Date(staff.hire_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{staff.user.email}</span>
                    </div>
                    {contactInfo.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{contactInfo.phone}</span>
                      </div>
                    )}
                    {staff.supervisor && (
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          Reports to {staff.supervisor.user.first_name} {staff.supervisor.user.last_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Skills & Certifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>Skills & Certifications</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {skills.length > 0 ? (
                          skills.map((skill, index) => (
                            <Badge key={index} variant="secondary">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No skills listed</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Certifications</h4>
                      <div className="flex flex-wrap gap-2">
                        {certifications.length > 0 ? (
                          certifications.map((cert, index) => (
                            <Badge key={index} variant="outline">
                              <Award className="w-3 h-3 mr-1" />
                              {cert}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No certifications listed</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>Recent Activity</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {assignments.slice(0, 5).map((assignment, index) => (
                        <div key={assignment.id} className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              Assigned to {assignment.department}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(assignment.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {assignments.length === 0 && (
                        <p className="text-sm text-muted-foreground">No recent activity</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Notes */}
              {staff.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Notes</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{staff.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Performance Metrics</span>
                  </CardTitle>
                  <CardDescription>
                    Performance data and analytics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {performance?.summary ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {performance.summary.overall_score || 85}%
                        </div>
                        <p className="text-sm text-muted-foreground">Overall Score</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {performance.summary.tasks_completed || 42}
                        </div>
                        <p className="text-sm text-muted-foreground">Tasks Completed</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {performance.summary.attendance_rate || 96}%
                        </div>
                        <p className="text-sm text-muted-foreground">Attendance Rate</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No performance data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Work Schedule</span>
                  </CardTitle>
                  <CardDescription>
                    Weekly work schedule and hours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {schedule.length > 0 ? (
                    <div className="space-y-3">
                      {schedule.map((day) => (
                        <div key={day.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${day.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <span className="font-medium">{getDayName(day.day_of_week)}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {day.is_active ? (
                              <>
                                {day.start_time} - {day.end_time}
                                {day.break_start && day.break_end && (
                                  <span className="ml-2">(Break: {day.break_start} - {day.break_end})</span>
                                )}
                              </>
                            ) : (
                              'Off'
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No schedule information available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assignments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>Current Assignments</span>
                  </CardTitle>
                  <CardDescription>
                    Active assignments and responsibilities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {assignments.length > 0 ? (
                    <div className="space-y-3">
                      {assignments.map((assignment) => (
                        <div key={assignment.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{assignment.department}</h4>
                            <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'}>
                              {assignment.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>Shift: {format(new Date(assignment.shift_start), 'MMM dd, HH:mm')} - {format(new Date(assignment.shift_end), 'MMM dd, HH:mm')}</p>
                            {assignment.notes && <p className="mt-1">{assignment.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No current assignments</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Phone className="h-5 w-5" />
                      <span>Contact Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{staff.user.email}</span>
                    </div>
                    {contactInfo.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{contactInfo.phone}</span>
                      </div>
                    )}
                    {contactInfo.address && (
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p>{contactInfo.address}</p>
                          {(contactInfo.city || contactInfo.state || contactInfo.zip) && (
                            <p className="text-sm text-muted-foreground">
                              {[contactInfo.city, contactInfo.state, contactInfo.zip].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Emergency Contact */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Emergency Contact</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {emergencyContact.name ? (
                      <>
                        <div className="flex items-center space-x-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{emergencyContact.name}</span>
                        </div>
                        {emergencyContact.phone && (
                          <div className="flex items-center space-x-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{emergencyContact.phone}</span>
                          </div>
                        )}
                        {emergencyContact.relationship && (
                          <div className="flex items-center space-x-3">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{emergencyContact.relationship}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No emergency contact information</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
} 