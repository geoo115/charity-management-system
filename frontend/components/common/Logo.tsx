import React from 'react';
import Link from 'next/link';
import { HeartHandshake } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  href?: string;
  textClassName?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  size = 'md', 
  showText = true, 
  href = '/',
  textClassName 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-10 w-10'
  };

  const textSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl'
  };

  const LogoContent = () => (
    <div className={cn('flex items-center gap-2 transition-opacity hover:opacity-80', className)}>
      <div className="flex items-center justify-center bg-green-500 text-white rounded-lg p-2">
        <HeartHandshake className={cn(sizeClasses[size])} />
      </div>
      {showText && (
        <span className={cn(
          'font-bold text-foreground',
          textSizeClasses[size],
          textClassName
        )}>
          Lewisham Charity
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href}>
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
}; 