'use client';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
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
import { doc, getDoc, writeBatch, serverTimestamp } from "firebase/firestore";

// Helper function to ensure user and bar documents exist
async function ensureUserAndBarDocuments(firestore: any, user: any): Promise<void> {
    if (!firestore || !user) return;

    const userRef = doc(firestore, 'users', user.uid);
    const barId = `bar_${user.uid}`;
    const barRef = doc(firestore, 'bars', barId);

    const batch = writeBatch(firestore);

    try {
        const userDoc = await getDoc(userRef);
        const barDoc = await getDoc(barRef);
        
        let shouldCommit = false;

        if (!userDoc.exists()) {
            const displayName = user.displayName || user.email?.split('@')[0] || `User_${user.uid.substring(0,5)}`;
            const newUser = {
                id: user.uid,
                displayName: displayName,
                email: user.email,
                role: 'manager',
                createdAt: serverTimestamp(),
            };
            batch.set(userRef, newUser);
            shouldCommit = true;
        }

        if (!barDoc.exists()) {
            const displayName = user.displayName || user.email?.split('@')[0] || `User_${user.uid.substring(0,5)}`;
            const newBar = {
                id: barId,
                name: `Бар ${displayName}`,
                location: 'Не указано',
                ownerUserId: user.uid,
            };
            batch.set(barRef, newBar);
            shouldCommit = true;
        }
        
        if (shouldCommit) {
            await batch.commit();
        }
    } catch (error) {
        console.error("Error ensuring user and bar documents:", error);
        // This error should be surfaced to the user
        throw new Error("Не удалось инициализировать данные пользователя.");
    }
}


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
      ensureUserAndBarDocuments(firestore, user)
        .then(() => {
          setIsDataReady(true);
        })
        .catch((err) => {
          console.error(err);
          setError(err.message);
        });
    }
  }, [user, isUserLoading, firestore, router]);


  // While loading auth state OR ensuring documents, show a loader.
  if (!isDataReady) {
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
        <SidebarInset className="min-h-svh flex flex-col">
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
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
