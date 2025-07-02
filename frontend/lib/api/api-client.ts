// API client with automatic token refresh
import { getFromLocalStorage, setToLocalStorage, removeFromLocalStorage } from '@/lib/hooks/use-local-storage';

// Export base URL and auth token getter for compatibility
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const getAuthToken = (): string | null => {
  return getFromLocalStorage('auth_token');
};

class ApiClient {
  private baseURL: string;
  private refreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async refreshToken(): Promise<boolean> {
    if (this.refreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshing = true;
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<boolean> {
    try {
      const refreshTokenValue = getFromLocalStorage('refresh_token');
      if (!refreshTokenValue) {
        return false;
      }

      const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
      });

      if (response.ok) {
        const data = await response.json();
        setToLocalStorage('auth_token', data.access_token);
        return true;
      }
      
      // If refresh fails, clear tokens
      removeFromLocalStorage('auth_token');
      removeFromLocalStorage('refresh_token');
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      removeFromLocalStorage('auth_token');
      removeFromLocalStorage('refresh_token');
      return false;
    }
  }

  async request(
    url: string,
    options: RequestInit = {},
    retryOnAuth: boolean = true
  ): Promise<Response> {
    const token = getFromLocalStorage('auth_token');
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${this.baseURL}${url}`, requestOptions);

    // If we get a 401 and haven't already retried, try to refresh the token
    if (response.status === 401 && retryOnAuth && !this.refreshing) {
      const refreshSuccess = await this.refreshToken();
      
      if (refreshSuccess) {
        // Retry the original request with the new token
        const newToken = getFromLocalStorage('auth_token');
        const retryOptions: RequestInit = {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(newToken && { Authorization: `Bearer ${newToken}` }),
            ...options.headers,
          },
        };
        
        return fetch(`${this.baseURL}${url}`, retryOptions);
      } else {
        // Refresh failed, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return response;
  }

  async get(url: string, options: RequestInit = {}): Promise<Response> {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(url: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(url: string, options: RequestInit = {}): Promise<Response> {
    return this.request(url, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
