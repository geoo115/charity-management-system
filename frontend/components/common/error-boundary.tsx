'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

/**
 * Enhanced Error Boundary with logging and recovery options
 * Provides graceful error handling with user-friendly interfaces
 */
export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private readonly maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;
    
    this.setState({ errorInfo });
    
    // Log error with context
    this.logError(error, errorInfo, level);
    
    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo, level: string) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Error Data:', errorData);
      console.groupEnd();
    }

    // Send to error tracking service (implement based on your service)
    this.sendErrorToService(errorData);
  };

  private getUserId = (): string | null => {
    // Implement based on your auth system
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user).id : null;
    } catch {
      return null;
    }
  };

  private sendErrorToService = async (errorData: any) => {
    try {
      // Replace with your error tracking service
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorData),
        });
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private copyErrorDetails = async () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      timestamp: new Date().toISOString(),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      // You could show a toast notification here
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = JSON.stringify(errorDetails, null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component' } = this.props;
      const canRetry = this.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-16 h-16 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                {level === 'critical' ? 'Critical Error' : 'Something went wrong'}
              </CardTitle>
              <div className="flex items-center justify-center space-x-2 mt-2">
                <Badge variant="destructive" className="text-xs">
                  Error ID: {this.state.errorId}
                </Badge>
                {this.retryCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    Retry {this.retryCount}/{this.maxRetries}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-center text-gray-600">
                <p className="text-sm mb-2">
                  {level === 'critical'
                    ? 'A critical error has occurred. Please contact support.'
                    : 'We apologize for the inconvenience. Please try one of the options below.'}
                </p>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4 p-3 bg-gray-100 rounded-lg text-left">
                    <summary className="cursor-pointer font-medium mb-2">
                      Error Details (Development)
                    </summary>
                    <pre className="text-xs text-red-600 whitespace-pre-wrap overflow-auto max-h-32">
                      {this.state.error.message}
                      {'\n\n'}
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>

              <div className="flex flex-col space-y-2">
                {canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    className="w-full"
                    variant="default"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}

                <Button
                  onClick={this.handleReload}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>

                {level !== 'critical' && (
                  <Button
                    onClick={this.handleGoHome}
                    className="w-full"
                    variant="outline"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go to Homepage
                  </Button>
                )}

                <Button
                  onClick={this.copyErrorDetails}
                  className="w-full"
                  variant="ghost"
                  size="sm"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Copy Error Details
                </Button>
              </div>

              <div className="text-center pt-4 border-t">
                <p className="text-xs text-gray-500">
                  If this problem persists, please contact support with the error ID above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for programmatic error reporting
 */
export function useErrorHandler() {
  const reportError = (error: Error, context?: string) => {
    // This could integrate with your error tracking service
    console.error('Reported error:', error, context);
    
    // You could also trigger a toast notification or modal here
    // For now, we'll just log it
  };

  return { reportError };
}
