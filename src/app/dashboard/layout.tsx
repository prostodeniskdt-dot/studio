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
    // If auth state is done loading and there's no user, redirect to login.
    if (!isUserLoading && !user) {
      router.replace('/');
      return;
    }

    // If we have a user and firestore instance, ensure their documents exist.
    if (user && firestore) {
      // Use an async IIFE (Immediately Invoked Function Expression)
      // to handle the async operation within useEffect.
      (async () => {
        try {
          // CRITICAL FIX: Added `await` here.
          // This ensures we wait for the documents to be created/verified
          // before we try to render any pages that depend on them.
          await ensureUserAndBarDocuments(firestore, user);
          setIsDataReady(true);
        } catch (err: any) {
          console.error("Failed to ensure user/bar documents:", err);
          setError(err.message || "Не удалось инициализировать данные пользователя.");
        }
      })();
    }
  }, [user, isUserLoading, firestore, router]);


  // While loading auth state OR ensuring documents, show a loader.
  if (isUserLoading || !isDataReady) {
     return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        {error ? <p className="text-destructive">{error}</p> : <p>Подготовка вашей панели управления...</p>}
      </div>
    );
  }

  // Once ready, render the full layout with children.
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
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
