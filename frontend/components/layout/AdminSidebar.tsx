import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { useSafeMessagingContext } from '@/contexts/MessagingContext';
import { cn } from '@/lib/utils';
import { Home, Users, Heart, Calendar, Settings, HelpCircle, Gift, UserCheck, FileText, BarChart3, MessageSquare, LogOut, ChevronDown, ChevronRight, Bell, Shield, Award, Activity, PlusCircle, TrendingUp, Search, Database, FlaskConical, UserPlus, Building, BadgeCheck, LineChart, Eye, AlertTriangle, Phone, Mail, Siren, Monitor, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserInitials, getAvatarColor, getRoleBadgeColor, getAvatarAltText } from '@/lib/utils/avatar';

interface AdminSidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: AdminSidebarItem[];
  description?: string;
  isNew?: boolean;
  isImportant?: boolean;
}

interface AdminSidebarSection {
  title: string;
  items: AdminSidebarItem[];
  collapsible?: boolean;
}

const adminSidebarSections: AdminSidebarSection[] = [
  {
    title: 'Admin Overview',
    items: [
      {
        title: 'Admin Dashboard',
        href: '/admin',
        icon: Home,
        description: 'Main administrative overview',
        isImportant: true
      },
      {
        title: 'Analytics Hub',
        href: '/admin/analytics',
        icon: BarChart3,
        description: 'Comprehensive system analytics'
      },
      {
        title: 'Reports Center',
        href: '/admin/reports',
        icon: FileText,
        description: 'Generate and manage reports'
      }
    ]
  },
  {
    title: 'User Management',
    items: [
      {
        title: 'All Users',
        href: '/admin/users',
        icon: Users,
        description: 'Manage all users'
      },
      {
        title: 'Staff Management',
        href: '/admin/staff',
        icon: UserCheck,
        description: 'Manage staff members',
        isNew: true,
        children: [
          {
            title: 'Staff Overview',
            href: '/admin/staff',
            icon: Users,
            description: 'View all staff members'
          },
          {
            title: 'Add Staff',
            href: '/admin/staff/create',
            icon: UserPlus,
            description: 'Add new staff member'
          }
        ]
      },
      {
        title: 'Donors',
        href: '/admin/donors',
        icon: Heart,
        description: 'Manage donor accounts'
      }
    ]
  },
  {
    title: 'Volunteer Management',
    items: [
      {
        title: 'Volunteer Overview',
        href: '/admin/volunteers',
        icon: UserCheck,
        description: 'Volunteer dashboard and overview',
        isImportant: true
      },
      {
        title: 'Applications',
        href: '/admin/volunteers/applications',
        icon: UserPlus,
        description: 'Review volunteer applications'
      },
      {
        title: 'Role Management',
        href: '/admin/volunteers/roles',
        icon: Shield,
        description: 'Manage volunteer roles and permissions',
        isNew: true
      },
      {
        title: 'Shift Management',
        href: '/admin/volunteers/shifts',
        icon: Calendar,
        description: 'Manage volunteer shift schedules',
        children: [
          {
            title: 'Calendar View',
            href: '/admin/volunteers/shifts/calendar',
            icon: Calendar,
            description: 'Calendar view of shifts'
          },
          {
            title: 'Flexible Shifts',
            href: '/admin/volunteers/flexible-shifts',
            icon: Activity,
            description: 'Manage flexible shift opportunities'
          }
        ]
      }
    ]
  },
  {
    title: 'Service Operations',
    items: [
      {
        title: 'Help Requests',
        href: '/admin/help-requests',
        icon: HelpCircle,
        description: 'Manage visitor help requests',
        isImportant: true
      },
      {
        title: 'Document Center',
        href: '/admin/documents',
        icon: FileText,
        description: 'Review and manage documents'
      },
      {
        title: 'Donation Tracking',
        href: '/admin/donations',
        icon: Gift,
        description: 'Monitor and track donations'
      },
      {
        title: 'Feedback Management',
        href: '/admin/feedback',
        icon: MessageSquare,
        description: 'Review user feedback and surveys'
      }
    ]
  },
  {
    title: 'Emergency & Security',
    items: [
      {
        title: 'Emergency Management',
        href: '/admin/emergency',
        icon: Siren,
        description: 'Emergency procedures and incidents',
        isImportant: true
      },
      {
        title: 'System Health',
        href: '/admin/system-health',
        icon: Shield,
        description: 'Monitor system health'
      },
      {
        title: 'Security Logs',
        href: '/admin/security',
        icon: Database,
        description: 'View security audit logs'
      }
    ]
  },
  {
    title: 'Communications',
    items: [
      {
        title: 'Messages',
        href: '/admin/messages',
        icon: MessageSquare,
        description: 'Manage volunteer conversations',
        badge: 5
      },
      {
        title: 'Notifications',
        href: '/admin/notifications',
        icon: Bell,
        description: 'Manage system notifications'
      },
      {
        title: 'Communications',
        href: '/admin/communications',
        icon: Mail,
        description: 'Send messages and announcements',
        children: [
          {
            title: 'Templates',
            href: '/admin/communications/templates',
            icon: FileText,
            description: 'Message templates'
          },
          {
            title: 'Analytics',
            href: '/admin/communications/analytics',
            icon: BarChart3,
            description: 'Communication analytics'
          },
          {
            title: 'Settings',
            href: '/admin/communications/settings',
            icon: Settings,
            description: 'Communication settings'
          }
        ]
      }
    ]
  },
  {
    title: 'System Administration',
    items: [
      {
        title: 'Settings',
        href: '/admin/settings',
        icon: Settings,
        description: 'System settings'
      },
      {
        title: 'Testing Tools',
        href: '/admin/testing',
        icon: FlaskConical,
        description: 'System testing and debugging tools',
        children: [
          {
            title: 'Visitor Journey',
            href: '/admin/testing/visitor-journey',
            icon: Search,
            description: 'Test visitor flows and workflows'
          },
          {
            title: 'WebSocket Test',
            href: '/admin/websocket-test',
            icon: Activity,
            description: 'Test real-time features and connections'
          }
        ]
      }
    ]
  }
];

interface AdminSidebarProps {
  user?: any;
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ user: passedUser, open, setOpen }) => {
  const pathname = usePathname();
  const { user: authUser, logout } = useAuth();
  
  // Safely get messaging context with fallback (hook at top-level)
  const messagingContext = useSafeMessagingContext();
  const totalUnreadCount = messagingContext?.totalUnreadCount ?? 0;

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const user = passedUser || authUser;

  // Initialize expanded state for first section
  useEffect(() => {
    if (adminSidebarSections.length > 0) {
      setExpandedSections(prev => ({
        ...prev,
        [adminSidebarSections[0].title]: true
      }));
    }
  }, []);

  if (!user) return null;

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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderNavItem = (item: AdminSidebarItem, isChild = false) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.href];

    return (
      <div key={item.href}>
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all cursor-pointer group',
            isChild ? 'ml-4 pl-6' : '',
            isActive 
              ? 'bg-primary text-primary-foreground shadow-sm font-medium' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
            item.isImportant && !isActive && 'text-blue-600 dark:text-blue-400 font-medium',
            isChild && 'text-xs py-2'
          )}
          onClick={hasChildren ? () => toggleItem(item.href) : undefined}
        >
          {hasChildren ? (
            <>
              <Icon className={cn('h-4 w-4 flex-shrink-0', isChild && 'h-3 w-3')} />
              <span className="flex-1 font-medium">{item.title}</span>
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {item.badge && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
              {item.isNew && (
                <Badge variant="default" className="h-5 px-1.5 text-xs bg-green-500">
                  New
                </Badge>
              )}
            </>
          ) : (
            <Link href={item.href} className="flex items-center gap-3 w-full">
              <Icon className={cn('h-4 w-4 flex-shrink-0', isChild && 'h-3 w-3')} />
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
              {item.isNew && (
                <Badge variant="default" className="h-5 px-1.5 text-xs bg-green-500">
                  New
                </Badge>
              )}
            </Link>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4 space-y-1">
            {item.children?.map(child => renderNavItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (section: AdminSidebarSection) => {
    const isExpanded = expandedSections[section.title] ?? true;
    
    return (
      <div key={section.title} className="mb-4">
        <div 
          className="flex items-center gap-2 px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
          onClick={() => section.collapsible && toggleSection(section.title)}
        >
          <span className="flex-1">{section.title}</span>
          {section.collapsible && (
            isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          )}
        </div>
        
        {isExpanded && (
          <nav className="space-y-1">
            {section.items.map(item => renderNavItem(item))}
          </nav>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Header */}
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={getAvatarAltText(user)} />
            <AvatarFallback className={cn("text-xs font-medium", getAvatarColor(user.id))}>
              {getUserInitials(user)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.first_name} {user.last_name}</span>
            <Badge variant="outline" className={cn("text-xs", getRoleBadgeColor(user.role))}>
              {user.role}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {adminSidebarSections.map(renderSection)}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};