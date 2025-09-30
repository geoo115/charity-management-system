import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { useSafeMessagingContext } from '@/contexts/MessagingContext';
import { cn } from '@/lib/utils';
import { 
  Home, 
  User,
  Search,
  Calendar,
  Clock,
  UserCheck,
  Users,
  Bell,
  TrendingUp,
  BadgeCheck,
  MessageSquare,
  Award,
  BookOpen,
  LogOut,
  ChevronDown,
  ChevronRight,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserInitials, getAvatarColor, getRoleBadgeColor, getAvatarAltText } from '@/lib/utils/avatar';

interface VolunteerSidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
  isNew?: boolean;
  isImportant?: boolean;
  children?: VolunteerSidebarItem[];
}

interface VolunteerSidebarSection {
  title: string;
  items: VolunteerSidebarItem[];
  collapsible?: boolean;
}

const volunteerSidebarSections: VolunteerSidebarSection[] = [
  {
    title: 'Main',
    items: [
      {
        title: 'Dashboard',
        href: '/volunteer',
        icon: Home,
        description: 'Your volunteer overview',
        isImportant: true
      },
      {
        title: 'My Profile',
        href: '/volunteer/profile',
        icon: User,
        description: 'Manage your profile'
      }
    ]
  },
  {
    title: 'Shifts & Schedule',
    items: [
      {
        title: 'Available Shifts',
        href: '/volunteer/shifts/available',
        icon: Search,
        description: 'Find and sign up for shifts',
        isImportant: true
      },
      {
        title: 'My Shifts',
        href: '/volunteer/shifts/my-shifts',
        icon: Calendar,
        description: 'View your scheduled shifts'
      },
      {
        title: 'Shift Overview',
        href: '/volunteer/shifts',
        icon: Clock,
        description: 'All shift management'
      }
    ]
  },
  {
    title: 'Daily Tasks',
    items: [
      {
        title: 'Check-in Visitors',
        href: '/volunteer/check-in',
        icon: UserCheck,
        description: 'Help visitors check in'
      },
      {
        title: 'Queue Management',
        href: '/volunteer/queue',
        icon: Users,
        description: 'Manage service queues'
      },
      {
        title: 'Notifications',
        href: '/volunteer/notifications',
        icon: Bell,
        description: 'Important updates',
        badge: 3
      }
    ]
  },
  {
    title: 'Progress & Growth',
    items: [
      {
        title: 'Performance',
        href: '/volunteer/performance',
        icon: TrendingUp,
        description: 'Track your impact'
      },
      {
        title: 'Training',
        href: '/volunteer/training',
        icon: BookOpen,
        description: 'Complete training modules',
        isNew: true
      },
      {
        title: 'Achievements',
        href: '/volunteer/achievements',
        icon: Award,
        description: 'View your achievements'
      },
      {
        title: 'Team',
        href: '/volunteer/team',
        icon: Users,
        description: 'Collaborate with team'
      }
    ]
  },
  {
    title: 'Communication',
    items: [
      {
        title: 'Messages',
        href: '/volunteer/messages',
        icon: MessageSquare,
        description: 'Chat with admins and team',
        badge: 2
      },
      {
        title: 'Application Status',
        href: '/volunteer/application-status',
        icon: BadgeCheck,
        description: 'Check application status'
      }
    ]
  }
];

interface VolunteerSidebarProps {
  user?: any;
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

export const VolunteerSidebar: React.FC<VolunteerSidebarProps> = ({ user: passedUser, open, setOpen }) => {
  const pathname = usePathname();
  const { user: authUser, logout } = useAuth();
  
  // Safely get messaging context with fallback (hook at top-level)
  const messagingContext = useSafeMessagingContext();
  const totalUnreadCount = messagingContext?.totalUnreadCount ?? 0;

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  const user = passedUser || authUser;

  // Initialize expanded state for first section
  useEffect(() => {
    if (volunteerSidebarSections.length > 0) {
      setExpandedSections(prev => ({
        ...prev,
        [volunteerSidebarSections[0].title]: true
      }));
    }
  }, []);

  // Dynamic sidebar sections with messaging context
  const getSidebarSections = () => [
    {
      title: 'Main',
      items: [
        {
          title: 'Dashboard',
          href: '/volunteer',
          icon: Home,
          description: 'Your volunteer overview',
          isImportant: true
        },
        {
          title: 'My Profile',
          href: '/volunteer/profile',
          icon: User,
          description: 'Manage your profile'
        }
      ]
    },
    {
      title: 'Shifts & Schedule',
      items: [
        {
          title: 'Available Shifts',
          href: '/volunteer/shifts/available',
          icon: Search,
          description: 'Find and sign up for shifts',
          isImportant: true
        },
        {
          title: 'My Shifts',
          href: '/volunteer/shifts/my-shifts',
          icon: Calendar,
          description: 'Your scheduled shifts',
          badge: 3
        },
        {
          title: 'Time Tracking',
          href: '/volunteer/time-tracking',
          icon: Clock,
          description: 'Log your volunteer hours'
        }
      ]
    },
    {
      title: 'Team & Collaboration',
      items: [
        {
          title: 'Team Members',
          href: '/volunteer/team',
          icon: Users,
          description: 'Connect with your team'
        },
        {
          title: 'Meetings',
          href: '/volunteer/meetings',
          icon: UserCheck,
          description: 'Team meetings and updates'
        }
      ]
    },
    {
      title: 'Communication',
      items: [
        {
          title: 'Messages',
          href: '/volunteer/messages',
          icon: MessageSquare,
          description: 'Chat with admins and team',
          badge: totalUnreadCount > 0 ? totalUnreadCount : undefined
        },
        {
          title: 'Application Status',
          href: '/volunteer/application-status',
          icon: BadgeCheck,
          description: 'Check application status'
        }
      ]
    },
    {
      title: 'Development & Learning',
      items: [
        {
          title: 'Training Modules',
          href: '/volunteer/training',
          icon: BookOpen,
          description: 'Complete required training'
        },
        {
          title: 'My Achievements',
          href: '/volunteer/achievements',
          icon: Award,
          description: 'View your accomplishments'
        },
        {
          title: 'Performance',
          href: '/volunteer/performance',
          icon: TrendingUp,
          description: 'Track your progress'
        }
      ]
    },
    {
      title: 'Updates & Notifications',
      items: [
        {
          title: 'Notifications',
          href: '/volunteer/notifications',
          icon: Bell,
          description: 'Stay up to date',
          badge: 5
        },
        {
          title: 'Activity Feed',
          href: '/volunteer/activity',
          icon: Activity,
          description: 'Recent activities'
        }
      ]
    }
  ];

  // Initialize expanded state for first section
  useEffect(() => {
    if (volunteerSidebarSections.length > 0) {
      setExpandedSections(prev => ({
        ...prev,
        [volunteerSidebarSections[0].title]: true
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

  const renderNavItem = (item: VolunteerSidebarItem, isChild = false) => {
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

  const renderSection = (section: VolunteerSidebarSection) => {
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
          {getSidebarSections().map(renderSection)}
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