'use client';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UserNav } from "@/components/user-nav";
import { AppSidebar } from "@/components/app-sidebar";
import { ClientOnly } from "@/components/client-only";
import { useAuthSession } from "@/contexts/auth-context";
import { ProductsProvider } from "@/contexts/products-context";
import { SessionsProvider } from "@/contexts/sessions-context";
import { SuppliersProvider } from "@/contexts/suppliers-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Loader2, ShieldX } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { Footer } from "@/components/footer";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: isUserLoading, logout } = useAuthSession();
  const router = useRouter();
  const [isDataReady, setIsDataReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  async function loadProfile() {
    const res = await fetch('/api/me', {
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed to load profile');
    setUserProfile(json.profile ?? null);
  }

  useEffect(() => {
    if (isUserLoading) {
      return;
    }

    if (!user) {
      router.replace('/');
      return;
    }

    let isMounted = true;
    setIsLoadingProfile(true);
    loadProfile()
      .then(() => {
        if (isMounted) setIsDataReady(true);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        logger.error("Failed to bootstrap/load profile:", err);
        const errorMessage = err instanceof Error ? err.message : "Не удалось инициализировать данные пользователя.";
        setError(errorMessage);
        setIsDataReady(true);
      })
      .finally(() => {
        if (isMounted) setIsLoadingProfile(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, isUserLoading, router]);


  const handleLogoutAndRedirect = () => {
    logout().finally(() => router.replace('/'));
  };

  const isLoading = isUserLoading || !isDataReady || isLoadingProfile;
  
  if (isLoading) {
     return (
      <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Подготовка вашей панели управления...</p>
      </div>
    );
  }
  
  if (userProfile?.isBanned) {
     return (
        <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
            <ShieldX className="h-16 w-16 text-destructive" />
            <h2 className="text-2xl font-semibold text-destructive">Ваш аккаунт заблокирован</h2>
            <p className="max-w-md text-muted-foreground">Доступ к приложению ограничен администратором. Если вы считаете, что это ошибка, обратитесь в поддержку.</p>
             <Button onClick={handleLogoutAndRedirect} variant="outline">
                Вернуться на главную
            </Button>
        </div>
     );
  }

  if (error) {
     return (
      <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
        <h2 className="text-xl font-semibold text-destructive">Ошибка инициализации</h2>
        <p className="text-destructive-foreground bg-destructive/10 p-4 rounded-md">{error}</p>
        <p className="text-muted-foreground">Пожалуйста, попробуйте обновить страницу. Если ошибка повторится, свяжитесь с поддержкой.</p>
      </div>
    );
  }

  const barId = user ? `bar_${user.id}` : null;

  return (
    <ErrorBoundary>
      <ProductsProvider>
        <SessionsProvider barId={barId}>
          <SuppliersProvider barId={barId}>
            <SidebarProvider>
              <div className="flex min-h-svh w-full min-w-0">
                <Sidebar>
                  <AppSidebar />
                </Sidebar>
                <SidebarInset className="flex flex-col">
                  <ClientOnly>
                    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
                      <SidebarTrigger className="md:hidden" />
                      <div className="flex-1" />
                      <UserNav />
                    </header>
                  </ClientOnly>
                  <main className="flex-1 flex flex-col p-4 sm:p-6">
                    <ErrorBoundary>
                      {children}
                    </ErrorBoundary>
                  </main>
                  <Footer />
                </SidebarInset>
              </div>
            </SidebarProvider>
          </SuppliersProvider>
        </SessionsProvider>
      </ProductsProvider>
    </ErrorBoundary>
  );
}
