import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';
import { 
  Home, 
  HelpCircle,
  FileText,
  User,
  Ticket,
  Clock,
  MessageSquare,
  LogOut,
  Plus,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserInitials, getAvatarColor, getAvatarAltText } from '@/lib/utils/avatar';
import { Logo } from '@/components/common/Logo';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const visitorNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/visitor',
    icon: Home,
    description: 'Your overview'
  },
  {
    title: 'Request Help',
    href: '/visitor/help-request/new',
    icon: Plus,
    description: 'Submit new request'
  },
  {
    title: 'My Requests',
    href: '/visitor/help-requests',
    icon: HelpCircle,
    description: 'Track requests'
  },
  {
    title: 'My Tickets',
    href: '/visitor/tickets',
    icon: Ticket,
    description: 'View service tickets'
  },
  {
    title: 'Check In',
    href: '/visitor/check-in',
    icon: CheckCircle,
    description: 'Check in for visit'
  },
  {
    title: 'Queue Status',
    href: '/visitor/queue',
    icon: Clock,
    description: 'Monitor queue position'
  },
  {
    title: 'Documents',
    href: '/visitor/documents',
    icon: FileText,
    description: 'Upload documents'
  },
  {
    title: 'Profile',
    href: '/visitor/profile',
    icon: User,
    description: 'Update information'
  },
  {
    title: 'Feedback',
    href: '/visitor/feedback',
    icon: MessageSquare,
    description: 'Share experience'
  }
];

interface SimpleVisitorSidebarProps {
  user?: any;
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

export const SimpleVisitorSidebar: React.FC<SimpleVisitorSidebarProps> = ({ 
  user: passedUser, 
  open, 
  setOpen 
}) => {
  const pathname = usePathname();
  const { user: authUser, logout } = useAuth();
  
  const user = passedUser || authUser;

  if (!user || user.role !== 'Visitor') return null;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };



  return (
    <div className="flex h-full w-64 flex-col bg-white border-r shadow-sm">
      {/* User Profile Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar} alt={getAvatarAltText(user)} />
            <AvatarFallback className={getAvatarColor(user?.role)}>
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
            <Badge className="text-xs mt-1 bg-purple-100 text-purple-800">
              Visitor
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto py-4">
        <nav className="px-3 space-y-1">
          {visitorNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href !== '/visitor' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all group w-full',
                  isActive 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
                onClick={() => setOpen?.(false)}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">{item.title}</span>
                  {item.description && !isActive && (
                    <div className="text-xs text-gray-500 group-hover:text-gray-600">
                      {item.description}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Quick Action */}
      <div className="p-3 border-t">
        <Link
          href="/visitor/help-request/new"
          className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full justify-center"
          onClick={() => setOpen?.(false)}
        >
          <Plus className="h-4 w-4" />
          Request Help
        </Link>
      </div>

      {/* Footer */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 text-gray-600 hover:text-gray-900 justify-start h-9"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};