'use client';

import React, { Suspense, memo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dots' | 'pulse' | 'skeleton';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

/**
 * Advanced loading spinner with multiple variants and animations
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = memo(({
  size = 'md',
  variant = 'default',
  text,
  className,
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const containerClasses = cn(
    'flex flex-col items-center justify-center space-y-2',
    fullScreen && 'min-h-screen',
    className
  );

  if (variant === 'dots') {
    return (
      <div className={containerClasses}>
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-green-500 rounded-full"
              animate={{
                y: [0, -10, 0],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
        {text && <p className="text-sm text-gray-600 mt-2">{text}</p>}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={containerClasses}>
        <motion.div
          className={cn(
            'bg-green-500 rounded-full',
            sizeClasses[size]
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity
          }}
        />
        {text && <p className="text-sm text-gray-600 mt-2">{text}</p>}
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className={containerClasses}>
        <div className="w-full max-w-sm space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <Loader2 
        className={cn(
          'animate-spin text-green-500',
          sizeClasses[size]
        )}
        aria-hidden="true"
      />
      {text && <p className="text-sm text-gray-600 mt-2">{text}</p>}
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

/**
 * Advanced error fallback component with retry functionality
 */
interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
  title?: string;
  description?: string;
  showRetry?: boolean;
  className?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = memo(({
  error,
  resetErrorBoundary,
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  showRetry = true,
  className
}) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[300px] p-6',
      className
    )}>
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {description}
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {error.message}
                </pre>
              </details>
            )}

            {showRetry && resetErrorBoundary && (
              <Button 
                onClick={resetErrorBoundary}
                className="w-full"
              >
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

ErrorFallback.displayName = 'ErrorFallback';

/**
 * Network status indicator
 */
export const NetworkStatus: React.FC = memo(() => {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-2 text-sm text-center z-50"
    >
      <div className="flex items-center justify-center space-x-2">
        <WifiOff className="h-4 w-4" />
        <span>No internet connection</span>
      </div>
    </motion.div>
  );
});

NetworkStatus.displayName = 'NetworkStatus';

/**
 * Advanced suspense wrapper with custom fallbacks
 */
interface SuspenseWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  loadingText?: string;
}

export const SuspenseWrapper: React.FC<SuspenseWrapperProps> = memo(({
  children,
  fallback,
  errorFallback,
  loadingText = 'Loading...'
}) => {
  const defaultFallback = (
    <LoadingSpinner 
      size="lg" 
      text={loadingText}
      fullScreen={false}
      className="py-12"
    />
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
});

SuspenseWrapper.displayName = 'SuspenseWrapper';

/**
 * Page transition wrapper
 */
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = memo(({
  children,
  className
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

PageTransition.displayName = 'PageTransition';

/**
 * Skeleton loader for specific content types
 */
interface SkeletonLoaderProps {
  type: 'card' | 'list' | 'table' | 'profile' | 'dashboard';
  count?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = memo(({
  type,
  count = 1,
  className
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2" />
            </div>
          </Card>
        );
      
      case 'list':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3 mt-1" />
              </div>
            </div>
          </div>
        );
      
      case 'profile':
        return (
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
            </div>
          </div>
        );
      
      case 'dashboard':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3" />
                </div>
              </Card>
            ))}
          </div>
        );
      
      default:
        return (
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
        );
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
});

SkeletonLoader.displayName = 'SkeletonLoader';

export default {
  LoadingSpinner,
  ErrorFallback,
  NetworkStatus,
  SuspenseWrapper,
  PageTransition,
  SkeletonLoader
};
