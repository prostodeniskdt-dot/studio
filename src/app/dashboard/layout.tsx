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
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from "@/firebase";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Loader2, ShieldX } from "lucide-react";
import { ensureUserAndBarDocuments } from "@/firebase/non-blocking-login";
import type { UserProfile } from "@/lib/types";
import { doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const uid = user ? user.uid : null;
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [isDataReady, setIsDataReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(
    () => (firestore && uid ? doc(firestore, 'users', uid) : null),
    [firestore, uid]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (isUserLoading) {
      return;
    }

    if (!user) {
      router.replace('/');
      return;
    }

    if (user && firestore) {
      let isMounted = true;
      
      ensureUserAndBarDocuments(firestore, user)
        .then(() => {
          if (isMounted) {
            setIsDataReady(true);
          }
        })
        .catch((err: any) => {
          if (isMounted) {
            console.error("Failed to ensure user/bar documents:", err);
            setError(err.message || "Не удалось инициализировать данные пользователя.");
            setIsDataReady(true);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [user, isUserLoading, firestore, router]);


  const handleLogoutAndRedirect = () => {
    if (auth) {
      signOut(auth).then(() => {
        router.replace('/');
      });
    } else {
      router.replace('/');
    }
  };

  const isLoading = isUserLoading || !isDataReady || isLoadingProfile;
  
  if (isLoading) {
     return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Подготовка вашей панели управления...</p>
      </div>
    );
  }
  
  if (userProfile?.isBanned) {
     return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
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
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
        <h2 className="text-xl font-semibold text-destructive">Ошибка инициализации</h2>
        <p className="text-destructive-foreground bg-destructive/10 p-4 rounded-md">{error}</p>
        <p className="text-muted-foreground">Пожалуйста, попробуйте обновить страницу. Если ошибка повторится, свяжитесь с поддержкой.</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <AppSidebar />
        </Sidebar>
        <SidebarInset>
          <ClientOnly>
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
              <SidebarTrigger className="md:hidden" />
              <div className="flex-1" />
              <UserNav />
            </header>
          </ClientOnly>
          <main className="flex-1 flex flex-col p-4 sm:p-6">
              {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
