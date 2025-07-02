import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserInitials, getAvatarColor, getAvatarSize, getAvatarAltText } from '@/lib/utils/avatar';
import { cn } from '@/lib/utils';

interface EnhancedAvatarProps {
  user: any;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
  showOnlineStatus?: boolean;
}

export const EnhancedAvatar: React.FC<EnhancedAvatarProps> = ({
  user,
  size = 'md',
  className,
  showBorder = false,
  showOnlineStatus = false
}) => {
  const avatarSize = getAvatarSize(size);
  const avatarColor = getAvatarColor(user?.role || 'Visitor');
  const initials = getUserInitials(user);

  return (
    <div className={cn('relative inline-block', className)}>
      <Avatar 
        className={cn(
          avatarSize,
          showBorder && 'ring-2 ring-white shadow-lg',
          className
        )}
      >
        <AvatarImage 
          src={user?.avatar} 
          alt={getAvatarAltText(user)} 
        />
        <AvatarFallback className={avatarColor}>
          {initials}
        </AvatarFallback>
      </Avatar>
      
      {/* Online status indicator */}
      {showOnlineStatus && (
        <div className={cn(
          'absolute bottom-0 right-0 rounded-full bg-green-500 border-2 border-white',
          size === 'sm' && 'h-2 w-2',
          size === 'md' && 'h-3 w-3',
          size === 'lg' && 'h-4 w-4',
          size === 'xl' && 'h-5 w-5'
        )} />
      )}
    </div>
  );
}; 