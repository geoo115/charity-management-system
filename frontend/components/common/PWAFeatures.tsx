'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  X,
  Smartphone,
  Monitor,
  Globe,
  Shield,
  Zap,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Hook for PWA install prompt
export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
        setDeferredPrompt(null);
        return true;
      }
    } catch (error) {
      console.error('Installation failed:', error);
    }
    
    return false;
  }, [deferredPrompt]);

  const dismissInstallPrompt = useCallback(() => {
    setShowInstallPrompt(false);
    // Remember user dismissed it for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  }, []);

  return {
    showInstallPrompt: showInstallPrompt && !sessionStorage.getItem('pwa-install-dismissed'),
    isInstalled,
    installApp,
    dismissInstallPrompt,
  };
};

// Hook for network status
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get connection info if available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      setConnectionType(connection.effectiveType || 'unknown');
      
      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown');
      };
      
      connection.addEventListener('change', handleConnectionChange);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionType };
};

// PWA Install Banner Component
export const PWAInstallBanner: React.FC = () => {
  const { showInstallPrompt, installApp, dismissInstallPrompt } = usePWAInstall();
  const { toast } = useToast();

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      toast({
        title: "App Installed!",
        description: "Lewisham Charity has been added to your home screen.",
      });
    }
  };

  if (!showInstallPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Install Lewisham Charity</h3>
                <p className="text-xs opacity-90">Get the app experience with offline access</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleInstall}
                className="text-primary"
              >
                <Download className="h-4 w-4 mr-1" />
                Install
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissInstallPrompt}
                className="text-primary-foreground hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Network Status Indicator
export const NetworkStatusIndicator: React.FC = () => {
  const { isOnline, connectionType } = useNetworkStatus();
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowDetails(true);
      const timer = setTimeout(() => setShowDetails(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const getConnectionQuality = () => {
    switch (connectionType) {
      case 'slow-2g':
      case '2g':
        return { label: 'Slow', color: 'text-red-500' };
      case '3g':
        return { label: 'Good', color: 'text-yellow-500' };
      case '4g':
        return { label: 'Fast', color: 'text-green-500' };
      default:
        return { label: 'Unknown', color: 'text-gray-500' };
    }
  };

  const connectionQuality = getConnectionQuality();

  return (
    <AnimatePresence>
      {(showDetails || !isOnline) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed bottom-4 right-4 z-40"
        >
          <Card className={cn(
            'shadow-lg border-2',
            isOnline ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          )}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600" />
                )}
                
                <div className="text-sm">
                  <div className="font-medium">
                    {isOnline ? 'Connected' : 'Offline'}
                  </div>
                  {isOnline && connectionType !== 'unknown' && (
                    <div className={cn('text-xs', connectionQuality.color)}>
                      {connectionQuality.label} connection
                    </div>
                  )}
                  {!isOnline && (
                    <div className="text-xs text-red-600">
                      Limited functionality available
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Offline Fallback Component
interface OfflineFallbackProps {
  title?: string;
  description?: string;
  showRetry?: boolean;
  onRetry?: () => void;
}

export const OfflineFallback: React.FC<OfflineFallbackProps> = ({
  title = "You're offline",
  description = "This content isn't available offline. Please check your connection and try again.",
  showRetry = true,
  onRetry
}) => {
  const { isOnline } = useNetworkStatus();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md"
      >
        <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-4 mb-6 w-16 h-16 mx-auto flex items-center justify-center">
          <WifiOff className="h-8 w-8 text-gray-400" />
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h2>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {description}
        </p>
        
        {showRetry && (
          <Button
            onClick={handleRetry}
            disabled={!isOnline}
            className="min-w-[120px]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isOnline ? 'Retry' : 'Waiting for connection...'}
          </Button>
        )}
        
        {!isOnline && (
          <Alert className="mt-4 text-left">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No internet connection</AlertTitle>
            <AlertDescription>
              You&apos;ll be able to retry once your connection is restored.
            </AlertDescription>
          </Alert>
        )}
      </motion.div>
    </div>
  );
};

// PWA Features Card
export const PWAFeaturesCard: React.FC = () => {
  const { isInstalled } = usePWAInstall();
  const { isOnline } = useNetworkStatus();

  const features = [
    {
      icon: <Smartphone className="h-5 w-5" />,
      title: 'Mobile App Experience',
      description: 'Full-screen app-like interface',
      active: isInstalled
    },
    {
      icon: <WifiOff className="h-5 w-5" />,
      title: 'Offline Access',
      description: 'View cached content when offline',
      active: true
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: 'Fast Loading',
      description: 'Instant loading with caching',
      active: true
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: 'Secure',
      description: 'HTTPS and service worker security',
      active: true
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Progressive Web App
        </CardTitle>
        <CardDescription>
          Modern web technology for the best user experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className={cn(
                'p-2 rounded-lg',
                feature.active ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
              )}>
                {feature.icon}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{feature.title}</h4>
                  {feature.active && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              isOnline ? 'bg-green-500' : 'bg-red-500'
            )} />
            <span className="text-sm font-medium">
              {isOnline ? 'Online' : 'Offline Mode'}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            {isOnline 
              ? 'All features available with real-time updates'
              : 'Limited functionality - cached content only'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Service Worker Update Prompt
export const ServiceWorkerUpdate: React.FC = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setShowUpdatePrompt(true);
      });
    }
  }, []);

  const handleUpdate = () => {
    setIsUpdating(true);
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
  };

  if (!showUpdatePrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
      >
        <Card className="shadow-lg border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ArrowDown className="h-4 w-4 text-blue-600" />
              </div>
              
              <div className="flex-1">
                <h4 className="font-medium text-sm text-blue-900 mb-1">
                  Update Available
                </h4>
                <p className="text-xs text-blue-700 mb-3">
                  A new version of the app is ready. Refresh to get the latest features.
                </p>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUpdating ? (
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Update Now
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="text-blue-600 hover:bg-blue-100"
                  >
                    Later
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default {
  PWAInstallBanner,
  NetworkStatusIndicator,
  OfflineFallback,
  PWAFeaturesCard,
  ServiceWorkerUpdate,
  usePWAInstall,
  useNetworkStatus,
}; 