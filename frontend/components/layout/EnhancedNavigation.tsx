'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Users, 
  Heart, 
  Calendar, 
  Settings, 
  HelpCircle,
  Gift,
  UserCheck,
  FileText,
  User,
  CheckCircle,
  Clock,
  BarChart3,
  MessageSquare,
  Ticket,
  LogOut,
  ChevronDown,
  ChevronRight,
  Bell,
  Shield,
  Award,
  Activity,
  PlusCircle,
  TrendingUp,
  Search,
  MapPin,
  Star,
  CreditCard,
  BookOpen,
  Briefcase,
  Target,
  Database,
  FlaskConical,
  UserPlus,
  Building,
  BadgeCheck,
  LineChart,
  Eye,
  AlertTriangle,
  Phone,
  Mail,
  Siren,
  Menu,
  X,
  ArrowRight,
  Zap,
  HeartHandshake
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Navigation item interface
interface NavigationItem {
  id: string;
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  badge?: string | number;
  children?: NavigationItem[];
  description?: string;
  isNew?: boolean;
  isImportant?: boolean;
  shortcut?: string;
}

// Navigation section interface
interface NavigationSection {
  id: string;
  title: string;
  items: NavigationItem[];
  roles: string[];
  collapsible?: boolean;
  priority?: number;
}

// Enhanced navigation configuration
const navigationConfig: NavigationSection[] = [
  // VISITOR SECTIONS
  {
    id: 'visitor-overview',
    title: 'Overview',
    roles: ['Visitor'],
    priority: 1,
    items: [
      {
        id: 'visitor-dashboard',
        title: 'Dashboard',
        href: '/visitor',
        icon: Home,
        roles: ['Visitor'],
        description: 'Your personal overview',
        shortcut: '⌘D'
      },
      {
        id: 'visitor-profile',
        title: 'Profile',
        href: '/visitor/profile',
        icon: User,
        roles: ['Visitor'],
        description: 'Manage your information',
        shortcut: '⌘P'
      }
    ]
  },
  {
    id: 'visitor-help',
    title: 'Help & Support',
    roles: ['Visitor'],
    priority: 2,
    items: [
      {
        id: 'new-help-request',
        title: 'Request Help',
        href: '/visitor/help-request/new',
        icon: PlusCircle,
        roles: ['Visitor'],
        description: 'Submit a new help request',
        isImportant: true,
        shortcut: '⌘N'
      },
      {
        id: 'my-requests',
        title: 'My Requests',
        href: '/visitor/help-requests',
        icon: HelpCircle,
        roles: ['Visitor'],
        description: 'View your help requests',
        shortcut: '⌘R'
      },
      {
        id: 'eligibility-check',
        title: 'Eligibility Check',
        href: '/visitor/eligibility',
        icon: CheckCircle,
        roles: ['Visitor'],
        description: 'Check service eligibility'
      }
    ]
  },

  // VOLUNTEER SECTIONS
  {
    id: 'volunteer-overview',
    title: 'Overview',
    roles: ['Volunteer'],
    priority: 1,
    items: [
      {
        id: 'volunteer-dashboard',
        title: 'Dashboard',
        href: '/volunteer',
        icon: Home,
        roles: ['Volunteer'],
        description: 'Your volunteer overview',
        shortcut: '⌘D'
      },
      {
        id: 'volunteer-profile',
        title: 'Profile',
        href: '/volunteer/profile',
        icon: User,
        roles: ['Volunteer'],
        description: 'Manage your profile',
        shortcut: '⌘P'
      }
    ]
  },
  {
    id: 'volunteer-work',
    title: 'Work & Performance',
    roles: ['Volunteer'],
    priority: 2,
    items: [
      {
        id: 'volunteer-shifts',
        title: 'My Shifts',
        href: '/volunteer/shifts/my-shifts',
        icon: Calendar,
        roles: ['Volunteer'],
        description: 'View and manage shifts',
        shortcut: '⌘S',
        children: [
          {
            id: 'my-schedule',
            title: 'My Schedule',
            href: '/volunteer/shifts',
            icon: Calendar,
            roles: ['Volunteer'],
            description: 'View your scheduled shifts'
          },
          {
            id: 'available-shifts',
            title: 'Available Shifts',
            href: '/volunteer/shifts/available',
            icon: PlusCircle,
            roles: ['Volunteer'],
            description: 'Browse and sign up for shifts'
          }
        ]
      },
      {
        id: 'volunteer-performance',
        title: 'Performance',
        href: '/volunteer/performance',
        icon: TrendingUp,
        roles: ['Volunteer'],
        description: 'View your performance metrics'
      }
    ]
  },

  // DONOR SECTIONS
  {
    id: 'donor-overview',
    title: 'Overview',
    roles: ['Donor'],
    priority: 1,
    items: [
      {
        id: 'donor-dashboard',
        title: 'Dashboard',
        href: '/donor',
        icon: Home,
        roles: ['Donor'],
        description: 'Your donation overview',
        shortcut: '⌘D'
      }
    ]
  },
  {
    id: 'donor-donations',
    title: 'Donations',
    roles: ['Donor'],
    priority: 2,
    items: [
      {
        id: 'make-donation',
        title: 'Make Donation',
        href: '/donor/donate',
        icon: Heart,
        roles: ['Donor'],
        description: 'Make a new donation',
        isImportant: true,
        shortcut: '⌘N',
        children: [
          {
            id: 'monetary-donation',
            title: 'Monetary',
            href: '/donor/donate/monetary',
            icon: CreditCard,
            roles: ['Donor'],
            description: 'Donate money'
          },
          {
            id: 'goods-donation',
            title: 'Goods',
            href: '/donor/donate/goods',
            icon: Gift,
            roles: ['Donor'],
            description: 'Donate goods'
          }
        ]
      }
    ]
  },

  // ADMIN SECTIONS
  {
    id: 'admin-overview',
    title: 'Admin Overview',
    roles: ['Admin'],
    priority: 1,
    items: [
      {
        id: 'admin-dashboard',
        title: 'Admin Dashboard',
        href: '/admin',
        icon: Home,
        roles: ['Admin'],
        description: 'Main administrative overview',
        isImportant: true,
        shortcut: '⌘D'
      },
      {
        id: 'analytics-hub',
        title: 'Analytics Hub',
        href: '/admin/analytics',
        icon: BarChart3,
        roles: ['Admin'],
        description: 'Comprehensive system analytics',
        shortcut: '⌘A'
      }
    ]
  },
  {
    id: 'admin-users',
    title: 'User Management',
    roles: ['Admin'],
    priority: 2,
    items: [
      {
        id: 'all-users',
        title: 'All Users',
        href: '/admin/users',
        icon: Users,
        roles: ['Admin'],
        description: 'Manage all users',
        shortcut: '⌘U'
      },
      {
        id: 'volunteers-management',
        title: 'Volunteers',
        href: '/admin/volunteers',
        icon: UserCheck,
        roles: ['Admin'],
        description: 'Manage volunteer accounts'
      }
    ]
  },
  {
    id: 'admin-operations',
    title: 'Service Operations',
    roles: ['Admin'],
    priority: 3,
    items: [
      {
        id: 'help-requests-admin',
        title: 'Help Requests',
        href: '/admin/help-requests',
        icon: HelpCircle,
        roles: ['Admin'],
        description: 'Manage visitor help requests',
        isImportant: true,
        shortcut: '⌘H'
      },
      {
        id: 'documents-admin',
        title: 'Document Center',
        href: '/admin/documents',
        icon: FileText,
        roles: ['Admin'],
        description: 'Review and manage documents'
      }
    ]
  },
  {
    id: 'admin-emergency',
    title: 'Emergency & Security',
    roles: ['Admin'],
    priority: 4,
    items: [
      {
        id: 'emergency-management',
        title: 'Emergency Management',
        href: '/admin/emergency',
        icon: Siren,
        roles: ['Admin'],
        description: 'Emergency procedures and incidents',
        isImportant: true,
        shortcut: '⌘E'
      },
      {
        id: 'system-health',
        title: 'System Health',
        href: '/admin/system-health',
        icon: Shield,
        roles: ['Admin'],
        description: 'Monitor system health'
      }
    ]
  }
];

// Enhanced Navigation Item Component
interface NavigationItemProps {
  item: NavigationItem;
  isActive: boolean;
  isChild?: boolean;
  onItemClick?: () => void;
  expandedItems: Set<string>;
  onToggleExpand: (itemId: string) => void;
}

const NavigationItemComponent: React.FC<NavigationItemProps> = ({
  item,
  isActive,
  isChild = false,
  onItemClick,
  expandedItems,
  onToggleExpand
}) => {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.id);
  const Icon = item.icon;

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      onToggleExpand(item.id);
    } else {
      onItemClick?.();
    }
  };

  return (
    <div className="space-y-1">
      <div
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
          isChild ? 'ml-6 pl-3' : '',
          isActive 
            ? 'bg-green-100 text-green-900 shadow-sm border-l-4 border-green-600' 
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
          item.isImportant && !isActive && 'text-orange-600 hover:text-orange-700',
          hasChildren ? 'cursor-pointer' : ''
        )}
      >
        {hasChildren ? (
          <button
            onClick={handleClick}
            className="flex items-center gap-3 w-full text-left"
          >
            <Icon className={cn('h-4 w-4 flex-shrink-0', isChild && 'h-3 w-3')} />
            <span className="flex-1 truncate">{item.title}</span>
            {item.badge && (
              <Badge variant="secondary" className="text-xs">
                {item.badge}
              </Badge>
            )}
            {item.isNew && (
              <Badge className="text-xs bg-green-500 text-white">
                New
              </Badge>
            )}
            {item.isImportant && (
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
            )}
            <ChevronDown className={cn(
              'h-3 w-3 text-gray-500 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )} />
          </button>
        ) : (
          <Link
            href={item.href}
            onClick={onItemClick}
            className="flex items-center gap-3 w-full group"
          >
            <Icon className={cn('h-4 w-4 flex-shrink-0', isChild && 'h-3 w-3')} />
            <span className="flex-1 truncate">{item.title}</span>
            {item.badge && (
              <Badge variant="secondary" className="text-xs">
                {item.badge}
              </Badge>
            )}
            {item.isNew && (
              <Badge className="text-xs bg-green-500 text-white">
                New
              </Badge>
            )}
            {item.isImportant && (
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
            )}
            {item.shortcut && (
              <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 group-hover:opacity-100">
                {item.shortcut}
              </kbd>
            )}
            <ArrowRight className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        )}
      </div>

      {/* Render children if expanded */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1"
          >
            {item.children?.map(child => {
              const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
              const childActive = pathname === child.href;
              return (
                <NavigationItemComponent
                  key={child.id}
                  item={child}
                  isActive={childActive}
                  isChild={true}
                  onItemClick={onItemClick}
                  expandedItems={expandedItems}
                  onToggleExpand={onToggleExpand}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Breadcrumb item interface
interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

// Enhanced Navigation Component
interface EnhancedNavigationProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  showBreadcrumbs?: boolean;
  showProgress?: boolean;
  progress?: number;
  notifications?: number;
  className?: string;
}

const routeMap: Record<string, string> = {
  '/': 'Home',
  '/login': 'Login',
  '/register': 'Register',
  '/dashboard': 'Dashboard',
  '/admin': 'Admin',
  '/volunteer': 'Volunteer',
  '/donor': 'Donor',
  '/visitor': 'Visitor',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/help-requests': 'Help Requests',
  '/donations': 'Donations',
  '/volunteers': 'Volunteers',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/users': 'Users',
  '/shifts': 'Shifts',
  '/queue': 'Queue',
  '/documents': 'Documents',
  '/feedback': 'Feedback',
  '/emergency': 'Emergency',
  '/communications': 'Communications',
  '/system-health': 'System Health',
};

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/', icon: <Home className="h-3 w-3" /> }
  ];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = routeMap[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({
      label,
      href: currentPath,
    });
  }

  return breadcrumbs;
}

export const EnhancedNavigation: React.FC<EnhancedNavigationProps> = ({
  user,
  showBreadcrumbs = true,
  showProgress = false,
  progress = 0,
  notifications = 0,
  className
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const breadcrumbs = generateBreadcrumbs(pathname);

  // Quick search functionality
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            setIsSearchOpen(true);
            break;
          case '/':
            e.preventDefault();
            setIsSearchOpen(true);
            break;
          case 'h':
            e.preventDefault();
            router.push('/');
            break;
        }
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <div className={cn('w-full', className)}>
      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md dark:bg-gray-950/80">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center space-x-2 transition-opacity hover:opacity-80">
              <div className="flex items-center justify-center h-8 w-8 bg-primary text-primary-foreground rounded-md">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <span className="hidden md:inline-block font-bold text-lg">
                Lewisham Charity
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                Dashboard
              </Link>
              {user?.role === 'admin' && (
                <Link href="/admin" className="text-sm font-medium hover:text-primary transition-colors">
                  Admin
                </Link>
              )}
              <Link href="/help" className="text-sm font-medium hover:text-primary transition-colors">
                Help Center
              </Link>
            </nav>
          </div>

          {/* Right side - Search, Notifications, User Menu */}
          <div className="flex items-center gap-4">
            {/* Search Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:flex items-center gap-2 text-muted-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="hidden lg:inline">Search...</span>
              <Badge variant="outline" className="hidden lg:inline-flex text-xs">⌘K</Badge>
            </Button>

            {/* Notifications */}
            {user && (
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {notifications > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {notifications > 99 ? '99+' : notifications}
                  </Badge>
                )}
              </Button>
            )}

            {/* User Menu or Auth Buttons */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      <Badge variant="secondary" className="w-fit text-xs">
                        {user.role}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/logout')}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <AnimatePresence>
          {showProgress && progress > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 2, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full bg-muted"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-primary"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-b bg-white dark:bg-gray-950"
          >
            <div className="container px-4 py-4 space-y-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                  className="flex-1"
                />
              </div>
              <Separator />
              <nav className="space-y-2">
                <Link
                  href="/dashboard"
                  className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/help"
                  className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Help Center
                </Link>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumbs */}
      <AnimatePresence>
        {showBreadcrumbs && breadcrumbs.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-b bg-gray-50/50 dark:bg-gray-900/50"
          >
            <div className="container px-4 py-3">
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={item.href}>
                    {index > 0 && <ChevronRight className="h-3 w-3" />}
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {index === breadcrumbs.length - 1 ? (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          {item.icon}
                          {item.label}
                        </span>
                      ) : (
                        <Link
                          href={item.href}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      )}
                    </motion.div>
                  </React.Fragment>
                ))}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-lg mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border">
                <form onSubmit={handleSearch} className="p-4">
                  <div className="flex items-center gap-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search for help requests, users, documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 border-0 focus-visible:ring-0"
                      autoFocus
                    />
                    <Button type="submit" size="sm">
                      Search
                    </Button>
                  </div>
                </form>
                <Separator />
                <div className="p-3 text-xs text-muted-foreground">
                  <p>Press <Badge variant="outline" className="text-xs">⌘K</Badge> to search anytime</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedNavigation; 