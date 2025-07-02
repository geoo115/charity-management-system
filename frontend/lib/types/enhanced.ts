/**
 * Enhanced type definitions for better type safety and developer experience
 */

// Base types with strict validation
export interface BaseEntity {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// User types with role-based permissions
export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  permissions: Permission[];
  preferences: UserPreferences;
}

export type UserRole = 'Admin' | 'Volunteer' | 'Visitor' | 'Donor';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationPreferences;
  accessibility: AccessibilityPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
}

export interface AccessibilityPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xl';
  screenReader: boolean;
}

// API response types with strict error handling
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  errors?: ApiError[];
  pagination?: PaginationInfo;
  meta?: Record<string, any>;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Volunteer specific types
export interface VolunteerRole {
  id: string;
  name: string;
  level: 'General' | 'Specialized' | 'Lead';
  permissions: string[];
  capabilities: VolunteerCapability[];
  specializations: string[];
  requirements: RoleRequirement[];
  isActive: boolean;
}

export interface VolunteerCapability {
  id: string;
  name: string;
  category: 'training' | 'management' | 'emergency' | 'specialized';
  level: number;
  certificationRequired: boolean;
}

export interface RoleRequirement {
  type: 'training' | 'experience' | 'certification' | 'background_check';
  description: string;
  isMandatory: boolean;
  validityPeriod?: number; // in days
}

// Enhanced notification types
export interface Notification extends BaseEntity {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  actionText?: string;
  data?: Record<string, any>;
  expiresAt?: Date;
}

export type NotificationType = 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'system' 
  | 'reminder'
  | 'announcement';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// Form and validation types
export interface FormFieldError {
  message: string;
  code: string;
}

export interface FormState<T = Record<string, any>> {
  values: T;
  errors: Record<keyof T, FormFieldError>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

// Performance and analytics types
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  bundleSize: number;
  memoryUsage: number;
  errorRate: number;
  userEngagement: EngagementMetrics;
}

export interface EngagementMetrics {
  sessionDuration: number;
  pageViews: number;
  clicksPerSession: number;
  bounceRate: number;
  conversionRate: number;
}

// Enhanced component props types
export interface ComponentProps {
  className?: string;
  'data-testid'?: string;
  'aria-label'?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
  lastAttempt: Date | null;
}

// Accessibility types
export interface AriaProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  role?: string;
}

// Theme and styling types
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

export interface Breakpoints {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

// Event types for better event handling
export type KeyboardEventHandler = (event: React.KeyboardEvent) => void;
export type MouseEventHandler = (event: React.MouseEvent) => void;
export type FormEventHandler<T = HTMLFormElement> = (event: React.FormEvent<T>) => void;

// Utility types for better TypeScript inference
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Function types with proper error handling
export type AsyncFunction<T = any, R = any> = (params: T) => Promise<R>;
export type ErrorHandler = (error: Error, context?: string) => void;
export type RetryFunction = () => Promise<void>;

// Configuration types
export interface AppConfig {
  apiBaseUrl: string;
  environment: 'development' | 'staging' | 'production';
  features: FeatureFlags;
  analytics: AnalyticsConfig;
  security: SecurityConfig;
}

export interface FeatureFlags {
  enhancedMode: boolean;
  realTimeUpdates: boolean;
  offlineMode: boolean;
  experimentalFeatures: boolean;
}

export interface AnalyticsConfig {
  enabled: boolean;
  trackingId: string;
  anonymizeIp: boolean;
  cookieConsent: boolean;
}

export interface SecurityConfig {
  csrf: boolean;
  xss: boolean;
  contentSecurityPolicy: boolean;
  sessionTimeout: number;
}
