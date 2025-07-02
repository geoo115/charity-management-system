import { getFromLocalStorage } from '@/lib/hooks/use-local-storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Get auth token for API requests
const getAuthToken = () => {
  return getFromLocalStorage('auth_token') || getFromLocalStorage('token');
};

// Create API headers with authentication
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Create API headers for file uploads (no Content-Type to let browser set it)
const getAuthHeadersForUpload = () => {
  const token = getAuthToken();
  return {
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Handle API responses and errors
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

export interface Document {
  id: number;
  user_id: number;
  type: string;
  name: string;
  title?: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  status: 'pending' | 'approved' | 'rejected';
  description?: string;
  verified_by?: number;
  verified_at?: string;
  uploaded_at: string;
  rejection_reason?: string;
  notes?: string;
  expires_at?: string;
  is_private: boolean;
  checksum?: string;
  created_at: string;
  updated_at: string;
  file_url?: string;
}

export interface DocumentStatus {
  photoId: {
    uploaded: boolean;
    status: 'pending' | 'approved' | 'rejected';
    filename?: string;
    rejectionReason?: string;
  };
  proofOfAddress: {
    uploaded: boolean;
    status: 'pending' | 'approved' | 'rejected';
    filename?: string;
    rejectionReason?: string;
  };
}

/**
 * Get all documents for the current user
 */
export const getUserDocuments = async (): Promise<Document[]> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/documents`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Upload a document
 */
export const uploadDocument = async (
  file: File, 
  type: string, 
  title?: string, 
  description?: string
): Promise<Document> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  if (title) formData.append('title', title);
  if (description) formData.append('description', description);

  const response = await fetch(`${API_BASE_URL}/api/v1/documents/upload`, {
    method: 'POST',
    headers: getAuthHeadersForUpload(),
    body: formData,
  });

  return handleResponse(response);
};

/**
 * Upload visitor-specific document (legacy route support)
 */
export const uploadVisitorDocument = async (
  file: File, 
  type: 'photo_id' | 'proof_address',
  description?: string
): Promise<any> => {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('type', type);
  if (description) formData.append('description', description);

  const response = await fetch(`${API_BASE_URL}/api/v1/visitors/documents/upload`, {
    method: 'POST',
    headers: getAuthHeadersForUpload(),
    body: formData,
  });

  return handleResponse(response);
};

/**
 * Get visitor documents (using visitor-specific endpoint)
 */
export const getVisitorDocuments = async (): Promise<Document[]> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/visitors/documents`, {
    headers: getAuthHeaders(),
  });

  const data = await handleResponse(response);
  
  // Handle case where backend returns null for no documents
  return Array.isArray(data) ? data : [];
};

/**
 * Transform backend documents to DocumentStatus format for the UI
 */
export const transformDocumentsToStatus = (documents: Document[] | null): DocumentStatus => {
  // Handle null or undefined documents array
  const documentsArray = documents || [];
  
  const photoId = documentsArray.find(doc => doc.type === 'photo_id' || doc.type === 'id');
  const proofOfAddress = documentsArray.find(doc => doc.type === 'proof_address' || doc.type === 'proof_of_address');

  return {
    photoId: {
      uploaded: !!photoId,
      status: photoId?.status || 'pending',
      filename: photoId?.name,
      rejectionReason: photoId?.rejection_reason,
    },
    proofOfAddress: {
      uploaded: !!proofOfAddress,
      status: proofOfAddress?.status || 'pending',
      filename: proofOfAddress?.name,
      rejectionReason: proofOfAddress?.rejection_reason,
    },
  };
};

/**
 * Get document by ID for viewing
 */
export const getDocument = async (id: number): Promise<Document> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/documents/${id}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Download document by ID
 */
export const downloadDocument = async (id: number): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/documents/${id}/download`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to download document');
  }

  return response.blob();
};

/**
 * View document (get file URL)
 */
export const getDocumentViewUrl = (id: number): string => {
  const token = getAuthToken();
  return `${API_BASE_URL}/api/v1/documents/view/${id}${token ? `?token=${token}` : ''}`;
};

/**
 * Delete document by ID
 */
export const deleteDocument = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/documents/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete document');
  }
};

/**
 * Get document verification history
 */
export const getDocumentHistory = async (id: number): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/documents/${id}/history`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Get visitor document statistics
 */
export const getVisitorDocumentStats = async (): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completion_percentage: number;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/visitor/documents/stats`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};
