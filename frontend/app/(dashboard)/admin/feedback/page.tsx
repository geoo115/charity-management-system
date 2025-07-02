'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  MessageSquare, 
  Star, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Filter, 
  Search, 
  Eye, 
  Reply, 
  Check, 
  X,
  RefreshCw,
  Settings,
  MoreHorizontal,
  Heart,
  Frown,
  Meh,
  Smile,
  AlertTriangle,
  Clock,
  User,
  Mail,
  Tag,
  BarChart3,
  PieChart,
  Activity,
  CheckSquare,
  Archive,
  Flag,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  BrainCircuit,
  Sparkles,
  TrendingDown
} from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import LoadingSpinner from '@/components/common/loading-spinner'
import { 
  getAllFeedback, 
  updateFeedbackStatus, 
  getFeedbackAnalytics,
  getFeedback,
  Feedback as ApiFeedback 
} from '@/lib/api/admin-comprehensive'

// Enhanced interface for UI needs with sentiment analysis
interface Feedback {
  id: string
  submittedBy: string
  email: string
  type: 'general' | 'complaint' | 'suggestion' | 'compliment' | 'feature_request' | 'bug_report'
  category: string
  subject: string
  message: string
  rating?: number
  status: 'pending' | 'reviewed' | 'responded' | 'closed' | 'escalated'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  response?: string
  tags: string[]
  attachments?: string[]
  sentiment?: 'positive' | 'negative' | 'neutral'
  sentimentScore?: number
  actionRequired?: boolean
  department?: string
  followUpRequired?: boolean
}

// Mock sentiment analysis function (in real app, this would call an AI service)
const analyzeSentiment = (text: string): { sentiment: 'positive' | 'negative' | 'neutral', score: number } => {
  const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'helpful', 'good', 'thank', 'love', 'perfect', 'outstanding'];
  const negativeWords = ['terrible', 'awful', 'bad', 'horrible', 'disappointed', 'angry', 'frustrated', 'poor', 'worst', 'hate'];
  
  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;
  
  words.forEach(word => {
    if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
    if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
  });
  
  const score = (positiveCount - negativeCount) / Math.max(words.length / 10, 1);
  
  if (score > 0.1) return { sentiment: 'positive', score: Math.min(score * 100, 100) };
  if (score < -0.1) return { sentiment: 'negative', score: Math.max(score * 100, -100) };
  return { sentiment: 'neutral', score: score * 100 };
};

// Enhanced transform function with sentiment analysis
const transformApiFeedback = (apiFeedback: ApiFeedback): Feedback => {
  const message = apiFeedback.comments || apiFeedback.suggestions || '';
  const sentimentAnalysis = analyzeSentiment(message);
  
  return {
    id: apiFeedback.id.toString(),
    submittedBy: `${apiFeedback.visitor?.first_name || ''} ${apiFeedback.visitor?.last_name || ''}`.trim() || 'Anonymous',
    email: apiFeedback.visitor?.email || '',
    type: determineFeedbackType(message, apiFeedback.overall_rating),
    category: determineCategory(message),
    subject: `Feedback #${apiFeedback.id}`,
    message: message,
    rating: apiFeedback.overall_rating,
    status: apiFeedback.review_status === 'escalated' ? 'escalated' : 
            apiFeedback.review_status === 'resolved' ? 'closed' : 
            apiFeedback.review_status === 'reviewed' ? 'reviewed' :
            apiFeedback.review_status || 'pending',
    priority: determinePriority(message, apiFeedback.overall_rating, sentimentAnalysis.sentiment),
    submittedAt: apiFeedback.created_at,
    reviewedAt: apiFeedback.updated_at,
    response: apiFeedback.admin_response,
    tags: generateTags(message, sentimentAnalysis.sentiment),
    attachments: [],
    sentiment: sentimentAnalysis.sentiment,
    sentimentScore: sentimentAnalysis.score,
    actionRequired: determineActionRequired(message, apiFeedback.overall_rating, sentimentAnalysis.sentiment),
    department: determineDepartment(message),
    followUpRequired: determineFollowUpRequired(message, apiFeedback.overall_rating)
  };
};

// Helper functions for enhanced categorization
const determineFeedbackType = (message: string, rating?: number): Feedback['type'] => {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('complain') || lowerMessage.includes('problem') || lowerMessage.includes('issue')) return 'complaint';
  if (lowerMessage.includes('suggest') || lowerMessage.includes('recommend') || lowerMessage.includes('improve')) return 'suggestion';
  if (lowerMessage.includes('thank') || lowerMessage.includes('great') || lowerMessage.includes('excellent')) return 'compliment';
  if (lowerMessage.includes('feature') || lowerMessage.includes('add') || lowerMessage.includes('would like')) return 'feature_request';
  if (lowerMessage.includes('bug') || lowerMessage.includes('error') || lowerMessage.includes('broken')) return 'bug_report';
  return 'general';
};

const determineCategory = (message: string): string => {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('food') || lowerMessage.includes('meal') || lowerMessage.includes('kitchen')) return 'Food Services';
  if (lowerMessage.includes('staff') || lowerMessage.includes('volunteer') || lowerMessage.includes('worker')) return 'Staff & Volunteers';
  if (lowerMessage.includes('facility') || lowerMessage.includes('building') || lowerMessage.includes('clean')) return 'Facilities';
  if (lowerMessage.includes('wait') || lowerMessage.includes('queue') || lowerMessage.includes('time')) return 'Wait Times';
  if (lowerMessage.includes('document') || lowerMessage.includes('registration') || lowerMessage.includes('process')) return 'Registration Process';
  if (lowerMessage.includes('website') || lowerMessage.includes('app') || lowerMessage.includes('system')) return 'Technology';
  return 'General';
};

const determinePriority = (message: string, rating?: number, sentiment?: string): Feedback['priority'] => {
  const lowerMessage = message.toLowerCase();
  const urgentWords = ['urgent', 'emergency', 'immediately', 'asap', 'critical'];
  const highWords = ['important', 'serious', 'major', 'significant'];
  
  if (urgentWords.some(word => lowerMessage.includes(word))) return 'urgent';
  if (rating && rating <= 2) return 'high';
  if (sentiment === 'negative' && (rating && rating <= 3)) return 'high';
  if (highWords.some(word => lowerMessage.includes(word))) return 'high';
  if (sentiment === 'negative') return 'medium';
  return 'low';
};

const generateTags = (message: string, sentiment: string): string[] => {
  const tags: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  // Add sentiment tag
  tags.push(sentiment);
  
  // Add topic tags
  if (lowerMessage.includes('food')) tags.push('food');
  if (lowerMessage.includes('staff')) tags.push('staff');
  if (lowerMessage.includes('wait')) tags.push('wait-time');
  if (lowerMessage.includes('clean')) tags.push('cleanliness');
  if (lowerMessage.includes('help')) tags.push('helpful');
  if (lowerMessage.includes('rude')) tags.push('behavior');
  
  return tags;
};

const determineActionRequired = (message: string, rating?: number, sentiment?: string): boolean => {
  return (rating !== undefined && rating <= 3) || 
         sentiment === 'negative' || 
         message.toLowerCase().includes('complain') ||
         message.toLowerCase().includes('problem');
};

const determineDepartment = (message: string): string => {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('food') || lowerMessage.includes('kitchen')) return 'Food Services';
  if (lowerMessage.includes('clean') || lowerMessage.includes('facility')) return 'Facilities';
  if (lowerMessage.includes('document') || lowerMessage.includes('registration')) return 'Administration';
  if (lowerMessage.includes('website') || lowerMessage.includes('system')) return 'IT';
  return 'General Management';
};

const determineFollowUpRequired = (message: string, rating?: number): boolean => {
  return (rating !== undefined && rating <= 2) || 
         message.toLowerCase().includes('follow') ||
         message.toLowerCase().includes('contact');
};

const FeedbackManagement = () => {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [filteredFeedback, setFilteredFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [sentimentFilter, setSentimentFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [responseText, setResponseText] = useState('')
  const [bulkSelection, setBulkSelection] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState('')
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [selectAll, setSelectAll] = useState(false)
  const [showResponseDialog, setShowResponseDialog] = useState(false)
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Enhanced stats with sentiment analysis
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    avgRating: 0,
    responseRate: 0,
    positiveFeedback: 0,
    negativeFeedback: 0,
    neutralFeedback: 0,
    actionRequired: 0,
    avgResponseTime: 0,
    satisfactionTrend: 0,
    criticalIssues: 0,
    followUpRequired: 0
  })

  useEffect(() => {
    fetchFeedback()
  }, [])

  useEffect(() => {
    filterFeedback()
  }, [feedback, searchTerm, statusFilter, typeFilter, priorityFilter, sentimentFilter, departmentFilter, dateRange])

  const fetchFeedback = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      const response = await getAllFeedback()
      const feedbackData = response?.feedback || []
      const transformedFeedback = feedbackData.map(transformApiFeedback)
      setFeedback(transformedFeedback)
      calculateEnhancedStats(transformedFeedback)
    } catch (error) {
      console.error('Error fetching feedback:', error)
      toast({
        title: 'Error',
        description: 'Failed to load feedback data',
        variant: 'destructive'
      })
      setFeedback([])
      calculateEnhancedStats([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const calculateEnhancedStats = (feedbackData: Feedback[]) => {
    const total = feedbackData.length
    const pending = feedbackData.filter(f => f.status === 'pending').length
    const withRatings = feedbackData.filter(f => f.rating !== undefined)
    const avgRating = withRatings.length > 0 
      ? withRatings.reduce((sum, f) => sum + (f.rating || 0), 0) / withRatings.length 
      : 0
    const responded = feedbackData.filter(f => f.status === 'responded' || f.status === 'closed').length
    const responseRate = total > 0 ? (responded / total) * 100 : 0

    // Enhanced sentiment stats
    const positiveFeedback = feedbackData.filter(f => f.sentiment === 'positive').length
    const negativeFeedback = feedbackData.filter(f => f.sentiment === 'negative').length
    const neutralFeedback = feedbackData.filter(f => f.sentiment === 'neutral').length
    const actionRequired = feedbackData.filter(f => f.actionRequired).length
    const followUpRequired = feedbackData.filter(f => f.followUpRequired).length
    const criticalIssues = feedbackData.filter(f => f.priority === 'urgent' || (f.priority === 'high' && f.sentiment === 'negative')).length

    setStats({ 
      total, 
      pending, 
      avgRating, 
      responseRate,
      positiveFeedback,
      negativeFeedback,
      neutralFeedback,
      actionRequired,
      avgResponseTime: calculateAvgResponseTime(feedbackData),
      satisfactionTrend: calculateSatisfactionTrend(feedbackData),
      criticalIssues,
      followUpRequired
    })
  }

  const calculateAvgResponseTime = (feedbackData: Feedback[]): number => {
    const respondedFeedback = feedbackData.filter(f => 
      f.status === 'responded' && f.reviewedAt && f.submittedAt
    )
    
    if (respondedFeedback.length === 0) return 0
    
    const totalResponseTime = respondedFeedback.reduce((sum, f) => {
      const submitted = new Date(f.submittedAt)
      const reviewed = new Date(f.reviewedAt!)
      const diffHours = (reviewed.getTime() - submitted.getTime()) / (1000 * 60 * 60)
      return sum + diffHours
    }, 0)
    
    return Math.round((totalResponseTime / respondedFeedback.length) * 10) / 10
  }

  const calculateSatisfactionTrend = (feedbackData: Feedback[]): number => {
    // Calculate trend based on recent vs older feedback ratings
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    
    const recentFeedback = feedbackData.filter(f => 
      new Date(f.submittedAt) >= oneWeekAgo && f.rating !== undefined
    )
    const olderFeedback = feedbackData.filter(f => 
      new Date(f.submittedAt) >= twoWeeksAgo && 
      new Date(f.submittedAt) < oneWeekAgo && 
      f.rating !== undefined
    )
    
    if (recentFeedback.length === 0 || olderFeedback.length === 0) return 0
    
    const recentAvg = recentFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / recentFeedback.length
    const olderAvg = olderFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / olderFeedback.length
    
    return Math.round(((recentAvg - olderAvg) / olderAvg) * 100)
  }

  const handleRefresh = () => {
    fetchFeedback(true);
  };

  const filterFeedback = () => {
    let filtered = feedback

    if (searchTerm) {
      filtered = filtered.filter(f => 
        f.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.submittedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(f => f.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(f => f.type === typeFilter)
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(f => f.priority === priorityFilter)
    }

    if (sentimentFilter !== 'all') {
      filtered = filtered.filter(f => f.sentiment === sentimentFilter)
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(f => f.department === departmentFilter)
    }

    if (dateRange.from) {
      filtered = filtered.filter(f => new Date(f.submittedAt) >= dateRange.from!)
    }

    if (dateRange.to) {
      filtered = filtered.filter(f => new Date(f.submittedAt) <= dateRange.to!)
    }

    setFilteredFeedback(filtered)
  }

  const handleStatusUpdate = async (feedbackId: string, newStatus: string) => {
    try {
      await updateFeedbackStatus(Number(feedbackId), {
        review_status: newStatus
      })
      setFeedback(prev => prev.map(f => 
        f.id === feedbackId ? { ...f, status: newStatus as any } : f
      ))
    } catch (error) {
      console.error('Error updating feedback status:', error)
    }
  }

  const handlePriorityUpdate = async (feedbackId: string, newPriority: string) => {
    try {
      await updateFeedbackStatus(Number(feedbackId), {
        review_status: 'reviewed',
        admin_notes: `Priority updated to ${newPriority}`
      })
      setFeedback(prev => prev.map(f => 
        f.id === feedbackId ? { ...f, priority: newPriority as any } : f
      ))
    } catch (error) {
      console.error('Error updating feedback priority:', error)
    }
  }

  const handleResponse = async (feedbackId: string, response: string) => {
    try {
      await updateFeedbackStatus(Number(feedbackId), {
        review_status: 'responded',
        admin_response: response
      })
      setFeedback(prev => prev.map(f => 
        f.id === feedbackId ? { ...f, response, status: 'responded' } : f
      ))
      setSelectedFeedback(null)
      setResponseText('')
    } catch (error) {
      console.error('Error responding to feedback:', error)
    }
  }

  const handleBulkAction = async () => {
    try {
      const updatedFeedback = [...feedback]
      for (const feedbackId of bulkSelection) {
        const feedbackItem = updatedFeedback.find(f => f.id === feedbackId)
        if (feedbackItem) {
          if (bulkAction === 'respond') {
            feedbackItem.status = 'responded'
            feedbackItem.response = 'Bulk response'
            await updateFeedbackStatus(Number(feedbackId), {
              review_status: 'responded',
              admin_response: 'Bulk response'
            })
          } else if (bulkAction === 'close') {
            feedbackItem.status = 'closed'
            await updateFeedbackStatus(Number(feedbackId), {
              review_status: 'resolved'
            })
          } else if (bulkAction === 'escalate') {
            feedbackItem.status = 'escalated'
            await updateFeedbackStatus(Number(feedbackId), {
              review_status: 'escalated'
            })
          }
        }
      }
      setFeedback(updatedFeedback)
      setBulkSelection([])
      setBulkAction('')
      setSelectAll(false)
      setShowBulkDialog(false)
      toast({
        title: 'Success',
        description: 'Bulk action completed successfully.',
      })
      } catch (error) {
        console.error('Error performing bulk action:', error)
        toast({
          title: 'Error',
          description: 'An error occurred while performing the bulk action.',
          variant: 'destructive'
        })
      }
    }

    const handleSelectAll = () => {
      if (selectAll) {
        setBulkSelection([])
        setSelectAll(false)
      } else {
        setBulkSelection(filteredFeedback.map(f => f.id))
        setSelectAll(true)
      }
    }

    const handleSelectFeedback = (id: string) => {
      setBulkSelection(prev => {
        if (prev.includes(id)) {
          const newSelection = prev.filter(fId => fId !== id)
          if (newSelection.length === 0) setSelectAll(false)
          return newSelection
        } else {
          const newSelection = [...prev, id]
          if (newSelection.length === filteredFeedback.length) setSelectAll(true)
          return newSelection
        }
      })
    }

    const getSentimentIcon = (sentiment?: string) => {
      switch (sentiment) {
        case 'positive': return <Smile className="h-4 w-4 text-green-600" />
        case 'negative': return <Frown className="h-4 w-4 text-red-600" />
        case 'neutral': return <Meh className="h-4 w-4 text-gray-600" />
        default: return <Meh className="h-4 w-4 text-gray-600" />
      }
    }

    const getSentimentColor = (sentiment?: string) => {
      switch (sentiment) {
        case 'positive': return 'bg-green-100 text-green-800'
        case 'negative': return 'bg-red-100 text-red-800'
        case 'neutral': return 'bg-gray-100 text-gray-800'
        default: return 'bg-gray-100 text-gray-800'
      }
    }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'reviewed': return 'bg-blue-100 text-blue-800'
      case 'responded': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      case 'escalated': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'complaint': return 'bg-red-100 text-red-800'
      case 'suggestion': return 'bg-blue-100 text-blue-800'
      case 'compliment': return 'bg-green-100 text-green-800'
      case 'general': return 'bg-gray-100 text-gray-800'
      case 'feature_request': return 'bg-purple-100 text-purple-800'
      case 'bug_report': return 'bg-orange-100 text-orange-800'
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ))
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Feedback Management</h1>
        <Button 
          onClick={() => fetchFeedback(true)}
          variant="outline"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.responseRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search feedback..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="complaint">Complaint</SelectItem>
                <SelectItem value="suggestion">Suggestion</SelectItem>
                <SelectItem value="compliment">Compliment</SelectItem>
                <SelectItem value="feature_request">Feature Request</SelectItem>
                <SelectItem value="bug_report">Bug Report</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Food Services">Food Services</SelectItem>
                <SelectItem value="Staff & Volunteers">Staff & Volunteers</SelectItem>
                <SelectItem value="Facilities">Facilities</SelectItem>
                <SelectItem value="Wait Times">Wait Times</SelectItem>
                <SelectItem value="Registration Process">Registration Process</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="General Management">General Management</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? format(dateRange.from, 'PPP') : 'From date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.to ? format(dateRange.to, 'PPP') : 'To date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Entries ({filteredFeedback.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredFeedback.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.subject}</h3>
                      <Badge className={getTypeColor(item.type)}>{item.type}</Badge>
                      <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                      <Badge className={getPriorityColor(item.priority)}>{item.priority}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      From: {item.submittedBy} ({item.email})
                    </p>
                    <p className="text-sm">{item.message}</p>
                    {item.rating && (
                      <div className="flex items-center gap-1">
                        {renderStars(item.rating)}
                        <span className="text-sm text-gray-600 ml-2">({item.rating}/5)</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      Submitted: {format(new Date(item.submittedAt), 'PPP pp')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFeedback(item)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Feedback Details</DialogTitle>
                        </DialogHeader>
                        {selectedFeedback && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Submitted By</label>
                                <p>{selectedFeedback.submittedBy}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Email</label>
                                <p>{selectedFeedback.email}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Type</label>
                                <Badge className={getTypeColor(selectedFeedback.type)}>
                                  {selectedFeedback.type}
                                </Badge>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Priority</label>
                                <Select
                                  value={selectedFeedback.priority}
                                  onValueChange={(value) => handlePriorityUpdate(selectedFeedback.id, value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Subject</label>
                              <p>{selectedFeedback.subject}</p>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Message</label>
                              <p className="whitespace-pre-wrap">{selectedFeedback.message}</p>
                            </div>

                            {selectedFeedback.rating && (
                              <div>
                                <label className="text-sm font-medium">Rating</label>
                                <div className="flex items-center gap-1">
                                  {renderStars(selectedFeedback.rating)}
                                  <span className="ml-2">({selectedFeedback.rating}/5)</span>
                                </div>
                              </div>
                            )}

                            {selectedFeedback.response && (
                              <div>
                                <label className="text-sm font-medium">Response</label>
                                <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded">
                                  {selectedFeedback.response}
                                </p>
                              </div>
                            )}

                            {selectedFeedback.status === 'pending' && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Response</label>
                                <Textarea
                                  placeholder="Type your response..."
                                  value={responseText}
                                  onChange={(e) => setResponseText(e.target.value)}
                                  className="min-h-[100px]"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleResponse(selectedFeedback.id, responseText)}
                                    disabled={!responseText.trim()}
                                  >
                                    <Reply className="h-4 w-4 mr-1" />
                                    Send Response
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => handleStatusUpdate(selectedFeedback.id, 'reviewed')}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Mark Reviewed
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Select
                      value={item.status}
                      onValueChange={(value) => handleStatusUpdate(item.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="responded">Responded</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="escalated">Escalated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}

            {filteredFeedback.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No feedback entries found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {bulkSelection.length} feedback entries selected.
          </DialogDescription>
          <div className="space-y-4 mt-4">
            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger>
                <SelectValue placeholder="Select bulk action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="respond">Respond to Feedback</SelectItem>
                <SelectItem value="close">Close Feedback</SelectItem>
                <SelectItem value="escalate">Escalate Feedback</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleBulkAction}
              disabled={bulkSelection.length === 0}
              className="w-full"
            >
              Apply {bulkAction && `(${bulkAction})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Response</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Type your response below. This will be sent to the selected feedback entries.
          </DialogDescription>
          <Textarea
            placeholder="Type your response..."
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            className="mt-2 min-h-[100px]"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={() => {
                // Handle send response to multiple feedback
                setShowResponseDialog(false)
              }}
              disabled={!responseText.trim()}
            >
              Send Response
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowResponseDialog(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback Analytics</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Sentiment Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="text-2xl font-bold">{stats.positiveFeedback}</div>
                    <p className="text-sm text-gray-500">Positive Feedback</p>
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold">{stats.negativeFeedback}</div>
                    <p className="text-sm text-gray-500">Negative Feedback</p>
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold">{stats.neutralFeedback}</div>
                    <p className="text-sm text-gray-500">Neutral Feedback</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Action Required</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.actionRequired}</div>
                <p className="text-sm text-gray-500">Feedback entries requiring action</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgResponseTime.toFixed(1)} hrs</div>
                <p className="text-sm text-gray-500">Average response time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Satisfaction Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.satisfactionTrend.toFixed(1)}%</div>
                <p className="text-sm text-gray-500">Change in satisfaction over time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.criticalIssues}</div>
                <p className="text-sm text-gray-500">Urgent issues identified</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Follow-Up Required</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.followUpRequired}</div>
                <p className="text-sm text-gray-500">Entries requiring follow-up</p>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FeedbackManagement
