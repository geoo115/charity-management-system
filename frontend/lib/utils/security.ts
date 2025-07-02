'use client';

import { z } from 'zod';

/**
 * Input sanitization utilities to prevent XSS attacks
 */
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS (fallback without DOMPurify)
   */
  static sanitizeHtml(input: string): string {
    // Basic HTML sanitization without DOMPurify
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Sanitize plain text input
   */
  static sanitizeText(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .slice(0, 1000); // Limit length
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^\w@.-]/g, ''); // Allow only word chars, @, ., -
  }

  /**
   * Sanitize phone number input
   */
  static sanitizePhone(input: string): string {
    return input.replace(/[^\d+\-\s()]/g, ''); // Allow only digits, +, -, space, parentheses
  }

  /**
   * Sanitize search query
   */
  static sanitizeSearchQuery(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '')
      .replace(/[^\w\s\-_.]/g, '') // Allow word chars, spaces, hyphens, underscores, dots
      .slice(0, 100);
  }
}

/**
 * Enhanced validation schemas using Zod
 */
export const ValidationSchemas = {
  // User validation
  user: z.object({
    firstName: z.string()
      .min(1, 'First name is required')
      .max(50, 'First name must be less than 50 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
    
    lastName: z.string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must be less than 50 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
    
    email: z.string()
      .email('Invalid email address')
      .max(254, 'Email address is too long'),
    
    phone: z.string()
      .regex(/^[\+]?[\d\s\-\(\)]{10,}$/, 'Invalid phone number format')
      .optional(),
    
    dateOfBirth: z.date()
      .max(new Date(), 'Date of birth cannot be in the future')
      .min(new Date('1900-01-01'), 'Invalid date of birth')
      .optional(),
  }),

  // Help request validation
  helpRequest: z.object({
    title: z.string()
      .min(5, 'Title must be at least 5 characters')
      .max(100, 'Title must be less than 100 characters'),
    
    description: z.string()
      .min(20, 'Description must be at least 20 characters')
      .max(1000, 'Description must be less than 1000 characters'),
    
    category: z.enum(['food', 'housing', 'healthcare', 'education', 'employment', 'other']),
    
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    
    contactMethod: z.enum(['email', 'phone', 'both']),
  }),

  // Volunteer application validation
  volunteerApplication: z.object({
    motivation: z.string()
      .min(50, 'Please provide at least 50 characters explaining your motivation')
      .max(500, 'Motivation must be less than 500 characters'),
    
    availability: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']))
      .min(1, 'Please select at least one day of availability'),
    
    skills: z.array(z.string())
      .min(1, 'Please select at least one skill'),
    
    experience: z.string()
      .max(1000, 'Experience description must be less than 1000 characters')
      .optional(),
    
    backgroundCheck: z.boolean()
      .refine(val => val === true, 'Background check consent is required'),
  }),

  // Search validation
  search: z.object({
    query: z.string()
      .min(1, 'Search query cannot be empty')
      .max(100, 'Search query is too long')
      .regex(/^[a-zA-Z0-9\s\-_.]*$/, 'Search query contains invalid characters'),
    
    filters: z.object({
      category: z.string().optional(),
      status: z.string().optional(),
      dateRange: z.object({
        from: z.date().optional(),
        to: z.date().optional(),
      }).optional(),
    }).optional(),
  }),

  // Feedback validation
  feedback: z.object({
    rating: z.number()
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating cannot be more than 5'),
    
    comment: z.string()
      .min(10, 'Comment must be at least 10 characters')
      .max(500, 'Comment must be less than 500 characters'),
    
    category: z.enum(['service', 'website', 'staff', 'process', 'other']),
    
    anonymous: z.boolean().default(false),
  }),
};

/**
 * Rate limiting utilities
 */
export class RateLimiter {
  private static attempts: Map<string, { count: number; resetTime: number }> = new Map();

  /**
   * Check if action is rate limited
   */
  static isRateLimited(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return false;
    }

    if (record.count >= maxAttempts) {
      return true;
    }

    record.count++;
    return false;
  }

  /**
   * Reset rate limit for a key
   */
  static resetRateLimit(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Get remaining attempts
   */
  static getRemainingAttempts(key: string, maxAttempts: number = 5): number {
    const record = this.attempts.get(key);
    if (!record || Date.now() > record.resetTime) {
      return maxAttempts;
    }
    return Math.max(0, maxAttempts - record.count);
  }
}

/**
 * Password strength validation
 */
export class PasswordValidator {
  static validateStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) {
      score += 2;
    } else {
      feedback.push('Password must be at least 8 characters long');
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password should contain at least one uppercase letter');
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password should contain at least one lowercase letter');
    }

    // Number check
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password should contain at least one number');
    }

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 2;
    } else {
      feedback.push('Password should contain at least one special character');
    }

    // Common passwords check
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890'
    ];
    
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      score -= 3;
      feedback.push('Password contains common words and is easily guessable');
    }

    return {
      isValid: score >= 5 && feedback.length === 0,
      score: Math.max(0, Math.min(10, score)),
      feedback
    };
  }
}

/**
 * CSRF protection utilities
 */
export class CSRFProtection {
  private static token: string | null = null;

  /**
   * Generate CSRF token
   */
  static generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    this.token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return this.token;
  }

  /**
   * Get current CSRF token
   */
  static getToken(): string | null {
    return this.token;
  }

  /**
   * Validate CSRF token
   */
  static validateToken(token: string): boolean {
    return this.token !== null && this.token === token;
  }

  /**
   * Add CSRF token to headers
   */
  static addToHeaders(headers: HeadersInit = {}): HeadersInit {
    if (this.token) {
      return {
        ...headers,
        'X-CSRF-Token': this.token,
      };
    }
    return headers;
  }
}

/**
 * Content Security Policy helpers
 */
export class CSPHelper {
  /**
   * Generate nonce for inline scripts
   */
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Validate if URL is allowed by CSP
   */
  static isAllowedURL(url: string, allowedDomains: string[]): boolean {
    try {
      const urlObj = new URL(url);
      return allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }
}

/**
 * File upload validation
 */
export class FileValidator {
  static validateFile(
    file: File,
    options: {
      maxSize?: number; // in bytes
      allowedTypes?: string[];
      allowedExtensions?: string[];
    } = {}
  ): { isValid: boolean; errors: string[] } {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
    } = options;

    const errors: string[] = [];

    // Size validation
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    // Type validation
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // Extension validation
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      errors.push(`File extension ${extension} is not allowed`);
    }

    // Filename validation
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      errors.push('Filename contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default {
  InputSanitizer,
  ValidationSchemas,
  RateLimiter,
  PasswordValidator,
  CSRFProtection,
  CSPHelper,
  FileValidator
};
