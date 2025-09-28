'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';

interface AdminCommunicationProps {
  unreadCount?: number;
}

export function AdminCommunicationQuickAccess({ unreadCount = 0 }: AdminCommunicationProps) {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push('/admin/messages')}
      variant="outline"
      size="sm"
      className="relative border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 px-4 py-2"
      title="Messages & Communication"
    >
      <div className="relative flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Messages</span>
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px] animate-pulse bg-red-500 hover:bg-red-600 border-2 border-white"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </div>
    </Button>
  );
}

// Floating Action Button for Admin Communication
export function AdminCommunicationFloatingButton({ unreadCount = 0 }: AdminCommunicationProps) {
  const router = useRouter();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={() => router.push('/admin/messages')}
        size="lg"
        className="relative w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 group"
        title="Open Messages"
      >
        <div className="relative">
          <MessageCircle className="h-6 w-6 text-white" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-3 -right-3 h-6 w-6 flex items-center justify-center text-xs p-0 min-w-[24px] animate-bounce bg-red-500 hover:bg-red-600 border-2 border-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </Button>
    </div>
  );
}