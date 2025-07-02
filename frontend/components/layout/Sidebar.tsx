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
  Siren
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserInitials, getAvatarColor, getRoleBadgeColor, getAvatarAltText } from '@/lib/utils/avatar';

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
        description: 'View and manage shifts',
        children: [
          {
            title: 'My Schedule',
            href: '/volunteer/shifts',
            icon: Calendar,
            roles: ['Volunteer'],
            description: 'View your scheduled shifts'
          },
          {
            title: 'Available Shifts',
            href: '/volunteer/shifts/available',
            icon: PlusCircle,
            roles: ['Volunteer'],
            description: 'Browse and sign up for shifts'
          },
          {
            title: 'Shift History',
            href: '/volunteer/shifts/history',
            icon: Clock,
            roles: ['Volunteer'],
            description: 'View past shifts and hours'
          }
        ]
      },
      {
        title: 'Performance',
        href: '/volunteer/performance',
        icon: TrendingUp,
        roles: ['Volunteer'],
        description: 'View your performance metrics'
      },
      {
        title: 'Achievements',
        href: '/volunteer/achievements',
        icon: Award,
        roles: ['Volunteer'],
        description: 'View badges and achievements'
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
  {
    title: 'Training & Development',
    roles: ['Volunteer'],
    items: [
      {
        title: 'Training Hub',
        href: '/volunteer/training',
        icon: BookOpen,
        roles: ['Volunteer'],
        description: 'Access training materials'
      },
      {
        title: 'Certifications',
        href: '/volunteer/certifications',
        icon: BadgeCheck,
        roles: ['Volunteer'],
        description: 'View your certifications'
      },
      {
        title: 'Skill Development',
        href: '/volunteer/skills',
        icon: Target,
        roles: ['Volunteer'],
        description: 'Track skill development'
      }
    ]
  },
  {
    title: 'Team & Leadership',
    roles: ['Volunteer'],
    items: [
      {
        title: 'Team Management',
        href: '/volunteer/team',
        icon: Users,
        roles: ['Volunteer'],
        description: 'Manage your volunteer team',
        isNew: true
      },
      {
        title: 'Team Communication',
        href: '/volunteer/team/communication',
        icon: MessageSquare,
        roles: ['Volunteer'],
        description: 'Team chat and messaging'
      },
      {
        title: 'Team Analytics',
        href: '/volunteer/team/analytics',
        icon: BarChart3,
        roles: ['Volunteer'],
        description: 'Team performance analytics'
      },
      {
        title: 'Meeting Scheduler',
        href: '/volunteer/team/meetings',
        icon: Calendar,
        roles: ['Volunteer'],
        description: 'Schedule team meetings'
      }
    ]
  },
  {
    title: 'Emergency & Special',
    roles: ['Volunteer'],
    items: [
      {
        title: 'Emergency Response',
        href: '/volunteer/emergency',
        icon: Shield,
        roles: ['Volunteer'],
        description: 'Emergency response tools'
      },
      {
        title: 'Special Events',
        href: '/volunteer/events',
        icon: Star,
        roles: ['Volunteer'],
        description: 'Special event volunteering'
      },
      {
        title: 'Flexible Shifts',
        href: '/volunteer/flexible-shifts',
        icon: Clock,
        roles: ['Volunteer'],
        description: 'On-demand shift opportunities'
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
    title: 'Admin Overview',
    roles: ['Admin'],
    items: [
      {
        title: 'Admin Dashboard',
        href: '/admin',
        icon: Home,
        roles: ['Admin'],
        description: 'Main administrative overview',
        isImportant: true
      },
      {
        title: 'Analytics Hub',
        href: '/admin/analytics',
        icon: BarChart3,
        roles: ['Admin'],
        description: 'Comprehensive system analytics'
      },
      {
        title: 'Reports Center',
        href: '/admin/reports',
        icon: FileText,
        roles: ['Admin'],
        description: 'Generate and manage reports'
      },
      {
        title: 'Comprehensive View',
        href: '/admin/comprehensive',
        icon: Database,
        roles: ['Admin'],
        description: 'All-in-one admin tools'
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
        icon: UserCheck,
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
        title: 'Donors',
        href: '/admin/donors',
        icon: Heart,
        roles: ['Admin'],
        description: 'Manage donor accounts'
      }
    ]
  },
  {
    title: 'Volunteer Management',
    roles: ['Admin'],
    items: [
      {
        title: 'Volunteer Overview',
        href: '/admin/volunteers',
        icon: UserCheck,
        roles: ['Admin'],
        description: 'Volunteer dashboard and overview',
        isImportant: true
      },
      {
        title: 'Applications',
        href: '/admin/volunteers/applications',
        icon: UserPlus,
        roles: ['Admin'],
        description: 'Review volunteer applications'
      },
      {
        title: 'Role Management',
        href: '/admin/volunteers/roles',
        icon: Shield,
        roles: ['Admin'],
        description: 'Manage volunteer roles and permissions',
        isNew: true
      },
      {
        title: 'Shift Management',
        href: '/admin/volunteers/shifts',
        icon: Calendar,
        roles: ['Admin'],
        description: 'Manage volunteer shift schedules',
        children: [
          {
            title: 'Calendar View',
            href: '/admin/volunteers/shifts/calendar',
            icon: Calendar,
            roles: ['Admin'],
            description: 'Calendar view of shifts'
          },
          {
            title: 'Flexible Shifts',
            href: '/admin/volunteers/flexible-shifts',
            icon: Clock,
            roles: ['Admin'],
            description: 'Manage flexible shift opportunities'
          }
        ]
      },
      {
        title: 'Performance',
        href: '/admin/volunteers/performance',
        icon: TrendingUp,
        roles: ['Admin'],
        description: 'Track volunteer performance metrics'
      }
    ]
  },
  {
    title: 'Service Operations',
    roles: ['Admin'],
    items: [
      {
        title: 'Help Requests',
        href: '/admin/help-requests',
        icon: HelpCircle,
        roles: ['Admin'],
        description: 'Manage visitor help requests',
        isImportant: true
      },
      {
        title: 'Document Center',
        href: '/admin/documents',
        icon: FileText,
        roles: ['Admin'],
        description: 'Review and manage documents'
      },
      {
        title: 'Donation Tracking',
        href: '/admin/donations',
        icon: Gift,
        roles: ['Admin'],
        description: 'Monitor and track donations'
      },
      {
        title: 'Feedback Management',
        href: '/admin/feedback',
        icon: MessageSquare,
        roles: ['Admin'],
        description: 'Review user feedback and surveys'
      }
    ]
  },
  {
    title: 'Emergency & Security',
    roles: ['Admin'],
    items: [
      {
        title: 'Emergency Management',
        href: '/admin/emergency',
        icon: Siren,
        roles: ['Admin'],
        description: 'Emergency procedures and incidents',
        isImportant: true
      },
      {
        title: 'System Health',
        href: '/admin/system-health',
        icon: Shield,
        roles: ['Admin'],
        description: 'Monitor system health'
      },
      {
        title: 'Security Logs',
        href: '/admin/security',
        icon: Database,
        roles: ['Admin'],
        description: 'View security audit logs'
      }
    ]
  },
  {
    title: 'Communications',
    roles: ['Admin'],
    items: [
      {
        title: 'Notifications',
        href: '/admin/notifications',
        icon: Bell,
        roles: ['Admin'],
        description: 'Manage system notifications'
      },
      {
        title: 'Communications',
        href: '/admin/communications',
        icon: MessageSquare,
        roles: ['Admin'],
        description: 'Send messages and announcements',
        children: [
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
    title: 'System Administration',
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
        title: 'Testing Tools',
        href: '/admin/testing',
        icon: FlaskConical,
        roles: ['Admin'],
        description: 'System testing and debugging tools',
        children: [
          {
            title: 'Visitor Journey',
            href: '/admin/testing/visitor-journey',
            icon: Target,
            roles: ['Admin'],
            description: 'Test visitor flows and workflows'
          },
          {
            title: 'WebSocket Test',
            href: '/admin/websocket-test',
            icon: Activity,
            roles: ['Admin'],
            description: 'Test real-time features and connections'
          }
        ]
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
  const [searchQuery, setSearchQuery] = useState('');
  
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
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all cursor-pointer group',
            isChild ? 'ml-4 pl-6' : '',
            isActive 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            item.isImportant && !isActive && 'text-orange-600 dark:text-orange-400',
            isChild && 'text-xs'
          )}
          onClick={hasChildren ? () => toggleItem(item.href) : undefined}
        >
          {hasChildren ? (
            <>
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
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 flex-shrink-0" />
              )}
            </>
          ) : (
            <Link
              href={item.href}
              className="flex items-center gap-3 w-full"
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



  // Add search functionality
  const getAllSearchableItems = (sections: SidebarSection[]): any[] => {
    const items: any[] = [];
    
    sections.forEach(section => {
      section.items.forEach(item => {
        items.push({
          title: item.title,
          href: item.href,
          icon: item.icon,
          description: item.description,
          category: section.title,
          keywords: [item.title.toLowerCase(), section.title.toLowerCase()]
        });
        
        // Add children items
        if (item.children) {
          item.children.forEach(child => {
            items.push({
              title: `${item.title} > ${child.title}`,
              href: child.href,
              icon: child.icon,
              description: child.description,
              category: section.title,
              keywords: [child.title.toLowerCase(), item.title.toLowerCase(), section.title.toLowerCase()]
            });
          });
        }
      });
    });
    
    return items;
  };

  const allSearchableItems = getAllSearchableItems(sidebarSections);

  const filteredSearchResults = allSearchableItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.keywords.some((keyword: string) => keyword.includes(searchQuery.toLowerCase()))
  );

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
            <div className="flex items-center gap-1 mt-1">
              <Badge className={cn('text-xs', getRoleBadgeColor(user.role))}>
                {user.role}
              </Badge>
              {/* Volunteer-specific badges */}
              {user.role === 'Volunteer' && (
                <>
                  {user.volunteerLevel && (
                    <Badge variant="outline" className="text-xs bg-gradient-to-r from-green-100 to-blue-100 text-green-800 border-green-300">
                      {user.volunteerLevel}
                    </Badge>
                  )}
                  {user.specializations && user.specializations.length > 0 && (
                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                      {user.specializations.length} Specializations
                    </Badge>
                  )}
                  {user.canTrain && (
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                      🎓 Trainer
                    </Badge>
                  )}
                  {user.canManageShifts && (
                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                      📅 Shift Manager
                    </Badge>
                  )}
                  {user.emergencyCertified && (
                    <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300">
                      🛡️ Emergency
                    </Badge>
                  )}
                </>
              )}
              {/* Admin-specific badges */}
              {user.role === 'Admin' && (
                <>
                  {user.adminLevel && (
                    <Badge variant="outline" className="text-xs bg-gradient-to-r from-red-100 to-orange-100 text-red-800 border-red-300">
                      {user.adminLevel}
                    </Badge>
                  )}
                  {user.canManageUsers && (
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                      👥 User Management
                    </Badge>
                  )}
                  {user.canManageSystem && (
                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                      ⚙️ System Admin
                    </Badge>
                  )}
                  {user.canAccessEmergency && (
                    <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300">
                      🚨 Emergency Access
                    </Badge>
                  )}
                  {user.canViewAnalytics && (
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                      📊 Analytics
                    </Badge>
                  )}
                </>
              )}
            </div>
            {/* Volunteer team information */}
            {user.role === 'Volunteer' && user.teamInfo && (
              <div className="text-xs text-muted-foreground mt-1">
                Team: {user.teamInfo.name} ({user.teamInfo.memberCount} members)
              </div>
            )}
            {/* Admin system information */}
            {user.role === 'Admin' && (
              <div className="text-xs text-muted-foreground mt-1">
                System: {user.lastLogin ? `Last login ${new Date(user.lastLogin).toLocaleDateString()}` : 'Active'}
              </div>
            )}
            {/* Status indicator */}
            <div className="flex items-center gap-1 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto py-4">
        <nav className="px-3 space-y-2">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search navigation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          
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
          
          {/* Render search results if any */}
          {searchQuery && filteredSearchResults.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Search Results
              </div>
              <div className="space-y-1">
                {filteredSearchResults.map(item => (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    className="flex items-center gap-3 p-2 text-sm rounded-lg hover:bg-muted/50 transition-colors"
                    onClick={() => setOpen?.(false)}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 font-medium">{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>
      </div>
      
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
          
          {user.role === 'Volunteer' && (
            <>
              <Link
                href="/volunteer/shifts/available"
                className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                onClick={() => setOpen?.(false)}
              >
                <PlusCircle className="h-4 w-4" />
                Find Shifts
              </Link>
              <Link
                href="/volunteer/check-in"
                className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-muted/50 transition-colors"
                onClick={() => setOpen?.(false)}
              >
                <UserCheck className="h-4 w-4" />
                Check-in Visitors
              </Link>
              {user.canManageShifts && (
                <Link
                  href="/volunteer/team"
                  className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-muted/50 transition-colors"
                  onClick={() => setOpen?.(false)}
                >
                  <Users className="h-4 w-4" />
                  Manage Team
                </Link>
              )}
            </>
          )}
          
          {user.role === 'Admin' && (
            <>
              <Link
                href="/admin/emergency"
                className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                onClick={() => setOpen?.(false)}
              >
                <Siren className="h-4 w-4" />
                Emergency Access
              </Link>
              <Link
                href="/admin/help-requests"
                className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                onClick={() => setOpen?.(false)}
              >
                <HelpCircle className="h-4 w-4" />
                Review Requests
              </Link>
              <Link
                href="/admin/analytics"
                className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-muted/50 transition-colors"
                onClick={() => setOpen?.(false)}
              >
                <BarChart3 className="h-4 w-4" />
                View Analytics
              </Link>
              <Link
                href="/admin/system-health"
                className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-muted/50 transition-colors"
                onClick={() => setOpen?.(false)}
              >
                <Shield className="h-4 w-4" />
                System Health
              </Link>
            </>
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
    </div>
  );
};
