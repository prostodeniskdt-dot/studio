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
import { useUser, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ensureUserAndBarDocuments } from "@/firebase/non-blocking-login";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isDataReady, setIsDataReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isUserLoading) {
      // Пока проверяется статус аутентификации, ничего не делаем.
      return;
    }

    if (!user) {
      // Если загрузка завершена и пользователя нет, перенаправляем на главную.
      router.replace('/');
      return;
    }

    // Если есть пользователь и firestore, убеждаемся в наличии документов.
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
            // Мы все равно устанавливаем data ready, чтобы показать сообщение об ошибке
            setIsDataReady(true);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [user, isUserLoading, firestore, router]);


  // Пока загружается статус пользователя ИЛИ мы ждем создания документов, показываем загрузчик.
  if (isUserLoading || !isDataReady) {
     return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Подготовка вашей панели управления...</p>
      </div>
    );
  }
  
  // Если при инициализации произошла ошибка, показываем ее.
  if (error) {
     return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
        <h2 className="text-xl font-semibold text-destructive">Ошибка инициализации</h2>
        <p className="text-destructive-foreground bg-destructive/10 p-4 rounded-md">{error}</p>
        <p className="text-muted-foreground">Пожалуйста, попробуйте обновить страницу. Если ошибка повторится, свяжитесь с поддержкой.</p>
      </div>
    );
  }


  // Как только все готово, рендерим полный layout с дочерними элементами.
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <AppSidebar />
        </Sidebar>
        <div className="flex-1 flex flex-col">
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
        </div>
      </div>
    </SidebarProvider>
  );
}
