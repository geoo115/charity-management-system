import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { useSafeMessagingContext } from '@/contexts/MessagingContext';
import { cn } from '@/lib/utils';
import { 
  Home, 
  User,
  Heart,
  Gift,
  CreditCard,
  TrendingUp,
  BarChart3,
  Star,
  Award,
  Clock,
  Target,
  MessageSquare,
  Bell,
  LogOut,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserInitials, getAvatarColor, getRoleBadgeColor, getAvatarAltText } from '@/lib/utils/avatar';

interface DonorSidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
  isNew?: boolean;
  isImportant?: boolean;
  children?: DonorSidebarItem[];
}

interface DonorSidebarSection {
  title: string;
  items: DonorSidebarItem[];
  collapsible?: boolean;
}

const donorSidebarSections: DonorSidebarSection[] = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
        href: '/donor',
        icon: Home,
        description: 'Your donation overview'
      },
      {
        title: 'Profile',
        href: '/donor/profile',
        icon: User,
        description: 'Manage your profile'
      }
    ]
  },
  {
    title: 'Donations',
    items: [
      {
        title: 'Make Donation',
        href: '/donate',
        icon: Heart,
        description: 'Make a new donation',
        isImportant: true
      },
      {
        title: 'Donation History',
        href: '/donor/history',
        icon: FileText,
        description: 'View your past donations'
      },
      {
        title: 'Monthly Giving',
        href: '/donor/monthly',
        icon: Clock,
        description: 'Set up recurring donations',
        isNew: true
      }
    ]
  },
  {
    title: 'Impact & Recognition',
    items: [
      {
        title: 'My Impact',
        href: '/donor/impact',
        icon: TrendingUp,
        description: 'See your donation impact'
      },
      {
        title: 'Recognition',
        href: '/donor/recognition',
        icon: Award,
        description: 'View your achievements'
      },
      {
        title: 'Impact Reports',
        href: '/donor/reports',
        icon: BarChart3,
        description: 'Detailed impact analysis'
      }
    ]
  },
  {
    title: 'Community',
    items: [
      {
        title: 'Urgent Needs',
        href: '/donor/urgent-needs',
        icon: Target,
        description: 'Help with immediate needs',
        badge: 'New'
      },
      {
        title: 'Donor Community',
        href: '/donor/community',
        icon: Star,
        description: 'Connect with other donors'
      }
    ]
  },
  {
    title: 'Communication',
    items: [
      {
        title: 'Messages',
        href: '/donor/messages',
        icon: MessageSquare,
        description: 'Chat with admin support',
        badge: 1
      },
      {
        title: 'Feedback',
        href: '/donor/feedback',
        icon: Heart,
        description: 'Share your thoughts'
      }
    ]
  },
  {
    title: 'Notifications',
    items: [
      {
        title: 'Notifications',
        href: '/donor/notifications',
        icon: Bell,
        description: 'Donation updates and alerts',
        badge: 2
      }
    ]
  }
];

interface DonorSidebarProps {
  user?: any;
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

export const DonorSidebar: React.FC<DonorSidebarProps> = ({ user: passedUser, open, setOpen }) => {
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
    if (donorSidebarSections.length > 0) {
      setExpandedSections(prev => ({
        ...prev,
        [donorSidebarSections[0].title]: true
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

  const renderNavItem = (item: DonorSidebarItem, isChild = false) => {
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
            item.isImportant && !isActive && 'text-red-600 dark:text-red-400 font-medium',
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

  const renderSection = (section: DonorSidebarSection) => {
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
          {donorSidebarSections.map(renderSection)}
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