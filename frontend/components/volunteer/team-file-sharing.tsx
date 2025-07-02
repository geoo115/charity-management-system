'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Download, 
  File, 
  Folder, 
  Image, 
  FileText, 
  Video, 
  Music,
  Archive,
  Trash2,
  Share2,
  Eye,
  Lock,
  Users,
  Calendar,
  Search,
  Filter,
  Grid,
  List
} from 'lucide-react';

interface TeamFile {
  id: string;
  name: string;
  original_name: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  uploaded_by: {
    id: number;
    name: string;
  };
  uploaded_at: string;
  team_id: number;
  folder_id?: string;
  description?: string;
  tags: string[];
  download_count: number;
  is_public: boolean;
  permissions: 'read' | 'write' | 'admin';
  thumbnail_url?: string;
}

interface TeamFolder {
  id: string;
  name: string;
  description?: string;
  created_by: number;
  created_at: string;
  parent_id?: string;
  file_count: number;
  permissions: 'read' | 'write' | 'admin';
}

interface TeamFileSharingProps {
  teamId: number;
  onFileUpload?: (file: File, metadata: any) => Promise<void>;
  onFileDownload?: (fileId: string) => Promise<void>;
  onFileDelete?: (fileId: string) => Promise<void>;
  onFolderCreate?: (folderData: any) => Promise<void>;
}

export default function TeamFileSharing({
  teamId,
  onFileUpload,
  onFileDownload,
  onFileDelete,
  onFolderCreate
}: TeamFileSharingProps) {
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [folders, setFolders] = useState<TeamFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'downloads'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFiles();
    loadFolders();
  }, [teamId, currentFolder]);

  const loadFiles = async () => {
    try {
      const response = await fetch(`/api/v1/volunteer/lead/teams/${teamId}/files?folder_id=${currentFolder || ''}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const loadFolders = async () => {
    try {
      const response = await fetch(`/api/v1/volunteer/lead/teams/${teamId}/folders?parent_id=${currentFolder || ''}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const handleFileUpload = async (files: FileList, metadata: any = {}) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('team_id', teamId.toString());
        formData.append('folder_id', currentFolder || '');
        formData.append('description', metadata.description || '');
        formData.append('tags', metadata.tags || '');
        formData.append('is_public', metadata.is_public || 'false');

        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            setFiles(prev => [response.file, ...prev]);
            setUploadProgress(0);
          }
        });

        xhr.open('POST', '/api/v1/volunteer/lead/teams/files/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
        xhr.send(formData);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
      setShowUploadDialog(false);
    }
  };

  const handleFileDownload = async (fileId: string) => {
    try {
      const response = await fetch(`/api/v1/volunteer/lead/teams/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = files.find(f => f.id === fileId)?.original_name || 'download';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Update download count
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, download_count: f.download_count + 1 } : f
        ));
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`/api/v1/volunteer/lead/teams/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleFolderCreate = async (folderData: any) => {
    try {
      const response = await fetch('/api/v1/volunteer/lead/teams/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...folderData,
          team_id: teamId,
          parent_id: currentFolder
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(prev => [data.folder, ...prev]);
        setShowFolderDialog(false);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const getFileIcon = (fileType: string, mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Video className="h-8 w-8 text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-8 w-8 text-green-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive className="h-8 w-8 text-orange-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredAndSortedFiles = files
    .filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           file.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || file.file_type === filterType;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
          break;
        case 'size':
          comparison = a.file_size - b.file_size;
          break;
        case 'downloads':
          comparison = a.download_count - b.download_count;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Folder className="h-6 w-6 text-blue-600" />
            <span>Team File Sharing</span>
          </h2>
          <p className="text-gray-600 mt-1">Share documents and resources with your team</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowFolderDialog(true)}
          >
            <Folder className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button
            onClick={() => setShowUploadDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <button
          onClick={() => setCurrentFolder(null)}
          className="hover:text-blue-600"
        >
          Home
        </button>
        {currentFolder && (
          <>
            <span>/</span>
            <span className="text-gray-900">
              {folders.find(f => f.id === currentFolder)?.name || 'Unknown'}
            </span>
          </>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="archive">Archives</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="size">Size</SelectItem>
            <SelectItem value="downloads">Downloads</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </Button>
        <div className="flex border rounded-lg">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Upload className="h-5 w-5 text-blue-600 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium">Uploading files...</p>
                <Progress value={uploadProgress} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Drop files here to upload
        </p>
        <p className="text-gray-600">
          or click the upload button above
        </p>
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Folders</h3>
          <div className={`grid gap-4 ${
            viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'
          }`}>
            {folders.map((folder) => (
              <Card
                key={folder.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setCurrentFolder(folder.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Folder className="h-8 w-8 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{folder.name}</p>
                      <p className="text-sm text-gray-600">{folder.file_count} files</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Files</h3>
        {filteredAndSortedFiles.length > 0 ? (
          <div className={`grid gap-4 ${
            viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'
          }`}>
            {filteredAndSortedFiles.map((file) => (
              <Card key={file.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getFileIcon(file.file_type, file.mime_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-sm text-gray-600">{formatFileSize(file.file_size)}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(file.uploaded_at)} • {file.download_count} downloads
                      </p>
                      {file.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{file.description}</p>
                      )}
                      {file.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {file.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {file.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{file.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center space-x-1">
                      {file.is_public ? (
                        <Users className="h-4 w-4 text-green-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="text-xs text-gray-500">
                        {file.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleFileDownload(file.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleFileDelete(file.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No files found</p>
            <p className="text-sm">Upload some files to get started!</p>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Upload files to share with your team.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Select Files</Label>
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileUpload(e.target.files);
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label>Description (Optional)</Label>
              <Textarea placeholder="Add a description for the files..." />
            </div>
            <div className="grid gap-2">
              <Label>Tags (Optional)</Label>
              <Input placeholder="Enter tags separated by commas..." />
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="is-public" />
              <Label htmlFor="is-public">Make files public to team</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => fileInputRef.current?.click()}>
              Select Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Folder Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your files.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input id="folder-name" placeholder="Enter folder name..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="folder-description">Description (Optional)</Label>
              <Textarea id="folder-description" placeholder="Add a description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              const name = (document.getElementById('folder-name') as HTMLInputElement)?.value;
              const description = (document.getElementById('folder-description') as HTMLTextAreaElement)?.value;
              if (name) {
                handleFolderCreate({ name, description });
              }
            }}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 