'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Home,
  Settings,
  Bell,
  Search,
  User,
  HelpCircle,
  LogOut,
  Maximize2,
  Minimize2,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { EnhancedNavigation } from './EnhancedNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserInitials, getAvatarColor, getAvatarAltText } from '@/lib/utils/avatar';
import { Logo } from '@/components/common/Logo';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

// Breakpoint definitions
export const breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Device type detection
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type BreakpointKey = keyof typeof breakpoints;

// Layout configuration
interface LayoutConfig {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  headerHeight: number;
  footerHeight: number;
  contentPadding: number;
  showMobileSidebar: boolean;
  deviceType: DeviceType;
  currentBreakpoint: BreakpointKey;
}

// Notification interface
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    href: string;
  };
}

// Custom hook for responsive behavior
export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [currentBreakpoint, setCurrentBreakpoint] = useState<BreakpointKey>('lg');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowSize({ width, height });

      // Determine device type
      if (width < breakpoints.md) {
        setDeviceType('mobile');
      } else if (width < breakpoints.lg) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }

      // Determine current breakpoint
      if (width >= breakpoints['2xl']) {
        setCurrentBreakpoint('2xl');
      } else if (width >= breakpoints.xl) {
        setCurrentBreakpoint('xl');
      } else if (width >= breakpoints.lg) {
        setCurrentBreakpoint('lg');
      } else if (width >= breakpoints.md) {
        setCurrentBreakpoint('md');
      } else if (width >= breakpoints.sm) {
        setCurrentBreakpoint('sm');
      } else {
        setCurrentBreakpoint('xs');
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call once to set initial values

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isDesktop = deviceType === 'desktop';

  const isBreakpoint = (bp: BreakpointKey) => {
    const bpIndex = Object.keys(breakpoints).indexOf(bp);
    const currentIndex = Object.keys(breakpoints).indexOf(currentBreakpoint);
    return currentIndex >= bpIndex;
  };

  return {
    windowSize,
    deviceType,
    currentBreakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isBreakpoint,
  };
};

// Header Component
interface HeaderProps {
  onMenuClick: () => void;
  onSettingsClick: () => void;
  notifications: Notification[];
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  onMenuClick, 
  onSettingsClick, 
  notifications, 
  className 
}) => {
  const { user, logout } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };



  const getDeviceIcon = () => {
    if (isMobile) return <Smartphone className="h-4 w-4" />;
    if (isTablet) return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <header className={cn(
      'sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60',
      className
    )}>
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
        {/* Mobile menu button */}
        {(isMobile || isTablet) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        )}

        {/* Logo/Brand */}
        <Logo 
          size="md" 
          showText={!isMobile} 
          href="/" 
          className="font-semibold"
        />

        {/* Search */}
        <div className="flex-1 max-w-md mx-4">
          {showSearch || !isMobile ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-3 py-2 text-sm placeholder:text-gray-500 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                onBlur={() => isMobile && setShowSearch(false)}
              />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(true)}
              className="ml-auto"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Device indicator */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded-md">
            {getDeviceIcon()}
            <span className="capitalize">{isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}</span>
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between p-3">
                <h3 className="font-medium">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary">{unreadCount} new</Badge>
                )}
              </div>
              <Separator />
              <div className="max-h-96 overflow-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer',
                        !notification.read && 'bg-blue-50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                          notification.type === 'error' && 'bg-red-500',
                          notification.type === 'warning' && 'bg-yellow-500',
                          notification.type === 'success' && 'bg-green-500',
                          notification.type === 'info' && 'bg-blue-500'
                        )} />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {notification.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {notifications.length > 5 && (
                <div className="p-3 border-t border-gray-200">
                  <Button variant="ghost" className="w-full text-sm">
                    View all notifications
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="hidden sm:inline-flex"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  {(user as any)?.avatar && <AvatarImage src={(user as any).avatar} alt={getAvatarAltText(user)} />}
                  <AvatarFallback className={getAvatarColor(user?.role || 'Visitor')}>
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user?.first_name && user?.last_name ? (
                    <p className="font-medium">{user.first_name} {user.last_name}</p>
                  ) : null}
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                  <Badge className="w-fit text-xs">
                    {user?.role}
                  </Badge>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSettingsClick}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Help</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

// Sidebar Component
interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse, className }) => {
  const { isDesktop } = useResponsive();

  if (!isDesktop) return null;

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 256 }}
      className={cn(
        'relative border-r border-gray-200 bg-white',
        className
      )}
    >
      {/* Collapse button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onCollapse(!collapsed)}
        className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {/* Navigation */}
      <EnhancedNavigation className={cn(
        'h-full transition-all duration-200',
        collapsed && 'w-20'
      )} />
    </motion.aside>
  );
};

// Footer Component
interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className }) => {
  const { isMobile } = useResponsive();

  if (isMobile) return null;

  return (
    <footer className={cn(
      'border-t border-gray-200 bg-white px-6 py-4',
      className
    )}>
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <span>© 2024 Lewisham Charity</span>
          <Separator orientation="vertical" className="h-4" />
          <span>All rights reserved</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="hover:text-gray-900 transition-colors">
            Privacy Policy
          </button>
          <Separator orientation="vertical" className="h-4" />
          <button className="hover:text-gray-900 transition-colors">
            Terms of Service
          </button>
          <Separator orientation="vertical" className="h-4" />
          <button className="hover:text-gray-900 transition-colors">
            Support
          </button>
        </div>
      </div>
    </footer>
  );
};

// Main Layout Component
interface ResponsiveLayoutProps {
  children: React.ReactNode;
  notifications?: Notification[];
  className?: string;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  notifications = [],
  className
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auto-collapse sidebar on smaller screens
  useEffect(() => {
    if (!isDesktop && sidebarCollapsed === false) {
      setSidebarCollapsed(true);
    }
  }, [isDesktop, sidebarCollapsed]);

  const handleMenuClick = () => {
    if (isMobile || isTablet) {
      setMobileSidebarOpen(true);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  return (
    <div className={cn('min-h-screen bg-gray-50 flex flex-col', className)}>
      {/* Header */}
      <Header
        onMenuClick={handleMenuClick}
        onSettingsClick={handleSettingsClick}
        notifications={notifications}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {isDesktop && (
          <Sidebar
            collapsed={sidebarCollapsed}
            onCollapse={setSidebarCollapsed}
          />
        )}

        {/* Mobile Sidebar */}
        {(isMobile || isTablet) && (
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="left" className="p-0 w-64">
              <EnhancedNavigation />
            </SheetContent>
          </Sheet>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />

      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>
              Customize your experience and preferences.
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-6 py-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Appearance</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  Light Mode
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  Dark Mode
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Layout</h3>
              <div className="space-y-2">
                <Button
                  variant={sidebarCollapsed ? "outline" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSidebarCollapsed(false)}
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Expanded Sidebar
                </Button>
                <Button
                  variant={sidebarCollapsed ? "ghost" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSidebarCollapsed(true)}
                >
                  <Minimize2 className="mr-2 h-4 w-4" />
                  Collapsed Sidebar
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Notifications</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Push Notifications</span>
                  <Button variant="outline" size="sm">
                    Enable
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email Notifications</span>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ResponsiveLayout; 