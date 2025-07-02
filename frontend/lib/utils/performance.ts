// Performance optimization utilities for donor dashboard
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Global type declarations
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

// Image optimization utilities
export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

export const generateOptimizedImageUrl = (
  src: string,
  width?: number,
  height?: number,
  quality: number = 75
): string => {
  if (!src) return '';
  
  // For external images, return as-is
  if (src.startsWith('http')) {
    return src;
  }

  // Build optimization parameters
  const params = new URLSearchParams();
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  params.append('q', quality.toString());

  return `/_next/image?url=${encodeURIComponent(src)}&${params.toString()}`;
};

// Lazy loading hook for components
export const useLazyComponent = <T>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadComponent = useCallback(async () => {
    if (Component || loading) return;

    setLoading(true);
    setError(null);

    try {
      const module = await importFunc();
      setComponent(module.default);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [Component, loading, importFunc]);

  return { Component, loading, error, loadComponent };
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [hasIntersected, options]);

  return { elementRef, isIntersecting, hasIntersected };
};

// Debounced value hook
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttled callback hook
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        return callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCall.current = Date.now();
          callback(...args);
        }, delay - (now - lastCall.current));
      }
    }) as T,
    [callback, delay]
  );
};

// Virtual scrolling hook for large lists
export const useVirtualScrolling = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );

    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [items, itemHeight, containerHeight, scrollTop]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    handleScroll,
    totalHeight: visibleItems.totalHeight,
  };
};

// Memoization utilities
export const createMemoizedSelector = <T, R>(
  selector: (state: T) => R,
  equalityFn?: (a: R, b: R) => boolean
) => {
  let lastArgs: T | undefined;
  let lastResult: R;

  return (state: T): R => {
    if (lastArgs === undefined || !shallowEqual(lastArgs, state)) {
      lastArgs = state;
      lastResult = selector(state);
    } else if (equalityFn && !equalityFn(lastResult, selector(state))) {
      lastResult = selector(state);
    }

    return lastResult;
  };
};

// Shallow equality check
const shallowEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key) || a[key] !== b[key]) {
      return false;
    }
  }

  return true;
};

// Cache management
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      const value = this.cache.get(key)!;
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instances
export const apiCache = new LRUCache<string, any>(50);
export const imageCache = new LRUCache<string, string>(100);

// API response caching
export const useCachedAPI = <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 5 minutes
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh) {
      const cached = apiCache.get(key);
      if (cached && Date.now() - cached.timestamp < ttl) {
        setData(cached.data);
        return cached.data;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      const cacheEntry = {
        data: result,
        timestamp: Date.now(),
      };
      
      apiCache.set(key, cacheEntry);
      setData(result);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
};

// Bundle splitting utilities
export const loadChunk = async (chunkName: string) => {
  try {
    switch (chunkName) {
      case 'analytics':
        return await import('../api/analytics');
      case 'payments':
        return await import('../api/payment');
      case 'charts':
        return await import('recharts');
      default:
        throw new Error(`Unknown chunk: ${chunkName}`);
    }
  } catch (error) {
    console.error(`Failed to load chunk ${chunkName}:`, error);
    throw error;
  }
};

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTiming(label: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-start`);
    }
  }

  endTiming(label: string): number {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      
      const measure = performance.getEntriesByName(label)[0];
      const duration = measure.duration;
      
      // Store metric
      if (!this.metrics.has(label)) {
        this.metrics.set(label, []);
      }
      this.metrics.get(label)!.push(duration);
      
      // Clean up
      performance.clearMarks(`${label}-start`);
      performance.clearMarks(`${label}-end`);
      performance.clearMeasures(label);
      
      return duration;
    }
    return 0;
  }

  getAverageTime(label: string): number {
    const times = this.metrics.get(label) || [];
    if (times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  reportMetrics(): Record<string, { average: number; count: number }> {
    const report: Record<string, { average: number; count: number }> = {};
    
    for (const [label, times] of this.metrics.entries()) {
      report[label] = {
        average: this.getAverageTime(label),
        count: times.length,
      };
    }
    
    return report;
  }
}

// Performance timing hook
export const usePerformanceTimer = (label: string) => {
  const monitor = PerformanceMonitor.getInstance();
  
  const startTimer = useCallback(() => {
    monitor.startTiming(label);
  }, [label, monitor]);
  
  const endTimer = useCallback(() => {
    return monitor.endTiming(label);
  }, [label, monitor]);
  
  return { startTimer, endTimer };
};

// Web Vitals reporting
export const reportWebVitals = (metric: any) => {
  // Send to analytics service
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      custom_map: { metric_id: 'custom_metric' },
      custom_metric: metric.value,
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value);
  }
};

// Code splitting component wrapper
export const withLazyLoading = <P extends object>(
  importFunc: () => Promise<{ default: React.ComponentType<P> }>
) => {
  return React.lazy(importFunc);
};

export default {
  generateOptimizedImageUrl,
  useLazyComponent,
  useIntersectionObserver,
  useDebounce,
  useThrottle,
  useVirtualScrolling,
  createMemoizedSelector,
  apiCache,
  imageCache,
  useCachedAPI,
  loadChunk,
  PerformanceMonitor,
  usePerformanceTimer,
  reportWebVitals,
  withLazyLoading,
}; 