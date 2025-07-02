import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';
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
  Monitor,
  Siren,
  Zap,
  AlertCircle,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserInitials, getAvatarColor, getRoleBadgeColor, getAvatarAltText } from '@/lib/utils/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarNotification } from './SidebarNotification';
import { SidebarSearch } from './SidebarSearch';
import { NotificationCenter } from '@/components/notifications';
import { Logo } from '@/components/common/Logo';

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  badge?: string | number;
  children?: SidebarItem[];
  description?: string;
  isNew?: boolean;
  isImportant?: boolean;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
  roles: string[];
  collapsible?: boolean;
}

const sidebarSections: SidebarSection[] = [
  // VISITOR SECTIONS
  {
    title: 'Overview',
    roles: ['Visitor'],
    items: [
      {
        title: 'Dashboard',
        href: '/visitor',
        icon: Home,
        roles: ['Visitor'],
        description: 'Your personal overview'
      },
      {
        title: 'Profile',
        href: '/visitor/profile',
        icon: User,
        roles: ['Visitor'],
        description: 'Manage your information'
      }
    ]
  },
  {
    title: 'Help & Support',
    roles: ['Visitor'],
    items: [
      {
        title: 'Request Help',
        href: '/visitor/help-request/new',
        icon: PlusCircle,
        roles: ['Visitor'],
        description: 'Submit a new help request',
        isImportant: true
      },
      {
        title: 'My Requests',
        href: '/visitor/help-requests',
        icon: HelpCircle,
        roles: ['Visitor'],
        description: 'View your help requests'
      },
      {
        title: 'Eligibility Check',
        href: '/visitor/eligibility',
        icon: CheckCircle,
        roles: ['Visitor'],
        description: 'Check service eligibility'
      }
    ]
  },
  {
    title: 'Services',
    roles: ['Visitor'],
    items: [
      {
        title: 'My Ticket',
        href: '/visitor/ticket',
        icon: Ticket,
        roles: ['Visitor'],
        description: 'View your service ticket'
      },
      {
        title: 'Queue Status',
        href: '/visitor/queue',
        icon: Clock,
        roles: ['Visitor'],
        description: 'Check waiting times'
      },
      {
        title: 'Check In',
        href: '/visitor/check-in',
        icon: MapPin,
        roles: ['Visitor'],
        description: 'Check in for your visit'
      },
      {
        title: 'Visit History',
        href: '/visitor/visits',
        icon: FileText,
        roles: ['Visitor'],
        description: 'View past visits'
      }
    ]
  },
  {
    title: 'Documents & Feedback',
    roles: ['Visitor'],
    items: [
      {
        title: 'Documents',
        href: '/visitor/documents',
        icon: FileText,
        roles: ['Visitor'],
        description: 'Upload and manage documents'
      },
      {
        title: 'Give Feedback',
        href: '/visitor/feedback',
        icon: MessageSquare,
        roles: ['Visitor'],
        description: 'Share your experience'
      },
      {
        title: 'Visitor Checker',
        href: '/visitor/checker',
        icon: UserCheck,
        roles: ['Visitor'],
        description: 'Verify visitor status'
      }
    ]
  },

  // VOLUNTEER SECTIONS
  {
    title: 'Overview',
    roles: ['Volunteer'],
    items: [
      {
        title: 'Dashboard',
        href: '/volunteer',
        icon: Home,
        roles: ['Volunteer'],
        description: 'Your volunteer overview'
      },
      {
        title: 'Profile',
        href: '/volunteer/profile',
        icon: User,
        roles: ['Volunteer'],
        description: 'Manage your profile'
      },
      {
        title: 'Application Status',
        href: '/volunteer/application-status',
        icon: BadgeCheck,
        roles: ['Volunteer'],
        description: 'Check application status'
      }
    ]
  },
  {
    title: 'Work & Performance',
    roles: ['Volunteer'],
    items: [
      {
        title: 'My Shifts',
        href: '/volunteer/shifts',
        icon: Calendar,
        roles: ['Volunteer'],
        description: 'View and manage shifts'
      },
      {
        title: 'Performance',
        href: '/volunteer/performance',
        icon: TrendingUp,
        roles: ['Volunteer'],
        description: 'View your performance'
      },
      {
        title: 'Team Management',
        href: '/volunteer/team',
        icon: Users,
        roles: ['Volunteer'],
        description: 'Manage your volunteer teams',
        isNew: true,
        badge: 'Lead Only'
      }
    ]
  },
  {
    title: 'Service Operations',
    roles: ['Volunteer'],
    items: [
      {
        title: 'Check-in Visitors',
        href: '/volunteer/check-in',
        icon: UserCheck,
        roles: ['Volunteer'],
        description: 'Help visitors check in'
      },
      {
        title: 'Queue Management',
        href: '/volunteer/queue',
        icon: Clock,
        roles: ['Volunteer'],
        description: 'Manage service queues'
      },
      {
        title: 'Notifications',
        href: '/volunteer/notifications',
        icon: Bell,
        roles: ['Volunteer'],
        description: 'View important updates'
      }
    ]
  },

  // DONOR SECTIONS
  {
    title: 'Overview',
    roles: ['Donor'],
    items: [
      {
        title: 'Dashboard',
        href: '/donor',
        icon: Home,
        roles: ['Donor'],
        description: 'Your donation overview'
      }
    ]
  },
  {
    title: 'Donations',
    roles: ['Donor'],
    items: [
      {
        title: 'Make Donation',
        href: '/donor/donate',
        icon: Heart,
        roles: ['Donor'],
        description: 'Make a new donation',
        isImportant: true,
        children: [
          {
            title: 'Monetary',
            href: '/donor/donate/monetary',
            icon: CreditCard,
            roles: ['Donor'],
            description: 'Donate money'
          },
          {
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
    title: 'Overview',
    roles: ['Admin'],
    items: [
      {
        title: 'Dashboard',
        href: '/admin',
        icon: Home,
        roles: ['Admin'],
        description: 'Administrative overview',
        isImportant: true
      },
      {
        title: 'Analytics',
        href: '/admin/analytics',
        icon: BarChart3,
        roles: ['Admin'],
        description: 'Analytics dashboard'
      },
      {
        title: 'Reports',
        href: '/admin/reports',
        icon: FileText,
        roles: ['Admin'],
        description: 'View detailed reports'
      }
    ]
  },
  {
    title: 'User Management',
    roles: ['Admin'],
    items: [
      {
        title: 'All Users',
        href: '/admin/users',
        icon: Users,
        roles: ['Admin'],
        description: 'Manage all users'
      },
      {
        title: 'Staff Management',
        href: '/admin/staff',
        icon: Building,
        roles: ['Admin'],
        description: 'Manage staff members',
        isNew: true,
        children: [
          {
            title: 'Staff Overview',
            href: '/admin/staff',
            icon: Users,
            roles: ['Admin'],
            description: 'View all staff members'
          },
          {
            title: 'Add Staff',
            href: '/admin/staff/create',
            icon: UserPlus,
            roles: ['Admin'],
            description: 'Add new staff member'
          }
        ]
      },
      {
        title: 'Volunteers',
        href: '/admin/volunteers',
        icon: UserCheck,
        roles: ['Admin'],
        description: 'Manage volunteers',
        children: [
          {
            title: 'Applications',
            href: '/admin/volunteers/applications',
            icon: UserPlus,
            roles: ['Admin'],
            description: 'Review volunteer applications'
          },
          {
            title: 'Roles',
            href: '/admin/volunteers/roles',
            icon: Shield,
            roles: ['Admin'],
            description: 'Manage volunteer roles and permissions',
            isNew: true
          },
          {
            title: 'Shifts',
            href: '/admin/volunteers/shifts',
            icon: Calendar,
            roles: ['Admin'],
            description: 'Manage shift schedules'
          }
        ]
      }
    ]
  },
  {
    title: 'Service Management',
    roles: ['Admin'],
    items: [
      {
        title: 'Help Requests',
        href: '/admin/help-requests',
        icon: HelpCircle,
        roles: ['Admin'],
        description: 'Manage help requests'
      },
      {
        title: 'Documents',
        href: '/admin/documents',
        icon: FileText,
        roles: ['Admin'],
        description: 'Document management'
      },
      {
        title: 'Donations',
        href: '/admin/donations',
        icon: Gift,
        roles: ['Admin'],
        description: 'Track donations'
      },
      {
        title: 'Feedback',
        href: '/admin/feedback',
        icon: MessageSquare,
        roles: ['Admin'],
        description: 'Review feedback'
      },
      {
        title: 'Communications',
        href: '/admin/communications',
        icon: Mail,
        roles: ['Admin'],
        description: 'Message management',
        children: [
          {
            title: 'Overview',
            href: '/admin/communications',
            icon: MessageSquare,
            roles: ['Admin'],
            description: 'Communication dashboard'
          },
          {
            title: 'Templates',
            href: '/admin/communications/templates',
            icon: FileText,
            roles: ['Admin'],
            description: 'Message templates'
          },
          {
            title: 'Analytics',
            href: '/admin/communications/analytics',
            icon: BarChart3,
            roles: ['Admin'],
            description: 'Communication analytics'
          },
          {
            title: 'Settings',
            href: '/admin/communications/settings',
            icon: Settings,
            roles: ['Admin'],
            description: 'Communication settings'
          }
        ]
      }
    ]
  },
  {
    title: 'System',
    roles: ['Admin'],
    items: [
      {
        title: 'Settings',
        href: '/admin/settings',
        icon: Settings,
        roles: ['Admin'],
        description: 'System settings'
      },
      {
        title: 'System Health',
        href: '/admin/system-health',
        icon: Monitor,
        roles: ['Admin'],
        description: 'Monitor system health and performance'
      },
      {
        title: 'Emergency Procedures',
        href: '/admin/emergency',
        icon: Siren,
        roles: ['Admin'],
        description: 'Emergency workflows and procedures',
        children: [
          {
            title: 'Dashboard',
            href: '/admin/emergency',
            icon: AlertTriangle,
            roles: ['Admin'],
            description: 'Emergency overview'
          },
          {
            title: 'Workflows',
            href: '/admin/emergency/workflows',
            icon: List,
            roles: ['Admin'],
            description: 'Manage emergency workflows'
          },
          {
            title: 'Active Incidents',
            href: '/admin/emergency/incidents',
            icon: Zap,
            roles: ['Admin'],
            description: 'Monitor active incidents'
          },
          {
            title: 'Communication',
            href: '/admin/emergency/communication',
            icon: AlertCircle,
            roles: ['Admin'],
            description: 'Emergency notifications'
          }
        ]
      },
      {
        title: 'Testing',
        href: '/admin/testing',
        icon: FlaskConical,
        roles: ['Admin'],
        description: 'System testing tools',
        children: [
          {
            title: 'Visitor Journey',
            href: '/admin/testing/visitor-journey',
            icon: Target,
            roles: ['Admin'],
            description: 'Test visitor flows'
          }
        ]
      },
      {
        title: 'Comprehensive',
        href: '/admin/comprehensive',
        icon: Database,
        roles: ['Admin'],
        description: 'Comprehensive admin tools'
      },
      {
        title: 'Quick Reports',
        href: '/admin/reports',
        icon: FileText,
        roles: ['Admin'],
        description: 'Quick access to reports'
      },
      {
        title: 'System Online',
        href: '/admin/system-health',
        icon: CheckCircle,
        roles: ['Admin'],
        description: 'System status and health',
        badge: '✓'
      }
    ]
  }
];

interface SidebarProps {
  user?: any;
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user: passedUser, open, setOpen }) => {
  const pathname = usePathname();
  const { user: authUser, logout } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  const user = passedUser || authUser;

  if (!user) return null;

  // Filter sections by user role
  const filteredSections = sidebarSections.filter(section => 
    section.roles.includes(user.role)
  );

  // Toggle section expansion
  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  // Toggle item expansion (for items with children)
  const toggleItem = (itemHref: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemHref]: !prev[itemHref]
    }));
  };

  // Initialize expanded state for first section
  useEffect(() => {
    if (filteredSections.length > 0) {
      setExpandedSections(prev => ({
        ...prev,
        [filteredSections[0].title]: true
      }));
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderNavItem = (item: SidebarItem, isChild = false) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.href];

    return (
      <div key={item.href}>
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all group',
            isChild ? 'ml-4 pl-6' : '',
            isActive 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            item.isImportant && !isActive && 'text-orange-600 dark:text-orange-400',
            isChild && 'text-xs'
          )}
        >
          {hasChildren ? (
            <>
              {/* Main link part - clickable to navigate */}
              <Link
                href={item.href}
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={() => setOpen?.(false)}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', isChild && 'h-3 w-3')} />
                <span className="flex-1 font-medium">{item.title}</span>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {item.badge}
                  </Badge>
                )}
                {item.isNew && (
                  <Badge variant="default" className="text-xs bg-green-500">
                    New
                  </Badge>
                )}
                {item.isImportant && (
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                )}
              </Link>
              {/* Expand/collapse button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleItem(item.href);
                }}
                className="p-1 hover:bg-muted/50 rounded cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-3 w-3 flex-shrink-0" />
                )}
              </button>
            </>
          ) : (
            <Link
              href={item.href}
              className="flex items-center gap-3 w-full cursor-pointer"
              onClick={() => setOpen?.(false)}
            >
              <Icon className={cn('h-4 w-4 flex-shrink-0', isChild && 'h-3 w-3')} />
              <span className="flex-1 font-medium">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="text-xs">
                  {item.badge}
                </Badge>
              )}
              {item.isNew && (
                <Badge variant="default" className="text-xs bg-green-500">
                  New
                </Badge>
              )}
              {item.isImportant && (
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
              )}
            </Link>
          )}
        </div>
        
        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderNavItem(child, true))}
          </div>
        )}
      </div>
    );
  };



  // Search functionality
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Get all searchable items from navigation
  const getAllSearchableItems = () => {
    const items: any[] = [];
    const userSections = sidebarSections.filter(section => 
      section.roles.includes(user.role)
    );
    
    userSections.forEach(section => {
      section.items.forEach(item => {
        if (item.roles.includes(user.role)) {
          items.push({
            title: item.title,
            href: item.href,
            description: item.description,
            category: section.title,
            isNew: item.isNew,
            isImportant: item.isImportant,
            badge: item.badge
          });
          
          // Add children if any
          if (item.children) {
            item.children.forEach(child => {
              if (child.roles.includes(user.role)) {
                items.push({
                  title: `${item.title} > ${child.title}`,
                  href: child.href,
                  description: child.description,
                  category: section.title,
                  isNew: child.isNew,
                  isImportant: child.isImportant,
                  badge: child.badge
                });
              }
            });
          }
        }
      });
    });
    
    return items;
  };

  // Handle search keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-full w-64 flex-col bg-background border-r shadow-sm">
      {/* User Profile Section */}
      <div className="p-4 border-b bg-muted/20">
        <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar} alt={getAvatarAltText(user)} />
              <AvatarFallback className={getAvatarColor(user.role)}>
                {getUserInitials(user)}
              </AvatarFallback>
            </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.name || user?.email
              }
            </div>
                                        <Badge className={cn('text-xs mt-1', getRoleBadgeColor(user.role))}>
                {user.role}
              </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchOpen(true)}
              className="h-8 w-8 p-0 hover:bg-muted/50"
              title="Search navigation (Ctrl+K)"
            >
              <Search className="h-4 w-4" />
            </Button>
            <NotificationCenter />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-2">{/*...existing navigation code...*/}
          {filteredSections.map((section) => {
            const isExpanded = expandedSections[section.title];
            
            return (
              <div key={section.title}>
                {section.collapsible !== false && (
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="flex items-center gap-2 w-full px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    {section.title}
                  </button>
                )}
                
                {isExpanded && (
                  <div className="space-y-1 mt-2">
                    {section.items.map(item => renderNavItem(item))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>
      
      {/* Quick Actions */}
      <div className="p-3 border-t bg-muted/10">
        <div className="space-y-2">
          {user.role === 'Visitor' && (
            <Link
              href="/visitor/help-request/new"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              onClick={() => setOpen?.(false)}
            >
              <PlusCircle className="h-4 w-4" />
              Quick Request
            </Link>
          )}
          
          {user.role === 'Admin' && (
            <Link
              href="/admin/reports"
              className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => setOpen?.(false)}
            >
              <BarChart3 className="h-4 w-4" />
              Quick Reports
            </Link>
          )}
        </div>
      </div>

      {/* Footer with Logout */}
      <div className="p-3 border-t">
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
            <Activity className="h-3 w-3 text-green-500" />
            System Online
          </div>
          
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 text-muted-foreground hover:text-foreground justify-start h-9"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
      
      {/* Search Modal */}
      <SidebarSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        navigationItems={getAllSearchableItems()}
      />
    </div>
  );
};
