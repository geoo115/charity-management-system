import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';
import { 
  Home, 
  User,
  HelpCircle,
  PlusCircle,
  CheckCircle,
  Ticket,
  Clock,
  MapPin,
  FileText,
  MessageSquare,
  UserCheck,
  LogOut,
  ChevronDown,
  ChevronRight,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserInitials, getAvatarColor, getRoleBadgeColor, getAvatarAltText } from '@/lib/utils/avatar';

interface VisitorSidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
  isNew?: boolean;
  isImportant?: boolean;
}

interface VisitorSidebarSection {
  title: string;
  items: VisitorSidebarItem[];
  collapsible?: boolean;
}

const visitorSidebarSections: VisitorSidebarSection[] = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
        href: '/visitor',
        icon: Home,
        description: 'Your personal overview'
      },
      {
        title: 'Profile',
        href: '/visitor/profile',
        icon: User,
        description: 'Manage your information'
      }
    ]
  },
  {
    title: 'Help & Support',
    items: [
      {
        title: 'Request Help',
        href: '/visitor/help-request/new',
        icon: PlusCircle,
        description: 'Submit a new help request',
        isImportant: true
      },
      {
        title: 'My Requests',
        href: '/visitor/help-requests',
        icon: HelpCircle,
        description: 'View your help requests'
      },
      {
        title: 'Eligibility Check',
        href: '/visitor/eligibility',
        icon: CheckCircle,
        description: 'Check service eligibility'
      }
    ]
  },
  {
    title: 'Services',
    items: [
      {
        title: 'My Ticket',
        href: '/visitor/ticket',
        icon: Ticket,
        description: 'View your service ticket'
      },
      {
        title: 'Queue Status',
        href: '/visitor/queue',
        icon: Clock,
        description: 'Check waiting times'
      },
      {
        title: 'Check In',
        href: '/visitor/check-in',
        icon: MapPin,
        description: 'Check in for your visit'
      },
      {
        title: 'Visit History',
        href: '/visitor/visits',
        icon: FileText,
        description: 'View past visits'
      }
    ]
  },
  {
    title: 'Documents & Feedback',
    items: [
      {
        title: 'Documents',
        href: '/visitor/documents',
        icon: FileText,
        description: 'Upload and manage documents'
      },
      {
        title: 'Give Feedback',
        href: '/visitor/feedback',
        icon: MessageSquare,
        description: 'Share your experience'
      },
      {
        title: 'Visitor Checker',
        href: '/visitor/checker',
        icon: UserCheck,
        description: 'Verify visitor status'
      }
    ]
  }
];

interface VisitorSidebarProps {
  user?: any;
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

export const VisitorSidebar: React.FC<VisitorSidebarProps> = ({ user: passedUser, open, setOpen }) => {
  const pathname = usePathname();
  const { user: authUser, logout } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  const user = passedUser || authUser;

  // Initialize expanded state for first section
  useEffect(() => {
    if (visitorSidebarSections.length > 0) {
      setExpandedSections(prev => ({
        ...prev,
        [visitorSidebarSections[0].title]: true
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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderNavItem = (item: VisitorSidebarItem) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all group',
          isActive 
            ? 'bg-primary text-primary-foreground shadow-sm font-medium' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
          item.isImportant && !isActive && 'text-blue-600 dark:text-blue-400 font-medium'
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
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
    );
  };

  const renderSection = (section: VisitorSidebarSection) => {
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
            {section.items.map(renderNavItem)}
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
          {visitorSidebarSections.map(renderSection)}
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