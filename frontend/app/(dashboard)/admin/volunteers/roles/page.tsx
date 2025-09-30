'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  FileText,
  Star,
  Award,
  Shield,
  Users,
  GraduationCap,
  Crown,
  Zap,
  Target,
  TrendingUp,
  Settings,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  UserCheck,
  UserX,
  AlertTriangle,
  Info
} from 'lucide-react'
import { format } from 'date-fns'

interface VolunteerRole {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string
  currentRole: 'general' | 'specialized' | 'lead'
  specializations: string[]
  leadershipSkills: string
  canTrainOthers: boolean
  canManageShifts: boolean
  emergencyResponse: boolean
  totalHours: number
  status: string
  joinedDate: string
  lastActive: string
  mentor?: {
    id: number
    name: string
    email: string
  }
  teamMembers: number[]
  notes?: string
}

interface RolePromotionRequest {
  volunteerId: number
  newRole: 'general' | 'specialized' | 'lead'
  specializations: string[]
  enableManagement: boolean
  enableTraining: boolean
  enableEmergency: boolean
  notes: string
}

const VolunteerRoleManagementPage = () => {
  const { toast } = useToast()
  const [volunteers, setVolunteers] = useState<VolunteerRole[]>([])
  const [filteredVolunteers, setFilteredVolunteers] = useState<VolunteerRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roleStats, setRoleStats] = useState({ general: 0, specialized: 0, lead: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerRole | null>(null)
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false)
  const [promotionRequest, setPromotionRequest] = useState<RolePromotionRequest>({
    volunteerId: 0,
    newRole: 'general',
    specializations: [],
    enableManagement: false,
    enableTraining: false,
    enableEmergency: false,
    notes: ''
  })

  // Fetch volunteers from backend
  const fetchVolunteers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/v1/admin/volunteers/by-role', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform backend data to VolunteerRole[]
      const transformedVolunteers: VolunteerRole[] = (data.volunteers || []).map((profile: any) => ({
        id: profile.user_id,
        firstName: profile.user.first_name,
        lastName: profile.user.last_name,
        email: profile.user.email,
        phone: profile.user.phone,
        currentRole: profile.role_level,
        specializations: profile.specializations ? profile.specializations.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        leadershipSkills: profile.leadership_skills || '',
        canTrainOthers: profile.can_train_others,
        canManageShifts: profile.can_manage_shifts,
        emergencyResponse: profile.emergency_response,
        totalHours: profile.total_hours,
        status: profile.status,
        joinedDate: profile.created_at,
        lastActive: profile.updated_at,
        mentor: profile.mentor ? {
          id: profile.mentor.id,
          name: `${profile.mentor.first_name} ${profile.mentor.last_name}`,
          email: profile.mentor.email
        } : undefined,
        teamMembers: profile.team_members ? profile.team_members.split(',').map((id: string) => parseInt(id)).filter(Boolean) : [],
        notes: profile.notes || ''
      }));
      
      setVolunteers(transformedVolunteers);
      
      // Calculate role statistics
      const stats = {
        general: transformedVolunteers.filter(v => v.currentRole === 'general').length,
        specialized: transformedVolunteers.filter(v => v.currentRole === 'specialized').length,
        lead: transformedVolunteers.filter(v => v.currentRole === 'lead').length,
      };
      setRoleStats(stats);
    } catch (error) {
      console.error('Error fetching volunteers:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch volunteers');
      toast({
        title: 'Error',
        description: 'Failed to fetch volunteer data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchVolunteers()
  }, [fetchVolunteers])

  useEffect(() => {
    filterVolunteers()
  }, [volunteers, searchTerm, roleFilter])

  const filterVolunteers = () => {
    let filtered = volunteers
    if (searchTerm) {
      filtered = filtered.filter(volunteer => 
        volunteer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        volunteer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        volunteer.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (roleFilter !== 'all') {
      filtered = filtered.filter(volunteer => volunteer.currentRole === roleFilter)
    }
    setFilteredVolunteers(filtered)
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      general: { color: 'bg-blue-100 text-blue-800', icon: User, label: 'General' },
      specialized: { color: 'bg-purple-100 text-purple-800', icon: Award, label: 'Specialized' },
      lead: { color: 'bg-green-100 text-green-800', icon: Crown, label: 'Lead' }
    }

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.general
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getRolePermissions = (volunteer: VolunteerRole) => {
    const permissions = []
    
    if (volunteer.canTrainOthers) permissions.push('Training')
    if (volunteer.canManageShifts) permissions.push('Shift Management')
    if (volunteer.emergencyResponse) permissions.push('Emergency Response')
    
    return permissions
  }

  const handlePromote = (volunteer: VolunteerRole) => {
    setSelectedVolunteer(volunteer)
    setPromotionRequest({
      volunteerId: volunteer.id,
      newRole: volunteer.currentRole,
      specializations: volunteer.specializations,
      enableManagement: volunteer.canManageShifts,
      enableTraining: volunteer.canTrainOthers,
      enableEmergency: volunteer.emergencyResponse,
      notes: ''
    })
    setPromotionDialogOpen(true)
  }

  // Call backend to promote/demote volunteer
  const submitPromotion = async () => {
    try {
      const response = await fetch(`/api/v1/admin/volunteers/${promotionRequest.volunteerId}/promote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          new_role: promotionRequest.newRole,
          reason: `Role changed to ${promotionRequest.newRole} by admin`
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      toast({
        title: 'Success',
        description: `Volunteer role updated to ${promotionRequest.newRole}`,
      });
      
      setPromotionDialogOpen(false);
      setSelectedVolunteer(null);
      
      // Refresh the volunteers list
      await fetchVolunteers();
    } catch (error) {
      console.error('Error updating volunteer role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update volunteer role',
        variant: 'destructive',
      });
    }
  }

  const exportRoleData = () => {
    // TODO: Implement export functionality
    console.log('Exporting role data...')
  }

  const stats = {
    total: volunteers.length,
    general: volunteers.filter(v => v.currentRole === 'general').length,
    specialized: volunteers.filter(v => v.currentRole === 'specialized').length,
    lead: volunteers.filter(v => v.currentRole === 'lead').length,
    canTrain: volunteers.filter(v => v.canTrainOthers).length,
    canManage: volunteers.filter(v => v.canManageShifts).length,
    emergency: volunteers.filter(v => v.emergencyResponse).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Volunteer Role Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage volunteer roles, permissions, and career progression
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportRoleData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Role Hierarchy Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Role Hierarchy:</strong> General → Specialized → Lead. Each level includes additional permissions and responsibilities.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volunteers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lead Volunteers</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.lead}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Specialized</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.specialized}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">General</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.general}</div>
          </CardContent>
        </Card>
      </div>

      {/* Permission Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Can Train Others</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.canTrain}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Can Manage Shifts</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{stats.canManage}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Response</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.emergency}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="specialized">Specialized</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Volunteers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Volunteers ({filteredVolunteers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Volunteer</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Specializations</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVolunteers.map((volunteer) => (
                <TableRow key={volunteer.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {volunteer.firstName} {volunteer.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {volunteer.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(volunteer.currentRole)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {volunteer.specializations.length > 0 ? (
                        volunteer.specializations.map((spec, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getRolePermissions(volunteer).map((permission, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                      {getRolePermissions(volunteer).length === 0 && (
                        <span className="text-sm text-muted-foreground">Basic</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {volunteer.totalHours} hours
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Volunteer Role Details</DialogTitle>
                            <DialogDescription>
                              Detailed information about {volunteer.firstName}&apos;s role and permissions
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Name</label>
                                <p className="text-sm text-muted-foreground">
                                  {volunteer.firstName} {volunteer.lastName}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Email</label>
                                <p className="text-sm text-muted-foreground">
                                  {volunteer.email}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Current Role</label>
                                <div className="mt-1">
                                  {getRoleBadge(volunteer.currentRole)}
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Total Hours</label>
                                <p className="text-sm text-muted-foreground">
                                  {volunteer.totalHours} hours
                                </p>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Specializations</label>
                              <div className="mt-1 space-x-1">
                                {volunteer.specializations.length > 0 ? (
                                  volunteer.specializations.map((spec, index) => (
                                    <Badge key={index} variant="outline">
                                      {spec}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-sm text-muted-foreground">None</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Leadership Skills</label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {volunteer.leadershipSkills || 'None'}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Permissions</label>
                              <div className="mt-1 space-y-1">
                                <div className="flex items-center space-x-2">
                                  <Checkbox checked={volunteer.canTrainOthers} disabled />
                                  <span className="text-sm">Can Train Others</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox checked={volunteer.canManageShifts} disabled />
                                  <span className="text-sm">Can Manage Shifts</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox checked={volunteer.emergencyResponse} disabled />
                                  <span className="text-sm">Emergency Response</span>
                                </div>
                              </div>
                            </div>
                            {volunteer.mentor && (
                              <div>
                                <label className="text-sm font-medium">Mentor</label>
                                <p className="text-sm text-muted-foreground">
                                  {volunteer.mentor.name} ({volunteer.mentor.email})
                                </p>
                              </div>
                            )}
                            {volunteer.teamMembers.length > 0 && (
                              <div>
                                <label className="text-sm font-medium">Team Members</label>
                                <p className="text-sm text-muted-foreground">
                                  {volunteer.teamMembers.length} members
                                </p>
                              </div>
                            )}
                            {volunteer.notes && (
                              <div>
                                <label className="text-sm font-medium">Notes</label>
                                <p className="text-sm text-muted-foreground">
                                  {volunteer.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        size="sm" 
                        onClick={() => handlePromote(volunteer)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Manage Role
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Promotion Dialog */}
      <Dialog open={promotionDialogOpen} onOpenChange={setPromotionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Volunteer Role</DialogTitle>
            <DialogDescription>
              Update role and permissions for {selectedVolunteer?.firstName} {selectedVolunteer?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">New Role</label>
              <Select 
                value={promotionRequest.newRole} 
                onValueChange={(value: 'general' | 'specialized' | 'lead') => 
                  setPromotionRequest(prev => ({ ...prev, newRole: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      General Volunteer
                    </div>
                  </SelectItem>
                  <SelectItem value="specialized">
                    <div className="flex items-center">
                      <Award className="w-4 h-4 mr-2" />
                      Specialized Volunteer
                    </div>
                  </SelectItem>
                  <SelectItem value="lead">
                    <div className="flex items-center">
                      <Crown className="w-4 h-4 mr-2" />
                      Lead Volunteer
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {promotionRequest.newRole === 'specialized' && (
              <div>
                <label className="text-sm font-medium">Specializations</label>
                <div className="mt-2 space-y-2">
                  {['Food Distribution', 'Administrative Support', 'Translation', 'IT Support', 'Medical Support', 'Transportation'].map((spec) => (
                    <div key={spec} className="flex items-center space-x-2">
                      <Checkbox
                        checked={promotionRequest.specializations.includes(spec)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setPromotionRequest(prev => ({
                              ...prev,
                              specializations: [...prev.specializations, spec]
                            }))
                          } else {
                            setPromotionRequest(prev => ({
                              ...prev,
                              specializations: prev.specializations.filter(s => s !== spec)
                            }))
                          }
                        }}
                      />
                      <span className="text-sm">{spec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {promotionRequest.newRole === 'lead' && (
              <div>
                <label className="text-sm font-medium">Lead Permissions</label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={promotionRequest.enableManagement}
                      onCheckedChange={(checked) => 
                        setPromotionRequest(prev => ({ ...prev, enableManagement: !!checked }))
                      }
                    />
                    <span className="text-sm">Can Manage Shifts & Teams</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={promotionRequest.enableTraining}
                      onCheckedChange={(checked) => 
                        setPromotionRequest(prev => ({ ...prev, enableTraining: !!checked }))
                      }
                    />
                    <span className="text-sm">Can Train Other Volunteers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={promotionRequest.enableEmergency}
                      onCheckedChange={(checked) => 
                        setPromotionRequest(prev => ({ ...prev, enableEmergency: !!checked }))
                      }
                    />
                    <span className="text-sm">Emergency Response Qualified</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Add notes about this role change..."
                value={promotionRequest.notes}
                onChange={(e) => setPromotionRequest(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPromotionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitPromotion}>
                Update Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default VolunteerRoleManagementPage 