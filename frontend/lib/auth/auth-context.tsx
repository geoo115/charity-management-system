'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFromLocalStorage, setToLocalStorage, removeFromLocalStorage } from '@/lib/hooks/use-local-storage';

export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: 'Visitor' | 'Volunteer' | 'Donor' | 'Admin';
  status: string;
  phone?: string;
  address?: string;
  bio?: string;
  created_at?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string, confirmPassword: string) => Promise<void>;
  updateUser: (userData: Partial<AuthUser>) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  forgotPassword: async () => {},
  resetPassword: async () => {},
  updateUser: async () => {},
  isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on mount
    checkAuthStatus();
  }, []);

  const refreshToken = async () => {
    try {
      const refreshTokenValue = getFromLocalStorage('refresh_token');
      if (!refreshTokenValue) {
        return false;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
      });

      if (response.ok) {
        const data = await response.json();
        setToLocalStorage('auth_token', data.access_token);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = getFromLocalStorage('auth_token') || getFromLocalStorage('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // First validate the token
      const validateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/auth/validate-token`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!validateResponse.ok) {
        // Try to refresh the token before giving up
        const refreshSuccess = await refreshToken();
        if (!refreshSuccess) {
          // Clear both token types for compatibility
          removeFromLocalStorage('auth_token');
          removeFromLocalStorage('token');
          removeFromLocalStorage('refresh_token');
          
          console.error('Token validation failed, redirecting to login');
          // Add a session expired parameter for better user feedback
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            router.push('/login?error=session_expired');
          }
          
          setLoading(false);
          return;
        }
        
        // Retry with refreshed token
        const newToken = getFromLocalStorage('auth_token');
        const retryResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/validate-token`, {
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        });
        
        if (!retryResponse.ok) {
          removeFromLocalStorage('auth_token');
          removeFromLocalStorage('refresh_token');
          setLoading(false);
          return;
        }
      }

      // Get complete user data
      const currentToken = getFromLocalStorage('auth_token');
      const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      } else {
        removeFromLocalStorage('auth_token');
        removeFromLocalStorage('refresh_token');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      removeFromLocalStorage('auth_token');
      removeFromLocalStorage('token');
      removeFromLocalStorage('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token in both formats for compatibility with different API functions
      setToLocalStorage('auth_token', data.token);
      setToLocalStorage('token', data.token);  // For backward compatibility
      
      if (data.refresh_token) {
        setToLocalStorage('refresh_token', data.refresh_token);
      }
      setUser(data.user);

      // Redirect based on role
      if (data.user.role === 'Admin') {
        router.push('/admin');
      } else if (data.user.role === 'Visitor') {
        router.push('/visitor');
      } else if (data.user.role === 'Volunteer') {
        router.push('/volunteer');
      } else if (data.user.role === 'Donor') {
        router.push('/donor');
      }

    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // If registration immediately logs in user
      if (data.token) {
        setToLocalStorage('auth_token', data.token);
        setUser(data.user);
      }

      return data;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      const token = getFromLocalStorage('auth_token') || getFromLocalStorage('token');
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all possible token storage keys
      removeFromLocalStorage('auth_token');
      removeFromLocalStorage('token');
      removeFromLocalStorage('refresh_token');
      
      // Clear any other auth-related data
      removeFromLocalStorage('user');
      
      setUser(null);
      router.push('/login');
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset email');
      }

      return data;
    } catch (error: any) {
      console.error('Forgot password error:', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
  };

  const resetPassword = async (token: string, password: string, confirmPassword: string) => {
    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirm_password: confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      return data;
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.message || 'Failed to reset password');
    }
  };

  const updateUser = async (userData: Partial<AuthUser>) => {
    try {
      const token = getFromLocalStorage('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update the user state with the new data
      setUser(prevUser => prevUser ? { ...prevUser, ...userData } : null);
      
      return data;
    } catch (error: any) {
      console.error('Update user error:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
