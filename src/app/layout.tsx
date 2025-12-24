import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { ClientOnly } from '@/components/client-only';
import { OfflineIndicator } from '@/components/offline-indicator';
import { Footer } from '@/components/footer';
import { CookieBanner } from '@/components/cookie-banner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'BarBoss Инвентаризация',
  description: 'Калькулятор инвентаризации для баров',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BarBoss',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
};

export function generateViewport() {
  return {
    themeColor: '#000000',
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full">
      <body className={`${inter.variable} font-sans antialiased h-full bg-background flex flex-col`}>
        <FirebaseClientProvider>
          <div className="flex-1">
            {children}
          </div>
          <Footer />
          <ClientOnly>
            <Toaster />
            <OfflineIndicator />
            <CookieBanner />
          </ClientOnly>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
