/**
 * Avatar utility functions for consistent avatar styling across components
 */

// Get user's name initials for avatar
export const getUserInitials = (user: any): string => {
  // Handle both camelCase and snake_case naming conventions
  const firstName = user?.firstName || user?.first_name;
  const lastName = user?.lastName || user?.last_name;
  
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  
  if (user?.name) {
    const names = user.name.split(' ').filter((name: string) => name.length > 0);
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    } else if (names.length === 1) {
      return names[0][0].toUpperCase();
    }
  }
  
  // Fallback to first letter of email, but avoid showing mock emails
  if (user?.email && !user.email.includes('example.com')) {
    return user.email[0].toUpperCase();
  }
  
  // Final fallback based on role
  const roleInitials = {
    'Admin': 'A',
    'Volunteer': 'V', 
    'Donor': 'D',
    'Visitor': 'V'
  };
  
  return roleInitials[user?.role as keyof typeof roleInitials] || 'U';
};

// Get avatar background color - using consistent green theme
export const getAvatarColor = (role: string): string => {
  // Use the same green color as the logo for all avatars
  return 'bg-gradient-to-br from-green-500 to-green-600 text-white font-semibold shadow-md';
};

// Get role badge color
export const getRoleBadgeColor = (role: string): string => {
  switch (role) {
    case 'Admin': 
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200';
    case 'Volunteer': 
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200';
    case 'Donor': 
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200';
    case 'Visitor': 
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 border-purple-200';
    default: 
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300 border-gray-200';
  }
};

// Get avatar size classes
export const getAvatarSize = (size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string => {
  switch (size) {
    case 'sm': return 'h-8 w-8 text-sm';
    case 'md': return 'h-10 w-10 text-base';
    case 'lg': return 'h-12 w-12 text-lg';
    case 'xl': return 'h-16 w-16 text-xl';
    default: return 'h-10 w-10 text-base';
  }
};

// Generate proper alt text for avatar
export const getAvatarAltText = (user: any): string => {
  // Handle both camelCase and snake_case naming conventions
  const firstName = user?.firstName || user?.first_name;
  const lastName = user?.lastName || user?.last_name;
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  
  if (user?.name) {
    return user.name;
  }
  
  // Avoid showing mock email addresses in alt text
  if (user?.email && !user.email.includes('example.com')) {
    return user.email;
  }
  
  if (user?.role) {
    return `${user.role} user`;
  }
  
  return 'User avatar';
};

// Generate a consistent avatar component props
export const getAvatarProps = (user: any, size: 'sm' | 'md' | 'lg' | 'xl' = 'md') => {
  return {
    className: getAvatarSize(size),
    fallbackClassName: getAvatarColor(user?.role || 'Visitor'),
    initials: getUserInitials(user),
    src: user?.avatar,
    alt: getAvatarAltText(user)
  };
}; 