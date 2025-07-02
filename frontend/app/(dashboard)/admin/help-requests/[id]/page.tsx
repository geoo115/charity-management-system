'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Check, 
  X, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  MessageSquare,
  FileText,
  AlertCircle,
  Send
} from 'lucide-react'
import { format } from 'date-fns'
import { 
  getHelpRequest, 
  updateHelpRequestStatus, 
  approveHelpRequest, 
  rejectHelpRequest,
  assignVolunteerToRequest,
  addHelpRequestNote,
  getHelpRequestTimeline,
  issueTicket,
  HelpRequest as ApiHelpRequest 
} from '@/lib/api/admin-comprehensive'
import { useToast } from '@/components/ui/use-toast'

// Local interface for UI needs
interface HelpRequest {
  id: string
  userId: string
  userName: string
  userEmail: string
  userPhone?: string
  userAddress?: string
  userProfileImage?: string
  title: string
  description: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected'
  submittedAt: string
  updatedAt: string
  assignedTo?: string
  assignedVolunteer?: {
    id: string
    name: string
    email: string
    phone?: string
    profileImage?: string
  }
  estimatedCompletionDate?: string
  actualCompletionDate?: string
  rejectionReason?: string
  notes: Array<{
    id: string
    authorId: string
    authorName: string
    content: string
    createdAt: string
    isInternal: boolean
  }>
  attachments: Array<{
    id: string
    filename: string
    url: string
    uploadedAt: string
  }>
  timeline: Array<{
    id: string
    action: string
    performedBy: string
    performedAt: string
    details?: string
  }>
}

// Transform API help request to UI help request
const transformApiHelpRequest = (apiRequest: ApiHelpRequest): HelpRequest => ({
  id: apiRequest.id.toString(),
  userId: apiRequest.visitor_id.toString(),
  userName: apiRequest.visitor_name,
  userEmail: apiRequest.visitor?.email || '',
  userPhone: apiRequest.visitor?.phone,
  title: `${apiRequest.category} Request`,
  description: apiRequest.details,
  category: apiRequest.category,
  priority: apiRequest.priority === 'emergency' ? 'urgent' : apiRequest.priority,
  status: apiRequest.status === 'ticket_issued' ? 'in_progress' : apiRequest.status,
  submittedAt: apiRequest.created_at,
  updatedAt: apiRequest.updated_at,
  notes: [],
  attachments: [],
  timeline: []
});

const HelpRequestDetail = () => {
  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  const [request, setRequest] = useState<HelpRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [availableVolunteers, setAvailableVolunteers] = useState<Array<{
    id: string
    name: string
    email: string
    skills: string[]
  }>>([])

  const { toast } = useToast()

  useEffect(() => {
    if (requestId) {
      fetchRequestDetails()
      fetchAvailableVolunteers()
    }
  }, [requestId])

  const fetchRequestDetails = async () => {
    try {
      setLoading(true)
      const response = await getHelpRequest(Number(requestId))
      const transformedRequest = transformApiHelpRequest(response)
      setRequest(transformedRequest)
      setNewStatus(transformedRequest.status)
    } catch (error) {
      console.error('Error fetching request details:', error)
      toast({
        title: "Error",
        description: "Failed to load request details",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableVolunteers = async () => {
    try {
      // Fetch available volunteers from API
      const response = await fetch(`/api/v1/admin/volunteers/available?skills=${request?.category || ''}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableVolunteers(data.volunteers || []);
      } else {
        console.error('Failed to fetch available volunteers');
        setAvailableVolunteers([]);
      }
    } catch (error) {
      console.error('Error fetching volunteers:', error);
      setAvailableVolunteers([]);
    }
  }

  const handleStatusUpdate = async () => {
    if (!request || !newStatus) return

    try {
      setUpdating(true)
      
      if (newStatus === 'approved') {
        await approveHelpRequest(Number(requestId), { 
          notes: rejectionReason || undefined,
          issue_ticket: true 
        })
      } else if (newStatus === 'rejected') {
        await rejectHelpRequest(Number(requestId), { 
          reason: rejectionReason || 'Request rejected',
          notes: rejectionReason 
        })
      } else {
        await updateHelpRequestStatus(Number(requestId), newStatus, rejectionReason)
      }
      
      setRequest(prev => prev ? { ...prev, status: newStatus as any, rejectionReason } : null)
      toast({
        title: "Success",
        description: "Request status updated successfully"
      })
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive"
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleAssignVolunteer = async (volunteerId: string) => {
    try {
      setUpdating(true)
      await assignVolunteerToRequest(requestId, volunteerId)
      fetchRequestDetails() // Refresh to get updated assignment
      toast({
        title: "Success",
        description: "Volunteer assigned successfully"
      })
    } catch (error) {
      console.error('Error assigning volunteer:', error)
      toast({
        title: "Error", 
        description: "Failed to assign volunteer",
        variant: "destructive"
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    try {
      await addHelpRequestNote(requestId, newNote, true)
      setNewNote('')
      fetchRequestDetails() // Refresh to get new note
      toast({
        title: "Success",
        description: "Note added successfully"
      })
    } catch (error) {
      console.error('Error adding note:', error)
      toast({
        title: "Error",
        description: "Failed to add note", 
        variant: "destructive"
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-purple-100 text-purple-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Request not found</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{request.title}</h1>
            <p className="text-gray-600">Request #{request.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
          <Badge className={getPriorityColor(request.priority)}>{request.priority}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{request.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Category</h4>
                  <p className="text-gray-600">{request.category}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Submitted</h4>
                  <p className="text-gray-600">{format(new Date(request.submittedAt), 'PPP pp')}</p>
                </div>
              </div>

              {request.estimatedCompletionDate && (
                <div>
                  <h4 className="font-medium mb-1">Estimated Completion</h4>
                  <p className="text-gray-600">{format(new Date(request.estimatedCompletionDate), 'PPP')}</p>
                </div>
              )}

              {request.actualCompletionDate && (
                <div>
                  <h4 className="font-medium mb-1">Completed On</h4>
                  <p className="text-gray-600">{format(new Date(request.actualCompletionDate), 'PPP')}</p>
                </div>
              )}

              {request.rejectionReason && (
                <div>
                  <h4 className="font-medium mb-1 text-red-600">Rejection Reason</h4>
                  <p className="text-red-700 bg-red-50 p-3 rounded">{request.rejectionReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          {request.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {request.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{attachment.filename}</span>
                      </div>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs for Notes and Timeline */}
          <Tabs defaultValue="notes">
            <TabsList>
              <TabsTrigger value="notes">Notes & Comments</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Add Internal Note</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Add a note about this request..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notes History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {request.notes.map((note) => (
                      <div key={note.id} className="border-l-2 border-gray-200 pl-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{note.authorName}</span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(note.createdAt), 'PPP pp')}
                          </span>
                        </div>
                        <p className="text-gray-700">{note.content}</p>
                        {note.isInternal && (
                          <Badge variant="secondary" className="mt-1">Internal</Badge>
                        )}
                      </div>
                    ))}
                    {request.notes.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No notes yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle>Request Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {request.timeline.map((event) => (
                      <div key={event.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div>
                          <p className="font-medium">{event.action}</p>
                          <p className="text-sm text-gray-600">
                            by {event.performedBy} on {format(new Date(event.performedAt), 'PPP pp')}
                          </p>
                          {event.details && (
                            <p className="text-sm text-gray-500 mt-1">{event.details}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Requester Info */}
          <Card>
            <CardHeader>
              <CardTitle>Requester Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={request.userProfileImage} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{request.userName}</p>
                  <p className="text-sm text-gray-600">User ID: {request.userId}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{request.userEmail}</span>
                </div>
                {request.userPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{request.userPhone}</span>
                  </div>
                )}
                {request.userAddress && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{request.userAddress}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assigned Volunteer */}
          <Card>
            <CardHeader>
              <CardTitle>Assigned Volunteer</CardTitle>
            </CardHeader>
            <CardContent>
              {request.assignedVolunteer ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.assignedVolunteer.profileImage} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.assignedVolunteer.name}</p>
                      <p className="text-sm text-gray-600">{request.assignedVolunteer.email}</p>
                    </div>
                  </div>
                  {request.assignedVolunteer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{request.assignedVolunteer.phone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-500">No volunteer assigned</p>
                  <Select onValueChange={handleAssignVolunteer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Assign volunteer" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVolunteers.map((volunteer) => (
                        <SelectItem key={volunteer.id} value={volunteer.id}>
                          {volunteer.name} - {volunteer.skills.join(', ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Management */}
          <Card>
            <CardHeader>
              <CardTitle>Manage Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newStatus === 'rejected' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rejection Reason</label>
                  <Textarea
                    placeholder="Please provide a reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <Button
                onClick={handleStatusUpdate}
                disabled={updating || newStatus === request.status}
                className="w-full"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </Button>

              <Separator />

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNewStatus('approved')
                    handleStatusUpdate()
                  }}
                  disabled={request.status === 'approved' || updating}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNewStatus('rejected')
                    // Will need rejection reason dialog
                  }}
                  disabled={request.status === 'rejected' || updating}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default HelpRequestDetail
