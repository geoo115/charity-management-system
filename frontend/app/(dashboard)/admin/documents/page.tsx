'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { 
  getPendingDocuments, 
  getDocuments,
  verifyDocument,
  Document 
} from '@/lib/api/admin-comprehensive';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  CheckCircle, 
  XCircle,
  Download,
  Clock,
  User,
  AlertTriangle,
  Calendar,
  RefreshCw,
  FileCheck,
  FileX,
  Upload,
  Activity,
  TrendingUp,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Settings,
  Bell,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';
import { formatDistanceToNow } from 'date-fns';
import { getFromLocalStorage } from '@/lib/hooks/use-local-storage';

export default function AdminDocumentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkSelection, setBulkSelection] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    pendingDocuments: 0,
    approvedDocuments: 0,
    rejectedDocuments: 0,
    recentUploads: 0,
    avgProcessingTime: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    date_range: 'all',
    user_type: 'all',
  });
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');

  useEffect(() => {
    if (user?.role === 'Admin') {
      loadDocuments();
    }
  }, [user, currentPage, filters]);

  const loadDocuments = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Prepare filters for API call
      const apiFilters: any = {
        page: currentPage,
        limit: 20,
      };
      
      // Only add filters if they're not "all"
      if (filters.status !== 'all') {
        apiFilters.status = filters.status;
      }
      if (filters.type !== 'all') {
        apiFilters.type = filters.type;
      }
      if (filters.search) {
        apiFilters.search = filters.search;
      }
      
      console.log('Calling getDocuments with filters:', apiFilters);
      const response: any = await getDocuments(apiFilters);
      console.log('getDocuments response:', response);
      console.log('response type:', typeof response);
      console.log('response keys:', Object.keys(response || {}));
      
      // Debug alert to see what we're getting
      if (typeof window !== 'undefined') {
        console.warn('DEBUG - Response structure:', JSON.stringify(response, null, 2));
      }
      
      // Handle the actual backend response format
      const documentsArray: Document[] = Array.isArray(response) ? response : 
                           (response.documents ? response.documents : 
                           (response.data ? response.data : []));
      
      console.log('Processed documents array:', documentsArray);
      console.log('Documents array length:', documentsArray.length);
      
      setDocuments(documentsArray);
      setTotalDocuments(response.total || response.pagination?.total || documentsArray.length);
      
      // Calculate stats
      const pending = documentsArray.filter(d => d.status === 'pending').length;
      const approved = documentsArray.filter(d => d.status === 'approved').length;
      const rejected = documentsArray.filter(d => d.status === 'rejected').length;
      const recent = documentsArray.filter(d => {
        const uploadDate = new Date(d.uploaded_at);
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return uploadDate >= oneWeekAgo;
      }).length;

      // Calculate average processing time
      const processedDocuments = documentsArray.filter(d => 
        d.status === 'approved' || d.status === 'rejected'
      );
      const avgProcessingTime = calculateAvgProcessingTime(processedDocuments);

      setStats({
        totalDocuments: response.total || response.pagination?.total || documentsArray.length,
        pendingDocuments: pending,
        approvedDocuments: approved,
        rejectedDocuments: rejected,
        recentUploads: recent,
        avgProcessingTime,
      });
    } catch (error: any) {
      console.error('Error loading documents:', error);
      // Set empty array on error to prevent filter issues
      setDocuments([]);
      setTotalDocuments(0);
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDocuments(true);
  };

  const handleBulkAction = async () => {
    if (!bulkAction || bulkSelection.length === 0) return;

    try {
      switch (bulkAction) {
        case 'approve':
          await Promise.all(
            bulkSelection.map(id => verifyDocument(id, { status: 'approved' }))
          );
          toast({
            title: 'Success',
            description: `${bulkSelection.length} documents approved`,
          });
          break;
        case 'reject':
          await Promise.all(
            bulkSelection.map(id => verifyDocument(id, { 
              status: 'rejected', 
              rejection_reason: 'Bulk rejection' 
            }))
          );
          toast({
            title: 'Success',
            description: `${bulkSelection.length} documents rejected`,
          });
          break;
      }
      
      setBulkSelection([]);
      setBulkAction('');
      setSelectAll(false);
      setShowBulkDialog(false);
      loadDocuments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform bulk action',
        variant: 'destructive',
      });
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setBulkSelection([]);
      setSelectAll(false);
    } else {
      setBulkSelection(documents.map(doc => doc.id));
      setSelectAll(true);
    }
  };

  const handleSelectDocument = (id: number) => {
    setBulkSelection(prev => {
      if (prev.includes(id)) {
        const newSelection = prev.filter(docId => docId !== id);
        if (newSelection.length === 0) setSelectAll(false);
        return newSelection;
      } else {
        const newSelection = [...prev, id];
        if (newSelection.length === documents.length) setSelectAll(true);
        return newSelection;
      }
    });
  };

  const handleVerify = async () => {
    if (!selectedDocument) return;

    try {
      await verifyDocument(selectedDocument.id, {
        status: 'approved',
        notes: verificationNotes,
      });
      toast({
        title: 'Success',
        description: 'Document verified successfully',
      });
      loadDocuments();
      setShowVerificationDialog(false);
      setSelectedDocument(null);
      setVerificationNotes('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify document',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!selectedDocument || !rejectionReason) return;

    try {
      await verifyDocument(selectedDocument.id, {
        status: 'rejected',
        rejection_reason: rejectionReason,
        notes: rejectionNotes,
      });
      toast({
        title: 'Success',
        description: 'Document rejected',
      });
      loadDocuments();
      setShowRejectionDialog(false);
      setSelectedDocument(null);
      setRejectionReason('');
      setRejectionNotes('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject document',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'id': return 'bg-blue-100 text-blue-800';
      case 'proof_of_address': return 'bg-green-100 text-green-800';
      case 'proof_of_income': return 'bg-purple-100 text-purple-800';
      case 'benefit_letter': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const downloadDocument = (doc: Document) => {
    // Get the auth token from localStorage
    const token = getFromLocalStorage('auth_token');
    if (!token) {
      toast({
        title: 'Error',
        description: 'Authentication required to download document',
        variant: 'destructive',
      });
      return;
    }

    // Create a temporary link to download the document from backend server
    const link = document.createElement('a');
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    link.href = `${backendUrl}/api/v1/documents/${doc.id}/download?token=${encodeURIComponent(token)}`;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const viewDocument = (doc: Document) => {
    // Get the auth token from localStorage
    const token = getFromLocalStorage('auth_token');
    if (!token) {
      toast({
        title: 'Error',
        description: 'Authentication required to view document',
        variant: 'destructive',
      });
      return;
    }

    // Open document in a new tab for viewing (works for images and PDFs)
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const viewUrl = `${backendUrl}/api/v1/documents/view/${doc.id}?token=${encodeURIComponent(token)}`;
    window.open(viewUrl, '_blank', 'noopener,noreferrer');
  };

  const calculateAvgProcessingTime = (documents: Document[]): number => {
    const documentsWithVerification = documents.filter(d => d.verified_at && d.uploaded_at);
    
    if (documentsWithVerification.length === 0) return 0;
    
    const totalProcessingTime = documentsWithVerification.reduce((sum, doc) => {
      const uploadDate = new Date(doc.uploaded_at);
      const verificationDate = new Date(doc.verified_at!);
      const diffHours = (verificationDate.getTime() - uploadDate.getTime()) / (1000 * 60 * 60);
      return sum + diffHours;
    }, 0);
    
    return Math.round((totalProcessingTime / documentsWithVerification.length) * 10) / 10;
  };

  if (loading) {
    return <LoadingSpinner message="Loading documents..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Verification</h1>
          <p className="text-muted-foreground">
            Review and verify visitor documents with enhanced workflow tracking
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.totalDocuments}</div>
            <p className="text-xs text-blue-600 mt-1">All time</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{stats.pendingDocuments}</div>
            <p className="text-xs text-yellow-600 mt-1">Needs action</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.approvedDocuments}</div>
            <p className="text-xs text-green-600 mt-1">Verified</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.rejectedDocuments}</div>
            <p className="text-xs text-red-600 mt-1">Declined</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
            <Upload className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.recentUploads}</div>
            <p className="text-xs text-purple-600 mt-1">Last 7 days</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Process Time</CardTitle>
            <Activity className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">{stats.avgProcessingTime}d</div>
            <p className="text-xs text-indigo-600 mt-1">Processing time</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10 w-64"
                />
              </div>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters({ ...filters, type: value })}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="id">ID Document</SelectItem>
                  <SelectItem value="proof_of_address">Proof of Address</SelectItem>
                  <SelectItem value="proof_of_income">Proof of Income</SelectItem>
                  <SelectItem value="benefit_letter">Benefit Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Bulk Actions */}
            {bulkSelection.length > 0 && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  {bulkSelection.length} selected
                </span>
                <Select
                  value={bulkAction}
                  onValueChange={setBulkAction}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Bulk Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approve">Approve All</SelectItem>
                    <SelectItem value="reject">Reject All</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => setShowBulkDialog(true)}
                  disabled={!bulkAction}
                  size="sm"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Visitor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>
                    <Checkbox
                      checked={bulkSelection.includes(document.id)}
                      onCheckedChange={() => handleSelectDocument(document.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{document.name}</div>
                        {document.title && (
                          <div className="text-sm text-muted-foreground">
                            {document.title}
                          </div>
                        )}
                        {document.description && (
                          <div className="text-xs text-muted-foreground">
                            {document.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{document.user?.first_name} {document.user?.last_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getDocumentTypeColor(document.type)}>
                      {document.type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(document.status)}>
                      {document.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(document.created_at))} ago
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => viewDocument(document)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadDocument(document)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        {document.status === 'pending' && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedDocument(document);
                                setShowVerificationDialog(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedDocument(document);
                                setShowRejectionDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Document</DialogTitle>
            <DialogDescription>
              Approve this document and add verification notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="verification-notes">Verification Notes</Label>
              <Textarea
                id="verification-notes"
                placeholder="Add any notes about the verification..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerificationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerify}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Reject this document and provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Select
                value={rejectionReason}
                onValueChange={setRejectionReason}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unclear_image">Image unclear/unreadable</SelectItem>
                  <SelectItem value="wrong_document">Wrong document type</SelectItem>
                  <SelectItem value="expired_document">Document expired</SelectItem>
                  <SelectItem value="incomplete_information">Incomplete information</SelectItem>
                  <SelectItem value="fraudulent_document">Suspected fraud</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rejection-notes">Additional Notes</Label>
              <Textarea
                id="rejection-notes"
                placeholder="Add any additional notes..."
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to {bulkAction} {bulkSelection.length} documents?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAction}>
              {bulkAction === 'approve' ? 'Approve All' : 'Reject All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
