'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { InventoryTable } from "@/components/sessions/inventory-table";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Save, XCircle } from "lucide-react";
import Link from "next/link";
import { translateStatus } from "@/lib/utils";
import type { InventorySession, Product, InventoryLine } from '@/lib/types';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function SessionPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

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
    firestore && barId ? collection(firestore, 'bars', barId, 'products') : null,
    [firestore, barId]
  );
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);

  const [localLines, setLocalLines] = React.useState<InventoryLine[] | null>(null);

  React.useEffect(() => {
    if (lines) {
      setLocalLines(lines);
    }
  }, [lines]);
  
  const handleSaveChanges = async () => {
    if (!localLines || !barId || !firestore) return;

    const batch = writeBatch(firestore);
    localLines.forEach(line => {
      const lineRef = doc(firestore, 'bars', barId, 'inventorySessions', id, 'lines', line.id);
      batch.update(lineRef, {
        startStock: line.startStock,
        purchases: line.purchases,
        sales: line.sales,
        endStock: line.endStock,
      });
    });

    try {
      await batch.commit();
      toast({
        title: "Изменения сохранены",
        description: "Все данные в инвентаризации обновлены.",
      });
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Ошибка сохранения",
        description: "Не удалось сохранить изменения.",
      });
    }
  };

  const handleCompleteSession = async () => {
    if (!sessionRef || !barId || !firestore) return;
    const batch = writeBatch(firestore);

    // Save any pending changes first
    if (localLines) {
        localLines.forEach(line => {
            if (line.id) { // Ensure line.id exists
                const lineRef = doc(firestore, 'bars', barId, 'inventorySessions', id, 'lines', line.id);
                batch.update(lineRef, {
                    startStock: line.startStock,
                    purchases: line.purchases,
                    sales: line.sales,
                    endStock: line.endStock,
                });
            }
        });
    }

    batch.update(sessionRef, { status: 'completed', closedAt: serverTimestamp() });

    try {
      await batch.commit();
      toast({
        title: "Сессия завершена",
        description: "Инвентаризация завершена и отчет готов.",
      });
      router.push(`/dashboard/sessions/${id}/report`);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Ошибка",
            description: "Не удалось завершить сессию.",
        });
    }
  };

  const isLoading = isLoadingSession || isLoadingLines || isLoadingProducts;

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  if (!session) {
    // This can happen briefly while data is loading, or if the session is not found.
    // notFound() should be called only after we are sure it doesn't exist.
     if (!isLoadingSession) {
      notFound();
    }
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  const getStatusVariant = (status: (typeof session.status)) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'draft':
        return 'outline';
      default:
        return 'default';
    }
  };
  
  const isEditable = session.status === 'in_progress';

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">{session.name}</h1>
            <p className="text-muted-foreground">
                {session.createdAt && `Создано ${session.createdAt?.toDate().toLocaleDateString('ru-RU')}`}
            </p>
        </div>
        <div className="flex items-center gap-4">
            <Badge variant={getStatusVariant(session.status)} className="capitalize text-base px-3 py-1">
                {translateStatus(session.status)}
            </Badge>
            {session.status === 'completed' ? (
                <Button asChild>
                    <Link href={`/dashboard/sessions/${session.id}/report`}>
                        <FileText className="mr-2 h-4 w-4" />
                        Смотреть отчет
                    </Link>
                </Button>
            ) : (
                <div className="flex gap-2">
                    <Button onClick={handleSaveChanges} variant="outline" disabled={!isEditable}>
                        <Save className="mr-2 h-4 w-4" />
                        Сохранить
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button disabled={!isEditable}>Завершить сессию</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Завершить сессию инвентаризации?</AlertDialogTitle>
                            <AlertDialogDescription>
                                После завершения сессии вы не сможете вносить изменения. Все текущие данные будут сохранены.
                                Вы будете перенаправлены на страницу отчета.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCompleteSession}>Завершить</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
        </div>
      </div>
       {localLines && products && (
        <InventoryTable 
            lines={localLines} 
            setLines={setLocalLines} 
            products={products}
            isEditable={isEditable} 
        />
      )}
    </div>
  );
}
