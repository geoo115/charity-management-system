'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Users,
  Clock,
  Shield,
  Settings,
  Save,
  Edit,
  AlertCircle,
  CheckCircle,
  Star
} from 'lucide-react';
import { fetchVolunteerProfile, updateVolunteerProfile } from '@/lib/api/volunteer';
import { VolunteerProfile } from '@/lib/types/volunteer';
import LoadingSpinner from '@/components/common/loading-spinner';

export default function VolunteerProfilePage() {
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    skills: [] as string[],
    availability: {
      days: [] as string[],
      timeSlots: [] as string[],
      preferences: ''
    },
    experience: '',
    motivation: ''
  });
  
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await fetchVolunteerProfile() as VolunteerProfile;
        setProfile(data);
        
        // Initialize form data
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          emergencyContact: data.emergencyContact || { name: '', phone: '', relationship: '' },
          skills: data.skills || [],
          availability: {
            days: data.availability?.days || [],
            timeSlots: data.availability?.timeSlots || [],
            preferences: data.availability?.preferences || ''
          },
          experience: data.experience || '',
          motivation: data.motivation || ''
        });
      } catch (err: any) {
        console.error('Error loading profile:', err);
        setError(err.message || 'Failed to load profile');
        
        // Set empty states instead of mock data
        setProfile(null);
        setFormData({
          name: '',
          email: '',
          phone: '',
          address: '',
          emergencyContact: { name: '', phone: '', relationship: '' },
          skills: [],
          availability: {
            days: [],
            timeSlots: [],
            preferences: ''
          },
          experience: '',
          motivation: ''
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateVolunteerProfile(formData);
      setProfile(prev => prev ? { ...prev, ...formData } : null);
      setEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to update profile",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof typeof prev] as any,
        [field]: value
      }
    }));
  };

  const addSkill = (skill: string) => {
    if (skill && !(formData.skills || []).includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), skill]
      }));
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  if (loading) {
    return <LoadingSpinner message="Loading your profile..." />;
  }

  if (error && !profile) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!profile) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Profile Not Found</AlertTitle>
        <AlertDescription>Unable to load your volunteer profile.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Volunteer Profile</h1>
          <p className="text-muted-foreground">Manage your volunteer information and preferences</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Profile Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile Status
            </span>
            <div className="flex items-center gap-2">
              <Badge variant={profile.status === 'active' ? 'default' : 'secondary'}>
                {profile.status}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {profile.level}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {(() => {
                  const joinedDate = new Date(profile.joinedAt);
                  const currentDate = new Date();
                  if (isNaN(joinedDate.getTime())) return 0;
                  return Math.max(0, currentDate.getFullYear() - joinedDate.getFullYear());
                })()}
              </p>
              <p className="text-sm text-muted-foreground">Years Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{profile.skills.length}</p>
              <p className="text-sm text-muted-foreground">Skills</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center">
                {profile.backgroundCheck?.status === 'approved' ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">Background Check</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="skills">Skills & Experience</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Contact</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Your basic contact and profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    {editing ? (
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <span>{profile.name}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    {editing ? (
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter your email"
                      />
                    ) : (
                      <span>{profile.email}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    {editing ? (
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="Enter your phone number"
                      />
                    ) : (
                      <span>{profile.phone || 'Not provided'}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                    {editing ? (
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Enter your address"
                        rows={2}
                        className="resize-none"
                      />
                    ) : (
                      <span>{profile.address || 'Not provided'}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Availability Preferences</CardTitle>
              <CardDescription>When you're available to volunteer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Preferred Days</Label>
                <div className="flex flex-wrap gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <Badge
                      key={day}
                      variant={formData.availability.days.includes(day) ? 'default' : 'outline'}
                      className={editing ? 'cursor-pointer' : ''}
                      onClick={() => {
                        if (editing) {
                          const days = formData.availability.days.includes(day)
                            ? formData.availability.days.filter(d => d !== day)
                            : [...formData.availability.days, day];
                          handleNestedChange('availability', 'days', days);
                        }
                      }}
                    >
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preferred Time Slots</Label>
                <div className="flex flex-wrap gap-2">
                  {['Morning', 'Afternoon', 'Evening'].map(slot => (
                    <Badge
                      key={slot}
                      variant={formData.availability.timeSlots.includes(slot) ? 'default' : 'outline'}
                      className={editing ? 'cursor-pointer' : ''}
                      onClick={() => {
                        if (editing) {
                          const slots = formData.availability.timeSlots.includes(slot)
                            ? formData.availability.timeSlots.filter(s => s !== slot)
                            : [...formData.availability.timeSlots, slot];
                          handleNestedChange('availability', 'timeSlots', slots);
                        }
                      }}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {slot}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferences">Additional Preferences</Label>
                {editing ? (
                  <Textarea
                    id="preferences"
                    value={formData.availability.preferences}
                    onChange={(e) => handleNestedChange('availability', 'preferences', e.target.value)}
                    placeholder="Any specific scheduling preferences or constraints..."
                    rows={3}
                    className="resize-none"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {formData.availability.preferences || 'No specific preferences'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Skills & Experience</CardTitle>
              <CardDescription>Your volunteer skills and experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {Array.isArray(formData.skills) ? formData.skills.map(skill => (
                    <Badge key={skill} variant="outline" className="flex items-center gap-1">
                      {skill}
                      {editing && (
                        <button
                          onClick={() => removeSkill(skill)}
                          className="ml-1 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      )}
                    </Badge>
                  )) : null}
                </div>
                {editing && (
                  <div className="flex flex-wrap gap-2">
                    {['Food Distribution', 'Customer Service', 'Data Entry', 'Translation', 'Child Care', 'Driving', 'Admin Support', 'Event Planning'].map(skill => (
                      !formData.skills.includes(skill) && (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => addSkill(skill)}
                        >
                          + {skill}
                        </Badge>
                      )
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="experience">Previous Experience</Label>
                {editing ? (
                  <Textarea
                    id="experience"
                    value={formData.experience}
                    onChange={(e) => handleInputChange('experience', e.target.value)}
                    placeholder="Describe your volunteer or relevant work experience..."
                    rows={3}
                    className="resize-none"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {profile.experience || 'No experience listed'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivation">Motivation</Label>
                {editing ? (
                  <Textarea
                    id="motivation"
                    value={formData.motivation}
                    onChange={(e) => handleInputChange('motivation', e.target.value)}
                    placeholder="What motivates you to volunteer with us?"
                    rows={3}
                    className="resize-none"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {profile.motivation || 'No motivation statement'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>Contact information for emergencies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergency-name">Contact Name</Label>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    {editing ? (
                      <Input
                        id="emergency-name"
                        value={formData.emergencyContact.name}
                        onChange={(e) => handleNestedChange('emergencyContact', 'name', e.target.value)}
                        placeholder="Emergency contact name"
                      />
                    ) : (
                      <span>{profile.emergencyContact?.name || 'Not provided'}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency-phone">Contact Phone</Label>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    {editing ? (
                      <Input
                        id="emergency-phone"
                        value={formData.emergencyContact.phone}
                        onChange={(e) => handleNestedChange('emergencyContact', 'phone', e.target.value)}
                        placeholder="Emergency contact phone"
                      />
                    ) : (
                      <span>{profile.emergencyContact?.phone || 'Not provided'}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="emergency-relationship">Relationship</Label>
                  {editing ? (
                    <Input
                      id="emergency-relationship"
                      value={formData.emergencyContact.relationship}
                      onChange={(e) => handleNestedChange('emergencyContact', 'relationship', e.target.value)}
                      placeholder="e.g., Spouse, Parent, Sibling, Friend"
                    />
                  ) : (
                    <span>{profile.emergencyContact?.relationship || 'Not provided'}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
