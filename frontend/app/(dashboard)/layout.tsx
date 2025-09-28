'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Header } from '@/components/layout/Header';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { VisitorSidebar } from '@/components/layout/VisitorSidebar';
import { VolunteerSidebar } from '@/components/layout/VolunteerSidebar';
import { DonorSidebar } from '@/components/layout/DonorSidebar';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ToastNotificationSystem } from '@/components/notifications';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { MessagingProvider } from '@/contexts/MessagingContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Check if user is accessing the correct role-based dashboard
  useEffect(() => {
    if (user) {
      const role = user.role.toLowerCase();
      const currentPath = pathname.split('/')[1]; // Get first segment after /
      
      if (role !== currentPath && !pathname.includes('/admin')) {
        router.push(`/${role}`);
      }
    }
  }, [user, pathname, router]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return null; // Will redirect in the useEffect
  }

  // Function to render the appropriate sidebar based on user role
  const renderSidebar = () => {
    if (!user) return null;

    switch (user.role) {
      case 'Admin':
        return <AdminSidebar user={user} open={sidebarOpen} setOpen={setSidebarOpen} />;
      case 'Visitor':
        return <VisitorSidebar user={user} open={sidebarOpen} setOpen={setSidebarOpen} />;
      case 'Volunteer':
        return <VolunteerSidebar user={user} open={sidebarOpen} setOpen={setSidebarOpen} />;
      case 'Donor':
        return <DonorSidebar user={user} open={sidebarOpen} setOpen={setSidebarOpen} />;
      default:
        return <AdminSidebar user={user} open={sidebarOpen} setOpen={setSidebarOpen} />;
    }
  };

  return (
    <NotificationProvider>
      <MessagingProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          {/* Desktop Sidebar */}
          <div className="hidden md:block">
            {renderSidebar()}
          </div>
        
        {/* Main Content Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header with Mobile Sidebar */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
              <MobileSidebar user={user!} />
              <div className="flex-1">
                <Breadcrumb />
              </div>
              <Header />
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-muted/10">
            <div className="container mx-auto p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
        
        {/* Toast Notification System */}
        <ToastNotificationSystem />
        </div>
      </MessagingProvider>
    </NotificationProvider>
  );
}
