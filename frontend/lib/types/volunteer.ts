export interface VolunteerShift {
  id: number;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  enrolled: number;
  requirements?: string[];
  coordinator: string;
  status: 'open' | 'full' | 'cancelled' | 'completed' | 'upcoming' | 'in-progress';
  role: string;
  requiredSkills?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  skills?: string[];
  impact?: 'low' | 'medium' | 'high';
  timeCommitment?: string;
  contactInfo?: {
    phone: string;
    email: string;
  };
  // Flexible shift support
  type?: 'fixed' | 'flexible' | 'open';
  openEnded?: boolean;
  minimumHours?: number;
  maximumHours?: number;
  flexibleTimeRange?: {
    start: string;
    end: string;
  };
}

// Alias for compatibility
export interface Shift extends VolunteerShift {}

export interface ShiftApplication {
  shiftId: number;
  volunteerId: number;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
}

export interface FlexibleShiftSignup {
  shiftId: number;
  volunteerId: number;
  selectedStartTime: string;
  selectedEndTime: string;
  duration: number;
  requestedAt: string;
  status: 'pending' | 'confirmed' | 'rejected';
}

export interface VolunteerProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  skills: string[];
  availability: {
    days: string[];
    timeSlots: string[];
    preferences?: string;
  };
  experience?: string;
  motivation?: string;
  backgroundCheck?: {
    status: 'pending' | 'approved' | 'rejected';
    completedAt?: string;
  };
  joinedAt: string;
  status: 'active' | 'inactive' | 'suspended';
  level: 'new' | 'regular' | 'experienced' | 'leader';
}

export interface VolunteerDashboardStats {
  upcomingShifts: number;
  hoursThisMonth: number;
  totalHours: number;
  peopleHelped: number;
  level: string;
  nextShift?: VolunteerShift;
  achievements: Achievement[];
  recentActivity: Activity[];
  impactScore?: number;
  streak?: number;
  nextMilestone?: string;
  milestonePorgress?: number;
  skills?: string[];
  preferredLocations?: string[];
}

export interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
  category: 'hours' | 'service' | 'training' | 'leadership' | 'impact' | 'attendance' | 'quality';
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Activity {
  id: number;
  type: 'shift_completed' | 'training_completed' | 'achievement_earned' | 'help_request_assigned';
  description: string;
  date: string;
  category: string;
  metadata?: any;
  impact?: 'low' | 'medium' | 'high';
}

export interface VolunteerNotification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  actionText?: string;
}

export interface NotificationSettings {
  emailNotifications: {
    shiftReminders: boolean;
    shiftChanges: boolean;
    newOpportunities: boolean;
    achievements: boolean;
    announcements: boolean;
  };
  smsNotifications: {
    shiftReminders: boolean;
    emergencyShifts: boolean;
  };
  pushNotifications: {
    enabled: boolean;
    shiftReminders: boolean;
    realTimeUpdates: boolean;
  };
}

export interface TrainingModule {
  id: number;
  title: string;
  description: string;
  duration: number; // in minutes
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  required: boolean;
  prerequisites?: number[];
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: string;
  progress?: number; // 0-100
}

export interface TrainingCertificate {
  id: number;
  title: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string;
  downloadUrl: string;
  verificationCode: string;
}

export interface VolunteerTask {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedAt: string;
  dueDate?: string;
  completedAt?: string;
  instructions?: string;
  estimatedDuration?: number;
}

export interface PerformanceMetrics {
  totalHours: number;
  shiftsCompleted: number;
  averageRating: number;
  punctualityScore: number;
  reliabilityScore: number;
  leadershipScore: number;
  impactScore?: number;
  streakDays?: number;
  volunteersHelped?: number;
  monthlyHours: { month: string; hours: number; shifts?: number; rating?: number }[];
  weeklyTrends?: { week: string; hours: number; efficiency: number; satisfaction: number }[];
  skillsAssessment: { skill: string; level: number; growth?: number; target?: number }[];
  feedback: {
    positive: number;
    neutral: number;
    negative: number;
    recentComments?: {
      rating: number;
      comment: string;
      date: string;
      coordinator: string;
    }[];
  };
  achievements?: Achievement[];
  milestones?: {
    title: string;
    achieved: boolean;
    progress: number;
  }[];
}

export interface VolunteerRanking {
  rank: number;
  totalVolunteers: number;
  category: 'hours' | 'impact' | 'reliability' | 'leadership';
  score: number;
  percentile?: number;
  topVolunteers: {
    rank: number;
    name: string;
    score: number;
    avatar?: string;
    trend?: 'up' | 'down' | 'stable';
  }[];
  categoryRankings?: {
    category: string;
    rank: number;
    score: number;
  }[];
}

export interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  totalHours: number;
  shiftsThisWeek: number;
  upcomingShifts: number;
  averageRating?: number;
  recentAchievements: Achievement[];
  departmentStats?: {
    department: string;
    members: number;
    hours: number;
    efficiency: number;
  }[];
}

// Volunteer application status tracking
export interface VolunteerApplicationStatus {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'additional_info_required';
  submittedAt: string;
  lastUpdated: string;
  reviewedBy?: string;
  reviewedAt?: string | null;
  notes?: string | null;
  requiredDocuments: {
    type: string;
    status: 'completed' | 'pending' | 'not_started' | 'rejected';
    required: boolean;
    description: string;
  }[];
  nextSteps?: string[];
  estimatedCompletionDate?: string;
  contactInfo: {
    coordinatorName: string;
    coordinatorEmail: string;
    coordinatorPhone: string;
    officeHours: string;
  };
}

// Volunteer role information
export interface VolunteerRoleInfo {
  role_level: 'general' | 'specialized' | 'lead';
  specializations: string[];
  leadership_skills: string;
  can_train_others: boolean;
  can_manage_shifts: boolean;
  emergency_response: boolean;
  permissions: Record<string, boolean>;
  mentor?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  team_members: number[];
}
