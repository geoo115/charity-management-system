'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  ArrowLeft, 
  Save, 
  AlertTriangle,
  User,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  Shield,
  Clock,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  createStaff, 
  getStaffDepartments, 
  getStaffPositions,
  StaffProfile
} from '@/lib/api/staff';
import { getUsers, User as UserType } from '@/lib/api/admin-comprehensive';

interface StaffFormData {
  user_id: number;
  employee_id: string;
  department: string;
  position: string;
  hire_date: string;
  supervisor_id?: number;
  skills: string[];
  certifications: string[];
  work_schedule: {
    monday: { start: string; end: string; active: boolean };
    tuesday: { start: string; end: string; active: boolean };
    wednesday: { start: string; end: string; active: boolean };
    thursday: { start: string; end: string; active: boolean };
    friday: { start: string; end: string; active: boolean };
    saturday: { start: string; end: string; active: boolean };
    sunday: { start: string; end: string; active: boolean };
  };
  contact_info: {
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  emergency_contact: {
    name: string;
    phone: string;
    relationship: string;
  };
  notes: string;
}

export default function CreateStaffPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [existingStaff, setExistingStaff] = useState<StaffProfile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<StaffFormData>({
    user_id: 0,
    employee_id: '',
    department: '',
    position: '',
    hire_date: format(new Date(), 'yyyy-MM-dd'),
    supervisor_id: undefined,
    skills: [],
    certifications: [],
    work_schedule: {
      monday: { start: '09:00', end: '17:00', active: true },
      tuesday: { start: '09:00', end: '17:00', active: true },
      wednesday: { start: '09:00', end: '17:00', active: true },
      thursday: { start: '09:00', end: '17:00', active: true },
      friday: { start: '09:00', end: '17:00', active: true },
      saturday: { start: '09:00', end: '17:00', active: false },
      sunday: { start: '09:00', end: '17:00', active: false },
    },
    contact_info: {
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
    },
    emergency_contact: {
      name: '',
      phone: '',
      relationship: '',
    },
    notes: '',
  });

  const [newSkill, setNewSkill] = useState('');
  const [newCertification, setNewCertification] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.user_id) {
      newErrors.user_id = 'Please select a user';
    }

    if (!formData.employee_id.trim()) {
      newErrors.employee_id = 'Employee ID is required';
    }

    if (!formData.department) {
      newErrors.department = 'Department is required';
    }

    if (!formData.position) {
      newErrors.position = 'Position is required';
    }

    if (!formData.hire_date) {
      newErrors.hire_date = 'Hire date is required';
    }

    if (!formData.contact_info.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.emergency_contact.name.trim()) {
      newErrors.emergency_name = 'Emergency contact name is required';
    }

    if (!formData.emergency_contact.phone.trim()) {
      newErrors.emergency_phone = 'Emergency contact phone is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await createStaff({
        user_id: formData.user_id,
        employee_id: formData.employee_id,
        department: formData.department,
        position: formData.position,
        hire_date: formData.hire_date,
        supervisor_id: formData.supervisor_id,
        skills: formData.skills,
        certifications: formData.certifications,
        work_schedule: formData.work_schedule,
        contact_info: formData.contact_info,
        emergency_contact: formData.emergency_contact,
        notes: formData.notes,
      });

      toast({
        title: 'Success',
        description: 'Staff member has been created successfully.',
      });

      router.push('/admin/staff');
    } catch (error: any) {
      console.error('Error creating staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create staff member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const addCertification = () => {
    if (newCertification.trim() && !formData.certifications.includes(newCertification.trim())) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCertification.trim()]
      }));
      setNewCertification('');
    }
  };

  const removeCertification = (certification: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== certification)
    }));
  };

  const selectedUser = users.find(u => u.id === formData.user_id);
  const availableSupervisors = existingStaff.filter(s => 
    s.position === 'supervisor' || s.position === 'manager'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <UserPlus className="h-8 w-8 text-blue-600" />
                <span>Add Staff Member</span>
              </h1>
              <p className="text-gray-600 mt-2">
                Create a new staff member profile
              </p>
            </div>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>User Selection</span>
                </CardTitle>
                <CardDescription>
                  Select the user account to associate with this staff profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="user_id">User Account *</Label>
                  <Select 
                    value={formData.user_id.toString()} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: parseInt(value) }))}
                  >
                    <SelectTrigger className={errors.user_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          <div className="flex items-center space-x-2">
                            <span>{user.first_name} {user.last_name}</span>
                            <span className="text-muted-foreground">({user.email})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.user_id && (
                    <p className="text-sm text-red-500 mt-1">{errors.user_id}</p>
                  )}
                </div>

                {selectedUser && (
                  <Alert>
                    <User className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Selected User:</strong> {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.email})
                      <br />
                      <strong>Role:</strong> {selectedUser.role}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Staff Information</span>
                </CardTitle>
                <CardDescription>
                  Basic staff member information and role details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employee_id">Employee ID *</Label>
                    <Input
                      id="employee_id"
                      value={formData.employee_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                      placeholder="e.g., EMP001"
                      className={errors.employee_id ? 'border-red-500' : ''}
                    />
                    {errors.employee_id && (
                      <p className="text-sm text-red-500 mt-1">{errors.employee_id}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="hire_date">Hire Date *</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, hire_date: e.target.value }))}
                      className={errors.hire_date ? 'border-red-500' : ''}
                    />
                    {errors.hire_date && (
                      <p className="text-sm text-red-500 mt-1">{errors.hire_date}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="department">Department *</Label>
                    <Select 
                      value={formData.department} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                    >
                      <SelectTrigger className={errors.department ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {getStaffDepartments().map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept.charAt(0).toUpperCase() + dept.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.department && (
                      <p className="text-sm text-red-500 mt-1">{errors.department}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="position">Position *</Label>
                    <Select 
                      value={formData.position} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, position: value }))}
                    >
                      <SelectTrigger className={errors.position ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {getStaffPositions().map((pos) => (
                          <SelectItem key={pos} value={pos}>
                            {pos.charAt(0).toUpperCase() + pos.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.position && (
                      <p className="text-sm text-red-500 mt-1">{errors.position}</p>
                    )}
                  </div>
                </div>

                {availableSupervisors.length > 0 && (
                  <div>
                    <Label htmlFor="supervisor_id">Supervisor</Label>
                    <Select 
                      value={formData.supervisor_id?.toString() || ''} 
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        supervisor_id: value ? parseInt(value) : undefined 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supervisor (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No supervisor</SelectItem>
                        {availableSupervisors.map((supervisor) => (
                          <SelectItem key={supervisor.id} value={supervisor.id.toString()}>
                            {supervisor.user.first_name} {supervisor.user.last_name} ({supervisor.position})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Skills and Certifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Skills & Certifications</span>
                </CardTitle>
                <CardDescription>
                  Add relevant skills and certifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Skills</Label>
                  <div className="flex space-x-2 mb-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a skill"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    />
                    <Button type="button" onClick={addSkill} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeSkill(skill)}>
                        {skill} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Certifications</Label>
                  <div className="flex space-x-2 mb-2">
                    <Input
                      value={newCertification}
                      onChange={(e) => setNewCertification(e.target.value)}
                      placeholder="Add a certification"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                    />
                    <Button type="button" onClick={addCertification} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.certifications.map((cert, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeCertification(cert)}>
                        {cert} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5" />
                  <span>Contact Information</span>
                </CardTitle>
                <CardDescription>
                  Contact details and emergency contact
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={formData.contact_info.phone}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        contact_info: { ...prev.contact_info, phone: e.target.value }
                      }))}
                      placeholder="(555) 123-4567"
                      className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.contact_info.address}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        contact_info: { ...prev.contact_info, address: e.target.value }
                      }))}
                      placeholder="123 Main St"
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.contact_info.city}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        contact_info: { ...prev.contact_info, city: e.target.value }
                      }))}
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.contact_info.state}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        contact_info: { ...prev.contact_info, state: e.target.value }
                      }))}
                      placeholder="State"
                    />
                  </div>

                  <div>
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      value={formData.contact_info.zip}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        contact_info: { ...prev.contact_info, zip: e.target.value }
                      }))}
                      placeholder="12345"
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-4">Emergency Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="emergency_name">Name *</Label>
                      <Input
                        id="emergency_name"
                        value={formData.emergency_contact.name}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          emergency_contact: { ...prev.emergency_contact, name: e.target.value }
                        }))}
                        placeholder="Emergency contact name"
                        className={errors.emergency_name ? 'border-red-500' : ''}
                      />
                      {errors.emergency_name && (
                        <p className="text-sm text-red-500 mt-1">{errors.emergency_name}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="emergency_phone">Phone *</Label>
                      <Input
                        id="emergency_phone"
                        value={formData.emergency_contact.phone}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          emergency_contact: { ...prev.emergency_contact, phone: e.target.value }
                        }))}
                        placeholder="(555) 123-4567"
                        className={errors.emergency_phone ? 'border-red-500' : ''}
                      />
                      {errors.emergency_phone && (
                        <p className="text-sm text-red-500 mt-1">{errors.emergency_phone}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="emergency_relationship">Relationship</Label>
                      <Input
                        id="emergency_relationship"
                        value={formData.emergency_contact.relationship}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          emergency_contact: { ...prev.emergency_contact, relationship: e.target.value }
                        }))}
                        placeholder="e.g., Spouse, Parent"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Additional Notes</span>
                </CardTitle>
                <CardDescription>
                  Any additional information or notes about this staff member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter any additional notes..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex justify-end space-x-4"
          >
            <Link href="/admin/staff">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Staff Member
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </div>
    </div>
  );
} 