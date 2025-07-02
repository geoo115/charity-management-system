'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useLocalStorage, useDebounce } from '@/lib/hooks/use-performance';

// Cache types
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  tags: string[];
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  cleanupInterval: number;
  persistToDisk: boolean;
}

// State management types
interface GlobalState {
  user: any;
  notifications: any[];
  cache: Map<string, CacheEntry<any>>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  ui: {
    sidebarCollapsed: boolean;
    theme: 'light' | 'dark' | 'system';
    compactMode: boolean;
  };
}

type Action = 
  | { type: 'SET_USER'; payload: any }
  | { type: 'ADD_NOTIFICATION'; payload: any }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'SET_LOADING'; payload: { key: string; loading: boolean } }
  | { type: 'SET_ERROR'; payload: { key: string; error: string | null } }
  | { type: 'UPDATE_UI'; payload: Partial<GlobalState['ui']> }
  | { type: 'CACHE_SET'; payload: { key: string; data: any; ttl?: number; tags?: string[] } }
  | { type: 'CACHE_DELETE'; payload: string }
  | { type: 'CACHE_CLEAR'; payload?: string[] }
  | { type: 'HYDRATE'; payload: Partial<GlobalState> };

/**
 * Advanced caching system with TTL, LRU, and tagging
 */
export class AdvancedCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      cleanupInterval: 60 * 1000, // 1 minute
      persistToDisk: false,
      ...config
    };

    this.startCleanup();
    
    if (this.config.persistToDisk && typeof window !== 'undefined') {
      this.loadFromDisk();
    }
  }

  set(key: string, data: T, ttl?: number, tags: string[] = []): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      tags
    };

    this.cache.set(key, entry);

    if (this.config.persistToDisk) {
      this.saveToDisk();
    }
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access count for LRU
    entry.accessCount++;
    entry.timestamp = Date.now(); // Update access time

    return entry.data;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    if (deleted && this.config.persistToDisk) {
      this.saveToDisk();
    }
    
    return deleted;
  }

  clear(tags?: string[]): void {
    if (!tags) {
      this.cache.clear();
    } else {
      // Clear by tags
      for (const [key, entry] of this.cache.entries()) {
        if (entry.tags.some(tag => tags.includes(tag))) {
          this.cache.delete(key);
        }
      }
    }

    if (this.config.persistToDisk) {
      this.saveToDisk();
    }
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && Date.now() - entry.timestamp <= entry.ttl;
  }

  getStats() {
    const now = Date.now();
    let expired = 0;
    let total = 0;

    for (const entry of this.cache.values()) {
      total++;
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      expired,
      hitRate: total > 0 ? ((total - expired) / total) * 100 : 0
    };
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;
    let lruAccessCount = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < lruAccessCount || 
          (entry.accessCount === lruAccessCount && entry.timestamp < lruTime)) {
        lruKey = key;
        lruTime = entry.timestamp;
        lruAccessCount = entry.accessCount;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      }
    }, this.config.cleanupInterval);
  }

  private loadFromDisk(): void {
    try {
      const stored = localStorage.getItem('advanced-cache');
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(data);
      }
    } catch (error) {
      console.warn('Failed to load cache from disk:', error);
    }
  }

  private saveToDisk(): void {
    try {
      const data = Array.from(this.cache.entries());
      localStorage.setItem('advanced-cache', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cache to disk:', error);
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
  }
}

// Global state reducer
const globalReducer = (state: GlobalState, action: Action): GlobalState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications]
      };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.loading }
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.error }
      };
    
    case 'UPDATE_UI':
      return {
        ...state,
        ui: { ...state.ui, ...action.payload }
      };
    
    case 'CACHE_SET':
      const newCache = new Map(state.cache);
      newCache.set(action.payload.key, {
        data: action.payload.data,
        timestamp: Date.now(),
        ttl: action.payload.ttl || 5 * 60 * 1000,
        accessCount: 0,
        tags: action.payload.tags || []
      });
      return { ...state, cache: newCache };
    
    case 'CACHE_DELETE':
      const deletedCache = new Map(state.cache);
      deletedCache.delete(action.payload);
      return { ...state, cache: deletedCache };
    
    case 'CACHE_CLEAR':
      if (!action.payload) {
        return { ...state, cache: new Map() };
      }
      
      const filteredCache = new Map(state.cache);
      for (const [key, entry] of filteredCache.entries()) {
        if (entry.tags.some(tag => action.payload!.includes(tag))) {
          filteredCache.delete(key);
        }
      }
      return { ...state, cache: filteredCache };
    
    case 'HYDRATE':
      return { ...state, ...action.payload };
    
    default:
      return state;
  }
};

// Context
interface GlobalContextType {
  state: GlobalState;
  dispatch: React.Dispatch<Action>;
  cache: AdvancedCache;
  actions: {
    setUser: (user: any) => void;
    addNotification: (notification: any) => void;
    removeNotification: (id: string) => void;
    setLoading: (key: string, loading: boolean) => void;
    setError: (key: string, error: string | null) => void;
    updateUI: (updates: Partial<GlobalState['ui']>) => void;
    cacheSet: (key: string, data: any, ttl?: number, tags?: string[]) => void;
    cacheGet: (key: string) => any;
    cacheDelete: (key: string) => void;
    cacheClear: (tags?: string[]) => void;
  };
}

const GlobalContext = createContext<GlobalContextType | null>(null);

// Provider component
export const GlobalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [persistedUI] = useLocalStorage('global-ui-state', {
    sidebarCollapsed: false,
    theme: 'system' as const,
    compactMode: false
  });

  const initialState: GlobalState = {
    user: null,
    notifications: [],
    cache: new Map(),
    loading: {},
    errors: {},
    ui: persistedUI
  };

  const [state, dispatch] = useReducer(globalReducer, initialState);
  const cacheInstance = React.useMemo(() => new AdvancedCache(), []);

  // Debounced UI state persistence
  const debouncedUI = useDebounce(state.ui, 500);
  const [, setPersistedUI] = useLocalStorage('global-ui-state', state.ui);

  useEffect(() => {
    setPersistedUI(debouncedUI);
  }, [debouncedUI, setPersistedUI]);

  // Action creators
  const actions = React.useMemo(() => ({
    setUser: (user: any) => dispatch({ type: 'SET_USER', payload: user }),
    
    addNotification: (notification: any) => 
      dispatch({ type: 'ADD_NOTIFICATION', payload: { ...notification, id: Date.now().toString() } }),
    
    removeNotification: (id: string) => dispatch({ type: 'REMOVE_NOTIFICATION', payload: id }),
    
    setLoading: (key: string, loading: boolean) => 
      dispatch({ type: 'SET_LOADING', payload: { key, loading } }),
    
    setError: (key: string, error: string | null) => 
      dispatch({ type: 'SET_ERROR', payload: { key, error } }),
    
    updateUI: (updates: Partial<GlobalState['ui']>) => 
      dispatch({ type: 'UPDATE_UI', payload: updates }),
    
    cacheSet: (key: string, data: any, ttl?: number, tags?: string[]) => {
      cacheInstance.set(key, data, ttl, tags);
      dispatch({ type: 'CACHE_SET', payload: { key, data, ttl, tags } });
    },
    
    cacheGet: (key: string) => cacheInstance.get(key),
    
    cacheDelete: (key: string) => {
      cacheInstance.delete(key);
      dispatch({ type: 'CACHE_DELETE', payload: key });
    },
    
    cacheClear: (tags?: string[]) => {
      cacheInstance.clear(tags);
      dispatch({ type: 'CACHE_CLEAR', payload: tags });
    }
  }), [cacheInstance]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cacheInstance.destroy();
    };
  }, [cacheInstance]);

  const contextValue = React.useMemo(() => ({
    state,
    dispatch,
    cache: cacheInstance,
    actions
  }), [state, cacheInstance, actions]);

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};

// Hook to use global state
export const useGlobalState = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
};

// Specialized hooks
export const useCache = () => {
  const { actions } = useGlobalState();
  return {
    set: actions.cacheSet,
    get: actions.cacheGet,
    delete: actions.cacheDelete,
    clear: actions.cacheClear
  };
};

export const useLoadingState = (key: string) => {
  const { state, actions } = useGlobalState();
  return {
    loading: state.loading[key] || false,
    setLoading: (loading: boolean) => actions.setLoading(key, loading)
  };
};

export const useErrorState = (key: string) => {
  const { state, actions } = useGlobalState();
  return {
    error: state.errors[key] || null,
    setError: (error: string | null) => actions.setError(key, error)
  };
};

export const useNotifications = () => {
  const { state, actions } = useGlobalState();
  return {
    notifications: state.notifications,
    addNotification: actions.addNotification,
    removeNotification: actions.removeNotification
  };
};

export const useUIState = () => {
  const { state, actions } = useGlobalState();
  return {
    ui: state.ui,
    updateUI: actions.updateUI
  };
};
