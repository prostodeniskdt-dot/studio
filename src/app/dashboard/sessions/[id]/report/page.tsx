'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from "next/navigation";
import { ReportView } from "@/components/reports/report-view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart3, Loader2 } from "lucide-react";
import type { InventorySession, Product, InventoryLine } from '@/lib/types';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';


export default function SessionReportPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useUser();
  const firestore = useFirestore();

  const barId = user ? `bar_${user.uid}` : null;
  
  const sessionRef = useMemoFirebase(() => 
    firestore && barId ? doc(firestore, 'bars', barId, 'inventorySessions', id) : null,
    [firestore, barId, id]
  );
  const { data: session, isLoading: isLoadingSession } = useDoc<InventorySession>(sessionRef);

  const linesRef = useMemoFirebase(() =>
    firestore && barId ? collection(firestore, 'bars', barId, 'inventorySessions', id, 'lines') : null,
    [firestore, barId, id]
  );
  const { data: lines, isLoading: isLoadingLines } = useCollection<InventoryLine>(linesRef);

  const productsRef = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'products')) : null,
    [firestore]
  );
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);


  const isLoading = isLoadingSession || isLoadingLines || isLoadingProducts;

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-full pt-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  if (!session) {
     if (!isLoadingSession) {
      notFound();
    }
    return (
        <div className="flex items-center justify-center h-full pt-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  if (!lines || !products) {
     return (
        <div className="flex items-center justify-center h-full pt-20">
           <p>Загрузка данных для отчета...</p>
        </div>
    );
  }

  if (session.status !== 'completed') {
    return (
        <div className="container mx-auto flex items-center justify-center h-full pt-20">
            <Alert className="max-w-md">
                <BarChart3 className="h-4 w-4" />
                <AlertTitle>Отчет недоступен</AlertTitle>
                <AlertDescription>
                    Эта сессия инвентаризации еще не завершена. Пожалуйста, завершите сессию для просмотра отчета.
                    <Button asChild variant="link" className="p-0 h-auto ml-1">
                        <Link href={`/dashboard/sessions/${session.id}`}>Вернуться к сессии</Link>
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    )
  }


  return (
    <div className="container mx-auto">
      <ReportView session={{...session, lines: lines}} products={products} />
    </div>
  );
}
