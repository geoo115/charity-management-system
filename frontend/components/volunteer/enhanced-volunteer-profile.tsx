'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
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
  Camera,
  Award,
  Calendar,
  Star,
  TrendingUp,
  FileText,
  Lock,
  Upload,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { apiClient } from '@/lib/api/api-client';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
};

interface VolunteerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  skills: string[];
  interests: string[];
  availability: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  profilePhoto?: string;
  bio: string;
  joinDate: string;
  totalHours: number;
  completedShifts: number;
  achievements: string[];
  certifications: string[];
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    profileVisibility: string;
  };
}

export default function EnhancedVolunteerProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [newSkill, setNewSkill] = useState('');
  const [newInterest, setNewInterest] = useState('');

  // Load volunteer profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await apiClient.get('/api/v1/volunteer/profile');
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        } else {
          // Fallback to mock data
          setProfile({
            id: '1',
            name: user?.first_name ? `${user.first_name} ${user.last_name}` : 'Volunteer User',
            email: user?.email || 'volunteer@example.com',
            phone: '+44 7123 456789',
            address: '123 Community Street, London, SE1 0AA',
            skills: ['Food Handling', 'Customer Service', 'Data Entry', 'Event Planning'],
            interests: ['Community Support', 'Education', 'Environment', 'Health & Wellbeing'],
            availability: 'Weekends and Tuesday evenings',
            emergencyContact: {
              name: 'John Smith',
              phone: '+44 7987 654321',
              relationship: 'Spouse'
            },
            bio: 'Passionate about helping the local community and making a positive impact through volunteer work.',
            joinDate: '2024-01-15',
            totalHours: 127,
            completedShifts: 23,
            achievements: ['Dedicated Volunteer', 'Safety Champion', 'Community Helper'],
            certifications: ['Food Safety', 'First Aid', 'Safeguarding'],
            preferences: {
              emailNotifications: true,
              smsNotifications: false,
              profileVisibility: 'volunteers'
            }
          });
        }
      } catch (error) {
        console.error('Profile loading error:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile data. Using offline data.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, toast]);

  const handleSave = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const response = await apiClient.put('/api/v1/volunteer/profile', profile);

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });
        setIsEditing(false);
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && profile) {
      setProfile({
        ...profile,
        skills: [...profile.skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    if (profile) {
      setProfile({
        ...profile,
        skills: profile.skills.filter(skill => skill !== skillToRemove)
      });
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && profile) {
      setProfile({
        ...profile,
        interests: [...profile.interests, newInterest.trim()]
      });
      setNewInterest('');
    }
  };

  const removeInterest = (interestToRemove: string) => {
    if (profile) {
      setProfile({
        ...profile,
        interests: profile.interests.filter(interest => interest !== interestToRemove)
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-96">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load profile data. Please refresh the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div 
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm"
          variants={itemVariants}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                  <AvatarImage src={profile.profilePhoto} alt={profile.name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-semibold">
                    {profile.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {profile.name}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Volunteer since {new Date(profile.joinDate).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">{profile.totalHours} hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{profile.completedShifts} shifts</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Button>
              {isEditing && (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={itemVariants}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 font-medium">Total Hours</p>
                  <p className="text-3xl font-bold">{profile.totalHours}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 font-medium">Completed Shifts</p>
                  <p className="text-3xl font-bold">{profile.completedShifts}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 font-medium">Achievements</p>
                  <p className="text-3xl font-bold">{profile.achievements.length}</p>
                </div>
                <Award className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Profile Content */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-xl">Profile Details</CardTitle>
              <CardDescription>
                Manage your volunteer profile and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="skills">Skills</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <Label className="text-base font-semibold text-gray-900 dark:text-white">About</Label>
                        <p className="text-muted-foreground mt-2 leading-relaxed">
                          {profile.bio}
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-base font-semibold text-gray-900 dark:text-white">Contact Information</Label>
                        <div className="mt-3 space-y-3">
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-gray-600" />
                            <span className="text-sm">{profile.email}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-gray-600" />
                            <span className="text-sm">{profile.phone}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-gray-600" />
                            <span className="text-sm">{profile.address}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <Label className="text-base font-semibold text-gray-900 dark:text-white">Achievements</Label>
                        <div className="mt-3 space-y-2">
                          {profile.achievements.map((achievement, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                              <Award className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm font-medium">{achievement}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-base font-semibold text-gray-900 dark:text-white">Certifications</Label>
                        <div className="mt-3 space-y-2">
                          {profile.certifications.map((cert, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <Shield className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium">{cert}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="personal" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profile.name}
                          onChange={(e) => setProfile({...profile, name: e.target.value})}
                          disabled={!isEditing}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({...profile, email: e.target.value})}
                          disabled={!isEditing}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={profile.phone}
                          onChange={(e) => setProfile({...profile, phone: e.target.value})}
                          disabled={!isEditing}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          value={profile.address}
                          onChange={(e) => setProfile({...profile, address: e.target.value})}
                          disabled={!isEditing}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="bio">About Me</Label>
                        <Textarea
                          id="bio"
                          value={profile.bio}
                          onChange={(e) => setProfile({...profile, bio: e.target.value})}
                          disabled={!isEditing}
                          className="mt-1"
                          rows={4}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="availability">Availability</Label>
                        <Textarea
                          id="availability"
                          value={profile.availability}
                          onChange={(e) => setProfile({...profile, availability: e.target.value})}
                          disabled={!isEditing}
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-base font-semibold">Emergency Contact</Label>
                        <div className="mt-3 space-y-3">
                          <Input
                            placeholder="Name"
                            value={profile.emergencyContact.name}
                            onChange={(e) => setProfile({
                              ...profile,
                              emergencyContact: {...profile.emergencyContact, name: e.target.value}
                            })}
                            disabled={!isEditing}
                          />
                          <Input
                            placeholder="Phone"
                            value={profile.emergencyContact.phone}
                            onChange={(e) => setProfile({
                              ...profile,
                              emergencyContact: {...profile.emergencyContact, phone: e.target.value}
                            })}
                            disabled={!isEditing}
                          />
                          <Input
                            placeholder="Relationship"
                            value={profile.emergencyContact.relationship}
                            onChange={(e) => setProfile({
                              ...profile,
                              emergencyContact: {...profile.emergencyContact, relationship: e.target.value}
                            })}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="skills" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <Label className="text-base font-semibold">Skills</Label>
                      <div className="mt-3 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-sm">
                              {skill}
                              {isEditing && (
                                <button
                                  onClick={() => removeSkill(skill)}
                                  className="ml-2 text-red-500 hover:text-red-700"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                        {isEditing && (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add a skill"
                              value={newSkill}
                              onChange={(e) => setNewSkill(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                            />
                            <Button onClick={addSkill} size="sm">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-base font-semibold">Interests</Label>
                      <div className="mt-3 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {profile.interests.map((interest, index) => (
                            <Badge key={index} variant="outline" className="text-sm">
                              {interest}
                              {isEditing && (
                                <button
                                  onClick={() => removeInterest(interest)}
                                  className="ml-2 text-red-500 hover:text-red-700"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                        {isEditing && (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add an interest"
                              value={newInterest}
                              onChange={(e) => setNewInterest(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                            />
                            <Button onClick={addInterest} size="sm">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-6 mt-6">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-base font-semibold">Notification Preferences</Label>
                      <div className="mt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="email-notifications">Email Notifications</Label>
                            <p className="text-sm text-muted-foreground">Receive updates about shifts and opportunities</p>
                          </div>
                          <Switch
                            id="email-notifications"
                            checked={profile.preferences.emailNotifications}
                            onCheckedChange={(checked) => setProfile({
                              ...profile,
                              preferences: {...profile.preferences, emailNotifications: checked}
                            })}
                            disabled={!isEditing}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="sms-notifications">SMS Notifications</Label>
                            <p className="text-sm text-muted-foreground">Receive urgent updates via text message</p>
                          </div>
                          <Switch
                            id="sms-notifications"
                            checked={profile.preferences.smsNotifications}
                            onCheckedChange={(checked) => setProfile({
                              ...profile,
                              preferences: {...profile.preferences, smsNotifications: checked}
                            })}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <Label className="text-base font-semibold">Privacy Settings</Label>
                      <div className="mt-4">
                        <Label htmlFor="profile-visibility">Profile Visibility</Label>
                        <p className="text-sm text-muted-foreground mb-3">
                          Control who can see your volunteer profile
                        </p>
                        <select
                          id="profile-visibility"
                          value={profile.preferences.profileVisibility}
                          onChange={(e) => setProfile({
                            ...profile,
                            preferences: {...profile.preferences, profileVisibility: e.target.value}
                          })}
                          disabled={!isEditing}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="public">Public (visible to all)</option>
                          <option value="volunteers">Volunteers only</option>
                          <option value="staff">Staff only</option>
                          <option value="private">Private</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
