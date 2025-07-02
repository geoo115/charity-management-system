export interface HelpRequest {
  id: number;
  reference: string;
  visitorId: number;
  visitorName: string;
  category: 'Food' | 'General' | 'food' | 'general';
  details: string;
  visitDay: string;
  visitDate?: string; // Optional alternative to visitDay for display
  timeSlot: string;
  status: 'Pending' | 'Approved' | 'TicketIssued' | 'Rejected' | 'Completed' | 'Cancelled' | 'CheckedIn';
  rejectionReason?: string;
  feedback?: string; // Admin feedback
  createdAt: string;
  updatedAt: string;
  submittedAt?: string; // Alternative name for createdAt
  ticketNumber?: string; // Optional ticket number when issued
  autoApproved?: boolean; // Whether the request was auto-approved
}

// Visitor eligibility API types and interfaces
export interface EligibilityStatus {
  eligible: boolean;
  verification_complete: boolean;
  photo_id_approved: boolean;
  proof_address_approved: boolean;
  account_active: boolean;
  recent_requests: number;
  total_requests?: number;
  suggested_urgency?: string;
  is_first_time?: boolean;
  categories: {
    food: {
      eligible: boolean;
      reason: string;
      available_days?: string[];
      available_times?: string[];
      visits_this_week?: number;
      last_visit_date?: string;
      next_eligible_date?: string;
    };
    general: {
      eligible: boolean;
      reason: string;
      available_days?: string[];
      available_times?: string[];
      is_first_time?: boolean;
      weeks_since_last_visit?: number;
      last_visit_date?: string;
      next_eligible_date?: string;
    };
  };
  next_steps?: string[];
}

export interface VisitorProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  dietaryRequirements?: string;
  householdSize: number;
  accessibilityNeeds?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  registrationDate: string;
  lastVisit?: string;
}

export interface Visit {
  id: number;
  reference: string;
  category: string;
  visitDate: string;
  timeSlot: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  checkInTime?: string;
  checkOutTime?: string;
  waitTime?: number; // Wait time in minutes
  services: string[];
  notes?: string;
  feedback?: {
    rating: number;
    comments: string;
  };
}

export interface QueueStatus {
  position: number;
  estimatedWaitTime: number;
  totalInQueue: number;
  currentlyServing: string;
  averageServiceTime: number;
  isActive: boolean;
}

export interface VisitorFeedback {
  id: number;
  visitId: number;
  overallRating: number;
  serviceRating: number;
  staffRating: number;
  waitTimeRating: number;
  comments: string;
  suggestions?: string;
  wouldRecommend: boolean;
  createdAt: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  capacity: number;
  booked: number;
}

export interface VisitorDashboardData {
  stats: {
    totalVisits: number;
    pendingRequests: number;
    completedVisits: number;
    upcomingTickets: number;
  };
  docStatus: {
    verificationComplete: boolean;
    photoIdApproved: boolean;
    proofAddressApproved: boolean;
  };
  recentActivity: HelpRequest[];
  upcomingVisit?: {
    id: number;
    reference: string;
    category: string;
    visitDate: string;
    timeSlot: string;
    status: string;
  } | null;
  pendingRequests: Array<{
    id: number;
    reference: string;
    category: string;
    status: string;
    createdAt: string;
  }>;
  nextSteps: string[];
  quickActions: Array<{
    title: string;
    path: string;
    available: boolean;
  }>;
}

// Enhanced Help Request types for 100% backend coverage
export interface HelpRequestExtended extends HelpRequest {
  visitor_id: number;
  visitor_name: string;
  email: string;
  phone: string;
  postcode: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  household_size?: number;
  special_requirements?: string;
  dietary_requirements?: string;
  assigned_staff_id?: number;
  assigned_staff_name?: string;
  assigned_datetime?: string;
  approved_at?: string;
  approved_by?: number;
  approved_by_name?: string;
  ticket_number?: string;
  qr_code?: string;
  eligibility_notes?: string;
  internal_notes?: string;
  visitor?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    postcode: string;
    status: string;
  };
}

export interface LegacyHelpRequestData {
  visitor_name: string;
  contact_email: string;
  contact_phone: string;
  postcode: string;
  category?: string;
  details: string;
}

export interface HelpRequestTimeline {
  id: number;
  action: string;
  description: string;
  performed_by: string;
  performed_by_name: string;
  performed_at: string;
  metadata?: any;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
}

export interface HelpRequestNote {
  id: number;
  note: string;
  is_internal: boolean;
  is_urgent: boolean;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface HelpRequestCapacity {
  date: string;
  category: string;
  max_capacity: number;
  current_bookings: number;
  available_slots: number;
  time_slots: Array<{
    time: string;
    available: boolean;
    booked_count: number;
    max_capacity: number;
  }>;
}

export interface BulkOperationResult {
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{
    id: number;
    error: string;
  }>;
}

export interface HelpRequestAdvancedFilters {
  status?: string;
  category?: string;
  priority?: string;
  page?: number;
  limit?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  visitor_id?: number;
  assigned_staff_id?: number;
}
