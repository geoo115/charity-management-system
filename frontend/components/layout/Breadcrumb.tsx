import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  const pathname = usePathname();

  // Auto-generate breadcrumbs from pathname if items not provided
  const breadcrumbItems = items || generateBreadcrumbsFromPath(pathname);

  if (breadcrumbItems.length <= 1) return null;

  return (
    <nav className={cn('flex items-center space-x-1 text-sm text-muted-foreground', className)}>
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        const Icon = item.icon;

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            )}
            
            {isLast ? (
              <span className="font-medium text-foreground flex items-center gap-1">
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </span>
            ) : item.href ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            ) : (
              <span className="flex items-center gap-1">
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

// Generate breadcrumbs from pathname
function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Add home
  breadcrumbs.push({
    label: 'Home',
    href: '/',
    icon: Home
  });

  // Build breadcrumbs from segments
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Skip the dashboard segment as it's redundant
    if (segment === 'dashboard') return;
    
    const label = formatSegmentLabel(segment);
    const isLast = index === segments.length - 1;
    
    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath
    });
  });

  return breadcrumbs;
}

// Format segment labels for better display
function formatSegmentLabel(segment: string): string {
  // Handle special cases
  const specialCases: Record<string, string> = {
    'help-request': 'Help Request',
    'help-requests': 'Help Requests',
    'check-in': 'Check In',
    'api-test': 'API Test',
    'application-status': 'Application Status',
    'visitor-journey': 'Visitor Journey'
  };

  if (specialCases[segment]) {
    return specialCases[segment];
  }

  // Convert kebab-case and snake_case to title case
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// Hook for custom breadcrumbs
export const useBreadcrumb = () => {
  const pathname = usePathname();
  
  const setBreadcrumbs = (items: BreadcrumbItem[]) => {
    // This could be enhanced to use context or state management
    // For now, it's just a placeholder for future enhancement
    return items;
  };

  const generateFromPath = () => generateBreadcrumbsFromPath(pathname);

  return {
    setBreadcrumbs,
    generateFromPath
  };
};
