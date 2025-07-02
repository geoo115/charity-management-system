'use client';

import React, { forwardRef, useState, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  Check, 
  X, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  ChevronDown,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { designTokens } from './tokens';

// Enhanced Button Component
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500 shadow-sm hover:shadow-md',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500 border border-gray-200',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 focus-visible:ring-gray-500',
        ghost: 'hover:bg-gray-100 focus-visible:ring-gray-500',
        destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm hover:shadow-md',
        success: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500 shadow-sm hover:shadow-md',
        warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus-visible:ring-yellow-500 shadow-sm hover:shadow-md',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const EnhancedButton = forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, fullWidth, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(
          buttonVariants({ variant, size, className }),
          fullWidth && 'w-full'
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && leftIcon && leftIcon}
        {children}
        {!loading && rightIcon && rightIcon}
      </button>
    );
  }
);
EnhancedButton.displayName = 'EnhancedButton';

// Enhanced Input Component
const inputVariants = cva(
  'flex w-full rounded-md border bg-white px-3 py-2 text-sm transition-all duration-200 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-gray-300 focus-visible:ring-green-500 focus-visible:border-green-500',
        error: 'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500',
        success: 'border-green-500 focus-visible:ring-green-500 focus-visible:border-green-500',
      },
      inputSize: {
        sm: 'h-8 text-xs',
        md: 'h-10',
        lg: 'h-12 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
    },
  }
);

interface EnhancedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ 
    className, 
    variant, 
    inputSize, 
    label, 
    error, 
    helperText, 
    leftIcon, 
    rightIcon, 
    showPasswordToggle,
    type,
    id,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const inputType = showPasswordToggle && type === 'password' ? (showPassword ? 'text' : 'password') : type;

    const effectiveVariant = error ? 'error' : variant;

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={inputId} 
            className="text-sm font-medium text-gray-700 block"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            className={cn(
              inputVariants({ variant: effectiveVariant, inputSize, className }),
              leftIcon && 'pl-10',
              (rightIcon || showPasswordToggle) && 'pr-10',
              isFocused && 'ring-2 ring-offset-2'
            )}
            ref={ref}
            type={inputType}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
          {rightIcon && !showPasswordToggle && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              {rightIcon}
            </div>
          )}
        </div>
        {(error || helperText) && (
          <div className="text-sm">
            {error && (
              <div className="text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            {helperText && !error && (
              <div className="text-gray-600">{helperText}</div>
            )}
          </div>
        )}
      </div>
    );
  }
);
EnhancedInput.displayName = 'EnhancedInput';

// Enhanced Card Component
const cardVariants = cva(
  'rounded-lg border bg-white shadow-sm transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border-gray-200',
        elevated: 'border-gray-200 shadow-md hover:shadow-lg',
        interactive: 'border-gray-200 hover:border-gray-300 hover:shadow-md cursor-pointer',
        success: 'border-green-200 bg-green-50',
        warning: 'border-yellow-200 bg-yellow-50',
        error: 'border-red-200 bg-red-50',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

interface EnhancedCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const EnhancedCard = forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ className, variant, padding, header, footer, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, className }))}
        {...props}
      >
        {header && (
          <div className="border-b border-gray-200 pb-4 mb-4">
            {header}
          </div>
        )}
        {children}
        {footer && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            {footer}
          </div>
        )}
      </div>
    );
  }
);
EnhancedCard.displayName = 'EnhancedCard';

// Enhanced Alert Component
const alertVariants = cva(
  'relative w-full rounded-lg border p-4 flex items-start gap-3',
  {
    variants: {
      variant: {
        info: 'border-blue-200 bg-blue-50 text-blue-800',
        success: 'border-green-200 bg-green-50 text-green-800',
        warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
        error: 'border-red-200 bg-red-50 text-red-800',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);

interface EnhancedAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const EnhancedAlert = forwardRef<HTMLDivElement, EnhancedAlertProps>(
  ({ className, variant, title, dismissible, onDismiss, children, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(true);

    const handleDismiss = () => {
      setIsVisible(false);
      onDismiss?.();
    };

    const getIcon = () => {
      switch (variant) {
        case 'success':
          return <Check className="h-5 w-5 text-green-600" />;
        case 'warning':
          return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
        case 'error':
          return <AlertCircle className="h-5 w-5 text-red-600" />;
        default:
          return <Info className="h-5 w-5 text-blue-600" />;
      }
    };

    if (!isVisible) return null;

    return (
      <div
        ref={ref}
        className={cn(
          alertVariants({ variant, className }),
          'animate-in fade-in-0 slide-in-from-top-1 duration-300'
        )}
        {...props}
      >
        {getIcon()}
        <div className="flex-1">
          {title && (
            <h4 className="font-medium mb-1">{title}</h4>
          )}
          <div className="text-sm">{children}</div>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
EnhancedAlert.displayName = 'EnhancedAlert';

// Enhanced Loading Component
interface EnhancedLoadingProps {
  variant?: 'spinner' | 'dots' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export const EnhancedLoading: React.FC<EnhancedLoadingProps> = ({ 
  variant = 'spinner', 
  size = 'md', 
  text, 
  fullScreen,
  className 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const renderSpinner = () => (
    <Loader2 className={cn('animate-spin text-green-600', sizeClasses[size])} />
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'bg-green-600 rounded-full animate-pulse',
            size === 'sm' && 'h-2 w-2',
            size === 'md' && 'h-3 w-3',
            size === 'lg' && 'h-4 w-4'
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s',
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div className={cn(
      'bg-green-600 rounded-full animate-pulse',
      sizeClasses[size]
    )} />
  );

  const content = (
    <div className={cn(
      'flex items-center justify-center gap-3',
      fullScreen && 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50',
      className
    )}>
      <div className="flex flex-col items-center gap-3">
        {variant === 'spinner' && renderSpinner()}
        {variant === 'dots' && renderDots()}
        {variant === 'pulse' && renderPulse()}
        {text && (
          <div className="text-sm text-gray-600 font-medium">
            {text}
          </div>
        )}
      </div>
    </div>
  );

  return content;
};

// Export all components
export {
  buttonVariants,
  inputVariants,
  cardVariants,
  alertVariants,
};

export type {
  EnhancedButtonProps,
  EnhancedInputProps,
  EnhancedCardProps,
  EnhancedAlertProps,
  EnhancedLoadingProps,
}; 