'use client';

import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { usePerformanceMonitor } from '@/lib/hooks/use-performance';
import { LoadingSpinner } from '@/components/common/loading-components';
import { ErrorBoundary } from '@/components/common/error-boundary';

// Dynamic imports for code splitting
const LazyVolunteerDashboard = dynamic(() => import('@/components/modern/volunteer-dashboard'), {
  loading: () => <LoadingSpinner variant="skeleton" />,
  ssr: false
});

const LazyAdminDashboard = dynamic(() => import('@/app/(dashboard)/admin/comprehensive/page'), {
  loading: () => <LoadingSpinner variant="pulse" />,
  ssr: false
});

const LazyVisitorDashboard = dynamic(() => import('@/app/(dashboard)/visitor/page'), {
  loading: () => <LoadingSpinner variant="dots" />,
  ssr: false
});

/**
 * Code splitting utility for lazy loading components
 */
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  return lazy(async () => {
    const startTime = performance.now();
    
    try {
      const module = await importFn();
      const loadTime = performance.now() - startTime;
      
      // Log performance metrics
      console.info(`Component loaded in ${loadTime.toFixed(2)}ms`);
      
      return module;
    } catch (error) {
      console.error('Failed to load component:', error);
      throw error;
    }
  });
};

/**
 * Route-based code splitting with preloading
 */
interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  preload?: boolean;
  roles?: string[];
}

export const createRouteComponent = (routes: RouteConfig[]) => {
  return function RouteComponent({ currentPath, userRole }: { currentPath: string; userRole?: string }) {
    const route = routes.find(r => r.path === currentPath);
    
    if (!route) {
      return <div>Route not found</div>;
    }

    // Check role access
    if (route.roles && userRole && !route.roles.includes(userRole)) {
      return <div>Access denied</div>;
    }

    const Component = route.component;
    
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner variant="skeleton" />}>
          <Component />
        </Suspense>
      </ErrorBoundary>
    );
  };
};

/**
 * Preloader for components and routes
 */
export class ComponentPreloader {
  private static preloadedComponents = new Set<string>();
  
  static async preloadComponent(importFn: () => Promise<any>, key: string) {
    if (this.preloadedComponents.has(key)) {
      return;
    }
    
    try {
      await importFn();
      this.preloadedComponents.add(key);
      console.info(`Preloaded component: ${key}`);
    } catch (error) {
      console.error(`Failed to preload component ${key}:`, error);
    }
  }
  
  static preloadRouteComponents(userRole: string) {
    const preloadMap: Record<string, () => Promise<any>> = {
      volunteer: () => import('@/components/modern/volunteer-dashboard'),
      admin: () => import('@/app/(dashboard)/admin/comprehensive/page'),
      visitor: () => import('@/app/(dashboard)/visitor/page'),
    };
    
    const componentLoader = preloadMap[userRole.toLowerCase()];
    if (componentLoader) {
      this.preloadComponent(componentLoader, `dashboard-${userRole}`);
    }
  }
}

/**
 * Bundle analyzer utility for development
 */
export const BundleAnalyzer = {
  logBundleSize: () => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Estimate bundle size using performance timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        console.info('Bundle Analysis:', {
          totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        });
      }
    }
  },
  
  trackComponentRender: (componentName: string, renderTime: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`${componentName} rendered in ${renderTime.toFixed(2)}ms`);
    }
  }
};

/**
 * Progressive loading wrapper
 */
interface ProgressiveLoaderProps {
  children: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
  onLoad?: () => void;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  children,
  priority,
  onLoad
}) => {
  const [isLoaded, setIsLoaded] = useState(priority === 'high');
  const { logPerformance } = usePerformanceMonitor('ProgressiveLoader');

  useEffect(() => {
    if (!isLoaded) {
      const delay = priority === 'medium' ? 100 : 500;
      
      const timer = setTimeout(() => {
        setIsLoaded(true);
        onLoad?.();
        logPerformance();
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [isLoaded, priority, onLoad, logPerformance]);

  if (!isLoaded) {
    return <LoadingSpinner variant="pulse" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Image lazy loading with progressive enhancement
 */
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  blurDataURL,
  onLoad,
  onError,
  className,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(placeholder || blurDataURL || '');
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Intersection observer for lazy loading
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.unobserve(img);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(img);

    return () => observer.disconnect();
  }, [src]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  return (
    <div className="relative overflow-hidden">
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-70'
        } ${className}`}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
      
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-500">Failed to load image</span>
        </div>
      )}
    </div>
  );
};

/**
 * Code splitting hook for dynamic imports
 */
export const useCodeSplitting = () => {
  const [loadedModules, setLoadedModules] = useState<Set<string>>(new Set());
  
  interface LoadModuleFunction {
    <T>(importFn: () => Promise<T>, moduleKey: string): Promise<T>;
  }
  
  const loadModule: LoadModuleFunction = useCallback(
    (importFn, moduleKey) => {
      if (loadedModules.has(moduleKey)) {
        return importFn();
      }
      
      const startTime = performance.now();
      return importFn().then((module) => {
        const loadTime = performance.now() - startTime;
        
        setLoadedModules(prev => new Set([...prev, moduleKey]));
        
        console.info(`Module ${moduleKey} loaded in ${loadTime.toFixed(2)}ms`);
        
        return module;
      });
    },
    [loadedModules]
  );
  
  return { loadModule, loadedModules: Array.from(loadedModules) };
};

export {
  LazyVolunteerDashboard,
  LazyAdminDashboard,
  LazyVisitorDashboard
};
