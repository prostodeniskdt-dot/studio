import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { ClientOnly } from '@/components/client-only';
import { CookieBanner } from '@/components/cookie-banner';
import { AuthProvider } from '@/contexts/auth-context';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'BAR BOSS ONLINE Инвентаризация',
  description: 'Калькулятор инвентаризации для баров',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BAR BOSS ONLINE',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full">
      <body className={`${inter.variable} font-sans antialiased h-full bg-background flex flex-col`}>
        <AuthProvider>
          <div className="flex-1">
            {children}
          </div>
          <ClientOnly>
            <Toaster />
            <CookieBanner />
          </ClientOnly>
        </AuthProvider>
      </body>
    </html>
  );
}
