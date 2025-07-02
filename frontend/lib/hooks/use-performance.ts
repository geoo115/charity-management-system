'use client';

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { debounce, throttle } from 'lodash-es';

/**
 * Performance-optimized debounce hook with cleanup
 * Prevents unnecessary API calls and renders
 */
export function useDebounce<T>(value: T, delay: number): T {
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
}

/**
 * Advanced throttle hook with leading and trailing edge support
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = { leading: true, trailing: true }
): T {
  const throttledFn = useMemo(
    () => throttle(callback, delay, options),
    [callback, delay, options.leading, options.trailing]
  );

  useEffect(() => {
    return () => {
      throttledFn.cancel();
    };
  }, [throttledFn]);

  return throttledFn as unknown as T;
}

/**
 * Optimized local storage hook with SSR safety
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

/**
 * Intersection Observer hook for lazy loading and infinite scroll
 */
export function useIntersectionObserver(
  targetRef: React.RefObject<Element>,
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsIntersecting(entry.isIntersecting);
        callback(entries, observer);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
      observer.disconnect();
    };
  }, [targetRef, callback, options]);

  return isIntersecting;
}

/**
 * Advanced async data fetching hook with retry and caching
 */
export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  dependencies: React.DependencyList = [],
  options: {
    initialData?: T;
    retryCount?: number;
    retryDelay?: number;
    cache?: boolean;
    cacheKey?: string;
  } = {}
) {
  const {
    initialData,
    retryCount = 3,
    retryDelay = 1000,
    cache = false,
    cacheKey,
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache if enabled
      if (cache && cacheKey) {
        const cached = cacheRef.current.get(cacheKey);
        const isStale = cached && Date.now() - cached.timestamp > 5 * 60 * 1000; // 5 minutes
        if (cached && !isStale) {
          setData(cached.data);
          setLoading(false);
          return;
        }
      }

      const result = await fetchFn();
      
      // Update cache
      if (cache && cacheKey) {
        cacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() });
      }

      setData(result);
      retryCountRef.current = 0;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      
      if (retryCountRef.current < retryCount) {
        retryCountRef.current++;
        setTimeout(() => fetchData(), retryDelay * retryCountRef.current);
      } else {
        setError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFn, retryCount, retryDelay, cache, cacheKey]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  const refetch = useCallback(() => {
    retryCountRef.current = 0;
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current++;
  });

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    if (renderTime > 16) { // More than one frame at 60fps
      console.warn(`Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  });

  return {
    renderCount: renderCount.current,
    logPerformance: () => {
      console.log(`${componentName} - Renders: ${renderCount.current}`);
    }
  };
}

/**
 * Optimized event listener hook
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element?: React.RefObject<Element>,
  options?: AddEventListenerOptions
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const targetElement = element?.current || window;
    if (!targetElement?.addEventListener) return;

    const eventListener = (event: Event) => {
      savedHandler.current(event as WindowEventMap[K]);
    };

    targetElement.addEventListener(eventName, eventListener, options);

    return () => {
      targetElement.removeEventListener(eventName, eventListener, options);
    };
  }, [eventName, element, options]);
}
