'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { 
  getVisitorDocuments, 
  uploadVisitorDocument, 
  transformDocumentsToStatus, 
  DocumentStatus,
  getDocumentViewUrl,
  downloadDocument,
  deleteDocument,
  getDocumentHistory,
  getVisitorDocumentStats
} from '@/lib/api/documents';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Upload,
  Download,
  Eye,
  Trash2,
  History,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Camera,
  Shield,
  Info,
  X,
  HelpCircle,
  Paperclip,
  FileIcon
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/common/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface UploadProgress {
  [key: string]: number;
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<string | null>(null);
  const [previewFiles, setPreviewFiles] = useState<{[key: string]: string}>({});
  const [verificationTips, setVerificationTips] = useState(true);
  const [documentStats, setDocumentStats] = useState<any>(null);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [documentHistory, setDocumentHistory] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  
  const photoIdRef = useRef<HTMLInputElement>(null);
  const proofAddressRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadDocuments();
    } else {
      setLoading(false);
      setError('Please log in to view your documents');
    }
  }, [user]);

  const loadDocuments = async () => {
    try {
      setError(null);
      const documents = await getVisitorDocuments();
      const status = transformDocumentsToStatus(documents);
      setDocumentStatus(status);
      setDocuments(documents); // Store full documents for enhanced features
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced document management functions
  const handleViewDocument = async (documentId: number) => {
    try {
      const url = getDocumentViewUrl(documentId);
      window.open(url, '_blank');
    } catch (error: any) {
      toast({
        title: "View Failed",
        description: error.message || "Failed to view document.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadDocument = async (documentId: number, filename: string) => {
    try {
      const blob = await downloadDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Complete",
        description: `${filename} has been downloaded.`,
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download document.",
        variant: "destructive",
      });
    }
  };

  const handleShowDocumentHistory = async (documentId: number) => {
    try {
      const history = await getDocumentHistory(documentId);
      setDocumentHistory(history);
      setShowDocumentDialog(true);
    } catch (error: any) {
      toast({
        title: "History Unavailable",
        description: error.message || "Failed to load document history.",
        variant: "destructive",
      });
    }
  };

  const findDocumentByType = (type: 'photo_id' | 'proof_address') => {
    return documents.find(doc => doc.type === type || 
      (type === 'photo_id' && doc.type === 'id') || 
      (type === 'proof_address' && doc.type === 'proof_of_address')
    );
  };

  const handleDrag = (e: React.DragEvent, documentType: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(documentType);
    } else if (e.type === 'dragleave') {
      setDragActive(null);
    }
  };

  const handleDrop = (e: React.DragEvent, documentType: 'photoId' | 'proofOfAddress') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0], documentType);
    }
  };

  const handleFileSelection = (file: File, documentType: 'photoId' | 'proofOfAddress') => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPEG, PNG, or PDF file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewFiles(prev => ({
          ...prev,
          [documentType]: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }

    handleFileUpload(documentType, file);
  };

  const handleFileUpload = async (documentType: 'photoId' | 'proofOfAddress', file: File) => {
    setUploading(documentType);
    setUploadProgress(prev => ({ ...prev, [documentType]: 0 }));
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[documentType] || 0;
          if (current < 90) {
            return { ...prev, [documentType]: current + 10 };
          }
          clearInterval(progressInterval);
          return prev;
        });
      }, 200);

      const backendType = documentType === 'photoId' ? 'photo_id' : 'proof_address';
      const data = await uploadVisitorDocument(file, backendType);
      
      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [documentType]: 100 }));
      
      setDocumentStatus(prev => prev ? {
        ...prev,
        [documentType]: {
          uploaded: true,
          status: 'pending',
          filename: data.document?.name || file.name,
        }
      } : null);

      toast({
        title: "Document Uploaded Successfully",
        description: "Your document has been uploaded and is pending review.",
      });

      // Clear progress after delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[documentType];
          return newProgress;
        });
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document.",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
            <Upload className="h-3 w-3 mr-1" />
            Required
          </Badge>
        );
    }
  };

  const getDocumentIcon = (type: string, status: string) => {
    if (status === 'approved') return <CheckCircle className="h-6 w-6 text-green-500" />;
    if (status === 'rejected') return <XCircle className="h-6 w-6 text-red-500" />;
    if (status === 'pending') return <Clock className="h-6 w-6 text-yellow-500" />;
    return type === 'photoId' ? <Camera className="h-6 w-6 text-gray-400" /> : <FileText className="h-6 w-6 text-gray-400" />;
  };

  const renderUploadArea = (documentType: 'photoId' | 'proofOfAddress', title: string, description: string) => {
    const isUploading = uploading === documentType;
    const progress = uploadProgress[documentType];
    const hasProgress = progress !== undefined;
    const preview = previewFiles[documentType];
    const status = documentStatus?.[documentType];

    return (
      <Card className={`transition-all duration-200 ${dragActive === documentType ? 'border-blue-500 bg-blue-50' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getDocumentIcon(documentType, status?.status || 'not_uploaded')}
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
            {status && getStatusBadge(status.status)}
          </div>
        </CardHeader>
        <CardContent>
          {!status?.uploaded ? (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive === documentType ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={(e) => handleDrag(e, documentType)}
              onDragLeave={(e) => handleDrag(e, documentType)}
              onDragOver={(e) => handleDrag(e, documentType)}
              onDrop={(e) => handleDrop(e, documentType)}
            >
              {isUploading ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Uploading...</p>
                    {hasProgress && (
                      <div className="mt-2">
                        <Progress value={progress} className="w-full" />
                        <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {preview ? (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <img 
                          src={preview} 
                          alt="Preview" 
                          className="max-h-32 rounded-lg shadow-md"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => setPreviewFiles(prev => {
                            const newPreviews = { ...prev };
                            delete newPreviews[documentType];
                            return newPreviews;
                          })}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">Ready to upload</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <Upload className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Drop your file here or click to browse</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports: JPEG, PNG, PDF (max 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => {
                        if (documentType === 'photoId') {
                          photoIdRef.current?.click();
                        } else {
                          proofAddressRef.current?.click();
                        }
                      }}
                      className="flex-1"
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        // In a real app, this would open camera
                        toast({
                          title: "Camera Feature",
                          description: "Camera capture will be available in the mobile app",
                        });
                      }}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileIcon className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">{status.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {status.status === 'pending' ? 'Under review' : 
                       status.status === 'approved' ? 'Verified and approved' :
                       'Rejected - needs replacement'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const docType = documentType === 'photoId' ? 'photo_id' : 'proof_address';
                      const doc = findDocumentByType(docType);
                      if (doc) handleViewDocument(doc.id);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const docType = documentType === 'photoId' ? 'photo_id' : 'proof_address';
                      const doc = findDocumentByType(docType);
                      if (doc) handleDownloadDocument(doc.id, doc.name);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  {status.status === 'rejected' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (documentType === 'photoId') {
                          photoIdRef.current?.click();
                        } else {
                          proofAddressRef.current?.click();
                        }
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Replace
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <input
            ref={documentType === 'photoId' ? photoIdRef : proofAddressRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileSelection(file, documentType);
              }
            }}
          />
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading documents..." />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const allDocumentsApproved = documentStatus?.photoId.status === 'approved' && 
                               documentStatus?.proofOfAddress.status === 'approved';

  const completionPercentage = documentStatus ? 
    ((documentStatus.photoId.uploaded ? 50 : 0) + (documentStatus.proofOfAddress.uploaded ? 50 : 0)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Verification</h1>
          <p className="text-muted-foreground">
            Upload your documents to verify your identity and access all services
          </p>
        </div>
        <Button variant="outline" onClick={loadDocuments}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Verification Progress
            </CardTitle>
            <Badge variant={allDocumentsApproved ? "default" : "secondary"}>
              {completionPercentage}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={completionPercentage} className="w-full mb-4" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {documentStatus?.photoId.uploaded && documentStatus?.proofOfAddress.uploaded
                ? "All documents uploaded"
                : `${(documentStatus?.photoId.uploaded ? 1 : 0) + (documentStatus?.proofOfAddress.uploaded ? 1 : 0)}/2 documents uploaded`
              }
            </span>
            {allDocumentsApproved && (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                Fully Verified
              </div>
            )}
          </div>
          
          {/* Quick Actions */}
          {!allDocumentsApproved && (
            <div className="flex gap-2 mt-4 pt-4 border-t">
              {!documentStatus?.photoId.uploaded && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => photoIdRef.current?.click()}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Upload Photo ID
                </Button>
              )}
              {!documentStatus?.proofOfAddress.uploaded && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => proofAddressRef.current?.click()}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Upload Proof of Address
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Tips */}
      {verificationTips && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            Document Requirements
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setVerificationTips(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              <p><strong>Photo ID:</strong> Valid passport, driving license, or national ID card</p>
              <p><strong>Proof of Address:</strong> Council tax bill, utility bill, or bank statement (dated within 3 months)</p>
              <p><strong>File Requirements:</strong> Clear, readable images in JPEG, PNG, or PDF format (max 5MB)</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">Upload Documents</TabsTrigger>
          <TabsTrigger value="status">Verification Status</TabsTrigger>
          <TabsTrigger value="help">Help & Guidelines</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderUploadArea('photoId', 'Photo ID', 'Upload a valid government-issued photo identification')}
            {renderUploadArea('proofOfAddress', 'Proof of Address', 'Upload a recent proof of your current address')}
          </div>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  Photo ID Status
                  {documentStatus?.photoId.uploaded && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        const doc = findDocumentByType('photo_id');
                        if (doc) handleShowDocumentHistory(doc.id);
                      }}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Document Status</span>
                    {documentStatus && getStatusBadge(documentStatus.photoId.status)}
                  </div>
                  {documentStatus?.photoId.uploaded && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Filename</span>
                        <span className="text-sm font-mono">{documentStatus.photoId.filename}</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            const doc = findDocumentByType('photo_id');
                            if (doc) handleViewDocument(doc.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            const doc = findDocumentByType('photo_id');
                            if (doc) handleDownloadDocument(doc.id, doc.name);
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </>
                  )}
                  {documentStatus?.photoId.status === 'rejected' && documentStatus.photoId.rejectionReason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800 font-medium">Rejection Reason:</p>
                      <p className="text-sm text-red-700 mt-1">{documentStatus.photoId.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  Proof of Address Status
                  {documentStatus?.proofOfAddress.uploaded && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        const doc = findDocumentByType('proof_address');
                        if (doc) handleShowDocumentHistory(doc.id);
                      }}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Document Status</span>
                    {documentStatus && getStatusBadge(documentStatus.proofOfAddress.status)}
                  </div>
                  {documentStatus?.proofOfAddress.uploaded && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Filename</span>
                        <span className="text-sm font-mono">{documentStatus.proofOfAddress.filename}</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            const doc = findDocumentByType('proof_address');
                            if (doc) handleViewDocument(doc.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            const doc = findDocumentByType('proof_address');
                            if (doc) handleDownloadDocument(doc.id, doc.name);
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </>
                  )}
                  {documentStatus?.proofOfAddress.status === 'rejected' && documentStatus.proofOfAddress.rejectionReason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800 font-medium">Rejection Reason:</p>
                      <p className="text-sm text-red-700 mt-1">{documentStatus.proofOfAddress.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="help" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2" />
                  Acceptable Photo ID
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✓ Valid passport (any country)</li>
                  <li>✓ UK driving license (full or provisional)</li>
                  <li>✓ National identity card</li>
                  <li>✓ EU identity card</li>
                  <li>✗ Expired documents</li>
                  <li>✗ Student ID cards</li>
                  <li>✗ Work ID badges</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Acceptable Proof of Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✓ Council tax bill (within 3 months)</li>
                  <li>✓ Utility bill (gas, electric, water)</li>
                  <li>✓ Bank or credit card statement</li>
                  <li>✓ Tenancy agreement</li>
                  <li>✓ Official government letter</li>
                  <li>✗ Mobile phone bills</li>
                  <li>✗ Insurance documents</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Photo Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-green-600 mb-2">✓ Good Examples</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Clear, well-lit photos</li>
                    <li>• All text is readable</li>
                    <li>• Full document visible</li>
                    <li>• Straight, not tilted</li>
                    <li>• High contrast</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-red-600 mb-2">✗ Avoid</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Blurry or dark photos</li>
                    <li>• Glare or shadows</li>
                    <li>• Partial documents</li>
                    <li>• Tilted or rotated</li>
                    <li>• Low resolution</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document History Dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <History className="h-5 w-5 mr-2" />
              Document History
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {documentHistory.length > 0 ? (
              <div className="space-y-3">
                {documentHistory.map((entry, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {entry.action === 'uploaded' && <Upload className="h-4 w-4 text-blue-500" />}
                      {entry.action === 'approved' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {entry.action === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
                      {entry.action === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{entry.action}</p>
                      <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
                      {entry.notes && <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>}
                      {entry.admin && <p className="text-xs text-muted-foreground">by {entry.admin}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No history available for this document</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
