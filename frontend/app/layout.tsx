import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { AccessibilityProvider } from '@/components/common/AccessibilityEnhancements';
import { NotificationProvider } from '@/components/notifications/EnhancedNotificationSystem';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lewisham Charity',
  description: 'Connecting the community with essential resources and support',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/logo-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#10b981',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AccessibilityProvider>
            <NotificationProvider>
              <AuthProvider>
                {children}
                <Toaster />
              </AuthProvider>
            </NotificationProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
