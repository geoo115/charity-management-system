/**
 * Dashboard Data Manager
 * Centralized data management for volunteer dashboard with intelligent caching and batching
 */

import { useEffect, useState } from 'react';
import { apiRateLimiter } from '@/lib/utils/api-rate-limiter';
import { fetchDashboardStats, fetchVolunteerRoleInfo } from '@/lib/api/volunteer';
import { VolunteerRoleInfo } from '@/lib/types/volunteer';
import { fetchVolunteerActivity, fetchVolunteerAchievements } from '@/lib/api/volunteer';

interface DashboardData {
  roleInfo: VolunteerRoleInfo | null;
  dashboardStats: {
    totalHours: number;
    completedTasks: number;
    upcomingShifts: number;
    impactScore: number;
  };
  recentActivity: any[];
  achievements: any[];
  lastUpdated: number;
}

interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refreshCount: number;
}

class DashboardDataManager {
  private static instance: DashboardDataManager;
  private state: DashboardState = {
    data: null,
    loading: false,
    error: null,
    refreshCount: 0
  };
  private subscribers: Set<(state: DashboardState) => void> = new Set();
  private refreshTimer: NodeJS.Timeout | null = null;
  private lastFetchTime: number = 0;
  private readonly MIN_FETCH_INTERVAL = 30000; // 30 seconds minimum between fetches

  private constructor() {
    // Auto-refresh every 5 minutes when data is stale
    this.setupAutoRefresh();
  }

  static getInstance(): DashboardDataManager {
    if (!DashboardDataManager.instance) {
      DashboardDataManager.instance = new DashboardDataManager();
    }
    return DashboardDataManager.instance;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: DashboardState) => void): () => void {
    this.subscribers.add(callback);
    // Immediately call with current state
    callback(this.state);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get current state
   */
  getState(): DashboardState {
    return { ...this.state };
  }

  /**
   * Load dashboard data with intelligent caching and rate limiting
   */
  async loadDashboardData(force: boolean = false): Promise<void> {
    const now = Date.now();
    
    // Prevent excessive API calls
    if (!force && now - this.lastFetchTime < this.MIN_FETCH_INTERVAL) {
      console.log('Dashboard data fetch throttled - using cached data');
      return;
    }

    // Check if already loading
    if (this.state.loading) {
      console.log('Dashboard data fetch already in progress');
      return;
    }

    // Check cache first
    if (!force && this.state.data && now - this.state.data.lastUpdated < 300000) {
      console.log('Using cached dashboard data');
      return;
    }

    this.updateState({ loading: true, error: null });

    try {
      console.log('Fetching fresh dashboard data...');
      
      // Use Promise.allSettled to handle partial failures gracefully
      const [roleResult, statsResult, activityResult, achievementsResult] = await Promise.allSettled([
        fetchVolunteerRoleInfo(),
        fetchDashboardStats(),
        fetchVolunteerActivity(),
        fetchVolunteerAchievements()
      ]);

      let roleInfo: VolunteerRoleInfo | null = null;
      let dashboardStats = {
        totalHours: 0,
        completedTasks: 0,
        upcomingShifts: 0,
        impactScore: 0
      };
      let recentActivity: any[] = [];
      let achievements: any[] = [];

      // Handle role info result
      if (roleResult.status === 'fulfilled') {
        roleInfo = roleResult.value as VolunteerRoleInfo;
      } else {
        console.warn('Failed to fetch role info:', roleResult.reason);
        // Use cached role info if available
        if (this.state.data?.roleInfo) {
          roleInfo = this.state.data.roleInfo;
        }
      }

      // Handle stats result
      if (statsResult.status === 'fulfilled') {
        const stats = statsResult.value as any;
        dashboardStats = {
          totalHours: stats.totalHours || 0,
          completedTasks: stats.completedTasks || 0,
          upcomingShifts: stats.upcomingShifts || 0,
          impactScore: stats.impactScore || 0
        };
      } else {
        console.warn('Failed to fetch dashboard stats:', statsResult.reason);
        // Use cached stats if available, otherwise use zeros
        if (this.state.data?.dashboardStats) {
          dashboardStats = this.state.data.dashboardStats;
        } else {
          dashboardStats = {
            totalHours: 0,
            completedTasks: 0,
            upcomingShifts: 0,
            impactScore: 0
          };
        }
      }

      // Handle activity result
      if (activityResult.status === 'fulfilled') {
        const activity = activityResult.value as any;
        recentActivity = Array.isArray(activity) ? activity : (activity.recent_shifts || activity.activities || []);
      } else {
        console.warn('Failed to fetch recent activity:', activityResult.reason);
        // Use cached activity if available
        if (this.state.data?.recentActivity) {
          recentActivity = this.state.data.recentActivity;
        }
      }

      // Handle achievements result
      if (achievementsResult.status === 'fulfilled') {
        const achievementsData = achievementsResult.value as any;
        achievements = Array.isArray(achievementsData) ? achievementsData : (achievementsData.achievements || []);
      } else {
        console.warn('Failed to fetch achievements:', achievementsResult.reason);
        // Use cached achievements if available
        if (this.state.data?.achievements) {
          achievements = this.state.data.achievements;
        }
      }

      const data: DashboardData = {
        roleInfo,
        dashboardStats,
        recentActivity,
        achievements,
        lastUpdated: now
      };

      this.updateState({
        data,
        loading: false,
        error: null,
        refreshCount: this.state.refreshCount + 1
      });

      this.lastFetchTime = now;
      console.log('Dashboard data loaded successfully');

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      this.updateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load dashboard data'
      });
    }
  }

  /**
   * Force refresh dashboard data
   */
  async refreshDashboardData(): Promise<void> {
    // Clear cache to force fresh data
    apiRateLimiter.clearCache();
    await this.loadDashboardData(true);
  }

  /**
   * Update specific dashboard stats without full reload
   */
  updateStats(updates: Partial<DashboardData['dashboardStats']>): void {
    if (!this.state.data) return;

    const updatedData: DashboardData = {
      ...this.state.data,
      dashboardStats: {
        ...this.state.data.dashboardStats,
        ...updates
      },
      lastUpdated: Date.now()
    };

    this.updateState({
      data: updatedData
    });
  }

  /**
   * Setup automatic refresh when data becomes stale
   */
  private setupAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      if (this.state.data && Date.now() - this.state.data.lastUpdated > 300000) {
        console.log('Auto-refreshing stale dashboard data');
        this.loadDashboardData();
      }
    }, 60000); // Check every minute
  }

  /**
   * Update state and notify subscribers
   */
  private updateState(updates: Partial<DashboardState>): void {
    this.state = { ...this.state, ...updates };
    this.subscribers.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        console.error('Error in dashboard state subscriber:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.subscribers.clear();
  }
}

// Export singleton instance
export const dashboardDataManager = DashboardDataManager.getInstance();

/**
 * React hook for using dashboard data
 */
export function useDashboardData() {
  const [state, setState] = useState<DashboardState>(dashboardDataManager.getState());

  useEffect(() => {
    const unsubscribe = dashboardDataManager.subscribe(setState);
    
    // Load data if not already loaded
    if (!state.data && !state.loading) {
      dashboardDataManager.loadDashboardData();
    }

    return unsubscribe;
  }, []);

  const refresh = () => dashboardDataManager.refreshDashboardData();
  const updateStats = (updates: Parameters<typeof dashboardDataManager.updateStats>[0]) => 
    dashboardDataManager.updateStats(updates);

  return {
    ...state,
    refresh,
    updateStats
  };
}

/**
 * Preload dashboard data for improved UX
 */
export function preloadDashboardData(): void {
  dashboardDataManager.loadDashboardData();
}
