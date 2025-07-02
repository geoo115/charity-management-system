'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useIntersectionObserver, usePerformanceMonitor } from '@/lib/hooks/use-performance';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight?: number;
  overscan?: number;
  className?: string;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  onScrollEnd?: () => void;
  loadMoreThreshold?: number;
  enableInfiniteScroll?: boolean;
  isLoading?: boolean;
  loadingComponent?: React.ReactNode;
}

/**
 * High-performance virtual scrolling component
 * Renders only visible items to handle large datasets efficiently
 */
export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight = 400,
  overscan = 5,
  className,
  renderItem,
  onScrollEnd,
  loadMoreThreshold = 5,
  enableInfiniteScroll = false,
  isLoading = false,
  loadingComponent
}: VirtualScrollProps<T>) {
  const { logPerformance } = usePerformanceMonitor('VirtualScroll');
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  // Calculate visible range with overscan
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Get visible items with their positions
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      style: {
        position: 'absolute' as const,
        top: (startIndex + index) * itemHeight,
        left: 0,
        right: 0,
        height: itemHeight,
      }
    }));
  }, [items, visibleRange, itemHeight]);

  // Total height for scrollbar
  const totalHeight = items.length * itemHeight;

  // Optimized scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);

    // Infinite scroll detection
    if (enableInfiniteScroll && onScrollEnd && !isLoading) {
      const scrollHeight = e.currentTarget.scrollHeight;
      const clientHeight = e.currentTarget.clientHeight;
      const threshold = loadMoreThreshold * itemHeight;

      if (scrollHeight - newScrollTop - clientHeight <= threshold) {
        onScrollEnd();
      }
    }

    lastScrollTop.current = newScrollTop;
    logPerformance();
  }, [enableInfiniteScroll, onScrollEnd, isLoading, loadMoreThreshold, itemHeight, logPerformance]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      role="listbox"
      aria-label="Virtual scrollable list"
    >
      <div
        style={{ height: totalHeight, position: 'relative' }}
        role="presentation"
      >
        {visibleItems.map(({ item, index, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index, style)}
          </div>
        ))}
        
        {/* Loading indicator for infinite scroll */}
        {enableInfiniteScroll && isLoading && (
          <div
            style={{
              position: 'absolute',
              top: totalHeight,
              left: 0,
              right: 0,
              height: itemHeight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {loadingComponent || <div>Loading...</div>}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Virtual grid component for grid layouts
 */
interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  columnsCount: number;
  containerHeight?: number;
  gap?: number;
  className?: string;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  columnsCount,
  containerHeight = 400,
  gap = 0,
  className,
  renderItem
}: VirtualGridProps<T>) {
  const { logPerformance } = usePerformanceMonitor('VirtualGrid');
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const rowHeight = itemHeight + gap;
  const totalRows = Math.ceil(items.length / columnsCount);
  const totalHeight = totalRows * rowHeight;

  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 1);
    const endRow = Math.min(
      totalRows - 1,
      Math.floor((scrollTop + containerHeight) / rowHeight) + 1
    );
    return { startRow, endRow };
  }, [scrollTop, rowHeight, containerHeight, totalRows]);

  const visibleItems = useMemo(() => {
    const { startRow, endRow } = visibleRange;
    const result = [];

    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columnsCount; col++) {
        const index = row * columnsCount + col;
        if (index >= items.length) break;

        const item = items[index];
        const style = {
          position: 'absolute' as const,
          top: row * rowHeight,
          left: col * (itemWidth + gap),
          width: itemWidth,
          height: itemHeight,
        };

        result.push({ item, index, style });
      }
    }

    return result;
  }, [items, visibleRange, columnsCount, itemWidth, itemHeight, rowHeight, gap]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    logPerformance();
  }, [logPerformance]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      role="grid"
      aria-label="Virtual scrollable grid"
    >
      <div
        style={{ height: totalHeight, position: 'relative' }}
        role="presentation"
      >
        {visibleItems.map(({ item, index, style }) => (
          <div key={index} style={style} role="gridcell">
            {renderItem(item, index, style)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Auto-sizing virtual list that measures item heights dynamically
 */
interface AutoSizerProps {
  children: (size: { width: number; height: number }) => React.ReactNode;
  className?: string;
}

export function AutoSizer({ children, className }: AutoSizerProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setSize({ width: clientWidth, height: clientHeight });
      }
    };

    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    updateSize();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("w-full h-full", className)}
    >
      {size.width > 0 && size.height > 0 && children(size)}
    </div>
  );
}

export default VirtualScroll;
