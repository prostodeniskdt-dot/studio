'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { InventoryTable } from "@/components/sessions/inventory-table";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Save, XCircle, Download, Upload } from "lucide-react";
import Link from "next/link";
import { translateStatus } from "@/lib/utils";
import type { InventorySession, Product, InventoryLine } from '@/lib/types';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/alert-dialog";
import { calculateLineFields } from '@/lib/calculations';

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
  const [isSaving, setIsSaving] = React.useState(false);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);


  React.useEffect(() => {
    if (lines) {
      setLocalLines(lines);
    }
  }, [lines]);
  
  const handleSaveChanges = async () => {
    if (!localLines || !barId || !firestore || !products) return;

    setIsSaving(true);
    const batch = writeBatch(firestore);
    localLines.forEach(line => {
      const product = products.find(p => p.id === line.productId);
      if (product) {
          const lineRef = doc(firestore, 'bars', barId, 'inventorySessions', id, 'lines', line.id);
          const calculatedFields = calculateLineFields(line, product);
          batch.update(lineRef, {
            startStock: line.startStock,
            purchases: line.purchases,
            sales: line.sales,
            endStock: line.endStock,
            ...calculatedFields
          });
      }
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
    } finally {
        setIsSaving(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!sessionRef || !barId || !firestore || !localLines || !products) return;
    setIsCompleting(true);
    
    // First, save any pending changes
    await handleSaveChanges();

    // Then, update the session status
    const batch = writeBatch(firestore);
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
    } finally {
        setIsCompleting(false);
    }
  };
  
  const handleExportCSV = () => {
    if (!localLines || !products) return;

    const headers = ["productId", "productName", "startStock", "purchases", "sales", "endStock"];
    
    const rows = localLines.map(line => {
      const product = products.find(p => p.id === line.productId);
      return [
        line.productId,
        product?.name.replace(/,/g, '') || '', // Remove commas from name
        line.startStock,
        line.purchases,
        line.sales,
        line.endStock
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `session_${id}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Экспорт завершен", description: "Данные сессии выгружены в CSV файл." });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const rows = text.split('\n').slice(1); // Skip header row
        const updatedLines = [...(localLines || [])];
        let changesMade = false;

        const csvData = new Map<string, any>();
        rows.forEach(rowStr => {
            if (!rowStr) return;
            const rowData = rowStr.split(',');
            const productId = rowData[0];
            csvData.set(productId, {
                startStock: parseFloat(rowData[2]),
                purchases: parseFloat(rowData[3]),
                sales: parseFloat(rowData[4]),
                endStock: parseFloat(rowData[5]),
            });
        });

        updatedLines.forEach((line, index) => {
            if (csvData.has(line.productId)) {
                const data = csvData.get(line.productId);
                updatedLines[index] = {
                    ...line,
                    startStock: isNaN(data.startStock) ? line.startStock : data.startStock,
                    purchases: isNaN(data.purchases) ? line.purchases : data.purchases,
                    sales: isNaN(data.sales) ? line.sales : data.sales,
                    endStock: isNaN(data.endStock) ? line.endStock : data.endStock,
                };
                changesMade = true;
            }
        });

        if (changesMade) {
          setLocalLines(updatedLines);
          toast({ title: "Импорт завершен", description: "Данные из файла загружены в таблицу. Не забудьте сохранить изменения." });
        } else {
           toast({ variant: "destructive", title: "Импорт не удался", description: "Не найдено совпадающих productId в файле." });
        }

      } catch (error) {
        toast({ variant: "destructive", title: "Ошибка парсинга файла", description: "Убедитесь, что файл имеет правильный формат CSV." });
      } finally {
        // Reset file input
        if(event.target) event.target.value = '';
      }
    };
    reader.readAsText(file);
  };


  const isLoading = isLoadingSession || isLoadingLines || isLoadingProducts;

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-full pt-20">
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
        <div className="flex items-center justify-center h-full pt-20">
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
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        className="hidden"
        accept=".csv"
      />
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          Импорт/Экспорт
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={handleImportClick}>
                            <Upload className="mr-2 h-4 w-4" />
                            <span>Импорт из CSV</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleExportCSV}>
                            <Download className="mr-2 h-4 w-4" />
                            <span>Экспорт в CSV</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button onClick={handleSaveChanges} variant="outline" disabled={!isEditable || isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isSaving ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button disabled={!isEditable || isCompleting}>
                                {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Завершить сессию
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Завершить сессию инвентаризации?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Все текущие данные будут сохранены. После завершения сессии вы не сможете вносить изменения.
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
