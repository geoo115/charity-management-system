'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  updateTime: number;
  memoryUsage: number;
  bundleSize: number;
  networkLatency: number;
  fps: number;
  interactionDelay: number;
  cacheHitRate: number;
}

interface WebVitals {
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint
  FID: number; // First Input Delay
  CLS: number; // Cumulative Layout Shift
  TTFB: number; // Time to First Byte
}

/**
 * Advanced performance monitoring system
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private webVitals: Partial<WebVitals> = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  private frameId: number | null = null;
  private frameCount = 0;
  private lastFrameTime = 0;
  private fpsHistory: number[] = [];

  private constructor() {
    this.metrics = {
      renderTime: 0,
      updateTime: 0,
      memoryUsage: 0,
      bundleSize: 0,
      networkLatency: 0,
      fps: 60,
      interactionDelay: 0,
      cacheHitRate: 0
    };

    this.initializeObservers();
    this.startFPSMonitoring();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeObservers() {
    if (typeof window === 'undefined') return;

    // Performance Observer for navigation timing
    if ('PerformanceObserver' in window) {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.webVitals.TTFB = navEntry.responseStart - navEntry.fetchStart;
          }
        }
      });

      try {
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navigationObserver);
      } catch (e) {
        console.warn('Performance Observer not supported for navigation');
      }

      // Paint timing observer
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.webVitals.FCP = entry.startTime;
          }
        }
      });

      try {
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.set('paint', paintObserver);
      } catch (e) {
        console.warn('Performance Observer not supported for paint');
      }

      // Layout shift observer
      const layoutShiftObserver = new PerformanceObserver((list) => {
        let cumulativeScore = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            cumulativeScore += (entry as any).value;
          }
        }
        this.webVitals.CLS = cumulativeScore;
      });

      try {
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('layout-shift', layoutShiftObserver);
      } catch (e) {
        console.warn('Performance Observer not supported for layout-shift');
      }

      // Largest Contentful Paint observer
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.webVitals.LCP = lastEntry.startTime;
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (e) {
        console.warn('Performance Observer not supported for largest-contentful-paint');
      }

      // First Input Delay observer
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.webVitals.FID = (entry as any).processingStart - entry.startTime;
        }
      });

      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (e) {
        console.warn('Performance Observer not supported for first-input');
      }
    }
  }

  private startFPSMonitoring() {
    if (typeof window === 'undefined') return;

    const measureFPS = (currentTime: number) => {
      if (this.lastFrameTime) {
        const deltaTime = currentTime - this.lastFrameTime;
        const fps = 1000 / deltaTime;
        
        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > 60) { // Keep last 60 frames
          this.fpsHistory.shift();
        }
        
        this.metrics.fps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
      }
      
      this.lastFrameTime = currentTime;
      this.frameId = requestAnimationFrame(measureFPS);
    };

    this.frameId = requestAnimationFrame(measureFPS);
  }

  measureRender(componentName: string, startTime: number): number {
    const renderTime = performance.now() - startTime;
    this.metrics.renderTime = renderTime;
    
    if (process.env.NODE_ENV === 'development') {
      console.info(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
    }
    
    return renderTime;
  }

  measureUpdate(componentName: string, startTime: number): number {
    const updateTime = performance.now() - startTime;
    this.metrics.updateTime = updateTime;
    
    if (process.env.NODE_ENV === 'development') {
      console.info(`${componentName} update time: ${updateTime.toFixed(2)}ms`);
    }
    
    return updateTime;
  }

  measureInteraction(interactionName: string, startTime: number): number {
    const interactionTime = performance.now() - startTime;
    this.metrics.interactionDelay = interactionTime;
    
    if (process.env.NODE_ENV === 'development') {
      console.info(`${interactionName} interaction time: ${interactionTime.toFixed(2)}ms`);
    }
    
    return interactionTime;
  }

  updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
    }
  }

  measureNetworkLatency(): Promise<number> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      // Use a small image request to measure network latency
      const img = new Image();
      img.onload = img.onerror = () => {
        const latency = performance.now() - startTime;
        this.metrics.networkLatency = latency;
        resolve(latency);
      };
      
      // Use a small, cacheable resource
      img.src = `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7?${Date.now()}`;
    });
  }

  getMetrics(): PerformanceMetrics {
    this.updateMemoryUsage();
    return { ...this.metrics };
  }

  getWebVitals(): Partial<WebVitals> {
    return { ...this.webVitals };
  }

  generateReport(): {
    metrics: PerformanceMetrics;
    webVitals: Partial<WebVitals>;
    recommendations: string[];
    score: number;
  } {
    const metrics = this.getMetrics();
    const webVitals = this.getWebVitals();
    const recommendations: string[] = [];
    let score = 100;

    // Analyze metrics and generate recommendations
    if (metrics.renderTime > 16) {
      recommendations.push('Consider optimizing component renders (>16ms detected)');
      score -= 10;
    }

    if (metrics.memoryUsage > 50) {
      recommendations.push('High memory usage detected (>50MB)');
      score -= 15;
    }

    if (metrics.fps < 55) {
      recommendations.push('Low FPS detected, consider reducing animations or optimizing renders');
      score -= 20;
    }

    if (webVitals.LCP && webVitals.LCP > 2500) {
      recommendations.push('Largest Contentful Paint is slow (>2.5s)');
      score -= 25;
    }

    if (webVitals.FID && webVitals.FID > 100) {
      recommendations.push('First Input Delay is high (>100ms)');
      score -= 20;
    }

    if (webVitals.CLS && webVitals.CLS > 0.1) {
      recommendations.push('Cumulative Layout Shift is high (>0.1)');
      score -= 15;
    }

    return {
      metrics,
      webVitals,
      recommendations,
      score: Math.max(0, score)
    };
  }

  cleanup(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

/**
 * React hook for performance monitoring
 */
export const usePerformanceMonitoring = (componentName: string) => {
  const monitor = useRef(PerformanceMonitor.getInstance());
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const renderStartTime = useRef<number>(0);

  const startRender = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRender = useCallback(() => {
    if (renderStartTime.current) {
      monitor.current.measureRender(componentName, renderStartTime.current);
    }
  }, [componentName]);

  const measureInteraction = useCallback((interactionName: string) => {
    const startTime = performance.now();
    return () => monitor.current.measureInteraction(interactionName, startTime);
  }, []);

  const getReport = useCallback(() => {
    return monitor.current.generateReport();
  }, []);

  const updateMetrics = useCallback(() => {
    setMetrics(monitor.current.getMetrics());
  }, []);

  useEffect(() => {
    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, [updateMetrics]);

  useEffect(() => {
    return () => {
      monitor.current.cleanup();
    };
  }, []);

  return {
    startRender,
    endRender,
    measureInteraction,
    getReport,
    metrics
  };
};

/**
 * Performance budget checker
 */
export class PerformanceBudget {
  private static budgets = {
    renderTime: 16, // 60fps target
    updateTime: 10,
    memoryUsage: 50, // MB
    bundleSize: 500, // KB
    networkLatency: 200, // ms
    fps: 55,
    interactionDelay: 50, // ms
    LCP: 2500, // ms
    FID: 100, // ms
    CLS: 0.1
  };

  static checkBudget(metrics: PerformanceMetrics, webVitals: Partial<WebVitals>) {
    const violations: string[] = [];

    Object.entries(this.budgets).forEach(([key, budget]) => {
      const value = key in metrics ? metrics[key as keyof PerformanceMetrics] : webVitals[key as keyof WebVitals];
      
      if (value !== undefined && value > budget) {
        violations.push(`${key}: ${value} exceeds budget of ${budget}`);
      }
    });

    return {
      passed: violations.length === 0,
      violations
    };
  }

  static setBudget(key: string, value: number) {
    if (key in this.budgets) {
      (this.budgets as any)[key] = value;
    }
  }
}

export default PerformanceMonitor;
