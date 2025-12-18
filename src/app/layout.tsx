import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { ClientOnly } from '@/components/client-only';
import { OfflineIndicator } from '@/components/offline-indicator';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'BarBoss Инвентаризация',
  description: 'Калькулятор инвентаризации для баров',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full">
      <body className={`${inter.variable} font-sans antialiased h-full bg-background`}>
        <FirebaseClientProvider>
          {children}
          <ClientOnly>
            <Toaster />
            <OfflineIndicator />
          </ClientOnly>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
