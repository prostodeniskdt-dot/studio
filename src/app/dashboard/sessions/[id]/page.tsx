'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { InventoryTable } from "@/components/sessions/inventory-table";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Save, MoreVertical, Trash2, Download, Upload, PlusCircle } from "lucide-react";
import Link from "next/link";
import { translateStatus, buildProductDisplayName } from "@/lib/utils";
import type { InventorySession, Product, InventoryLine } from '@/lib/types';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, collection, query, setDoc, writeBatch, serverTimestamp, updateDoc, getDocs, getDoc } from 'firebase/firestore';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Combobox } from '@/components/ui/combobox';
import { translateCategory } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { calculateLineFields } from '@/lib/calculations';
import { deleteSessionWithLinesClient } from '@/lib/firestore-utils';

export default function SessionPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const barId = user ? `bar_${user.uid}` : null;
  
  const [isDeletingSession, setIsDeletingSession] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [localLines, setLocalLines] = React.useState<InventoryLine[] | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = React.useState(false);

  const [isSaving, setIsSaving] = React.useState(false);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [isAddingProduct, setIsAddingProduct] = React.useState(false);
  
  const didNotFoundRef = React.useRef(false);
  
  const sessionRef = useMemoFirebase(() => 
    firestore && barId ? doc(firestore, 'bars', barId, 'inventorySessions', id) : null,
    [firestore, barId, id]
  );
  const { data: session, isLoading: isLoadingSession, error: sessionError } = useDoc<InventorySession>(sessionRef);

  const linesRef = useMemoFirebase(() =>
    firestore && barId ? collection(firestore, 'bars', barId, 'inventorySessions', id, 'lines') : null,
    [firestore, barId, id]
  );
  const { data: lines, isLoading: isLoadingLines } = useCollection<InventoryLine>(linesRef);

  const [allProducts, setAllProducts] = React.useState<Product[] | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);

  const isReady = !!(firestore && user && barId && id && sessionRef);

  // --- START DIAGNOSTICS ---
  React.useEffect(() => {
    console.debug('[session page debug]', { 
      id, 
      isReady,
      userId: user?.uid,
      barId,
      sessionRefPath: sessionRef?.path,
      isLoadingSession, 
      sessionIsNull: session === null, 
      hasError: !!sessionError, 
      hasSessionRef: !!sessionRef 
    });

    if (sessionRef) {
      getDoc(sessionRef).then(snap => {
        console.debug('[getDoc direct check]', {
          path: sessionRef.path,
          exists: snap.exists(),
        });
      });
    }
  }, [id, isReady, user, barId, sessionRef, isLoadingSession, session, sessionError]);

  React.useEffect(() => {
    if (!isReady || isLoadingSession || sessionError) return;

    if (session === null) {
      if (didNotFoundRef.current) return;
      didNotFoundRef.current = true;

      toast({
        variant: "destructive",
        title: "Инвентаризация не найдена (DEBUG)",
        description: "Автоматический редирект отключен для диагностики.",
      });
      // router.replace("/dashboard/sessions"); // <--- REDIRECT DISABLED
    }
  }, [isReady, isLoadingSession, session, sessionError, router, toast]);
  // --- END DIAGNOSTICS ---


  React.useEffect(() => {
    if (!firestore) return;
    let cancelled = false;
    setIsLoadingProducts(true);
    const fetchProducts = async () => {
        try {
            const productsQuery = query(collection(firestore, "products"));
            const snapshot = await getDocs(productsQuery);
            if (!cancelled) {
                setAllProducts(snapshot.docs.map(d => d.data() as Product));
            }
        } catch (error) {
            console.error("Failed to fetch products:", error);
            toast({
                variant: 'destructive',
                title: 'Не удалось загрузить продукты'
            });
        } finally {
            if (!cancelled) {
                setIsLoadingProducts(false);
            }
        }
    };
    fetchProducts();
    return () => { cancelled = true; };
  }, [firestore, toast]);

  React.useEffect(() => {
    if (lines) {
      setLocalLines(lines);
    } else {
      setLocalLines([]);
    }
  }, [lines]);

  const originalLines = React.useMemo(() => lines, [lines]);

  const hasUnsavedChanges = React.useMemo(() => {
    if (!originalLines || !localLines) return false;
    if (originalLines.length !== localLines.length) return true;
    return JSON.stringify(originalLines) !== JSON.stringify(localLines);
  }, [originalLines, localLines]);
  
  const productsInSession = React.useMemo(() => {
    if (!localLines) return new Set();
    return new Set(localLines.map(line => line.productId));
  }, [localLines]);
  
  const groupedProductOptions = React.useMemo(() => {
    if (!allProducts) return [];
    const availableProducts = allProducts.filter(p => p.isActive && !productsInSession.has(p.id));
    const groups: Record<string, { value: string; label: string }[]> = {};
    availableProducts.forEach(p => {
      const category = translateCategory(p.category);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ value: p.id, label: buildProductDisplayName(p.name, p.bottleVolumeMl) });
    });
    return Object.entries(groups)
      .map(([label, options]) => ({ label, options }))
      .sort((a,b) => a.label.localeCompare(b.label));
  }, [allProducts, productsInSession]);
  
  
  // Event Handlers
  const handleDeleteSession = async () => {
    if (!firestore || !barId) return;

    setIsDeletingSession(true);
    setIsDeleteDialogOpen(false); 
    
    router.replace("/dashboard/sessions");

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try {
        await deleteSessionWithLinesClient(firestore, barId, id);
        toast({ title: "Инвентаризация удалена." });
    } catch(e: any) {
        toast({ 
            variant: "destructive", 
            title: "Не удалось удалить инвентаризацию", 
            description: e?.message ?? "Произошла неизвестная ошибка."
        });
    }
  };
  
  const handleAddProductToSession = async (productId: string) => {
    if (!productId || !barId || !firestore) return;
    setIsAddingProduct(true);
    try {
        const product = allProducts?.find(p => p.id === productId);
        if (!product) throw new Error("Продукт не найден");

        const newLineRef = doc(collection(firestore, 'bars', barId, 'inventorySessions', id, 'lines'));
        const newLineData = {
            id: newLineRef.id,
            productId: productId,
            inventorySessionId: id,
            startStock: 0,
            purchases: 0,
            sales: 0,
            endStock: 0,
            ...calculateLineFields({}, product),
        };
        await setDoc(newLineRef, newLineData);
        toast({ title: "Продукт добавлен", description: `"${product ? buildProductDisplayName(product.name, product.bottleVolumeMl) : ''}" добавлен в инвентаризацию.` });
        setIsAddProductOpen(false);
    } catch (serverError) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `bars/${barId}/inventorySessions/${id}/lines`, operation: 'create' }));
    } finally {
        setIsAddingProduct(false);
    }
  };
  
  const handleSaveChanges = async () => {
    if (!localLines || !barId || !firestore) return;
    setIsSaving(true);
    try {
        const batch = writeBatch(firestore);
        localLines.forEach(line => {
            const product = allProducts?.find(p => p.id === line.productId);
            if (!product) return;
            
            const calculatedFields = calculateLineFields(line, product);
            const lineRef = doc(firestore, 'bars', barId, 'inventorySessions', id, 'lines', line.id);
            const { startStock, purchases, sales, endStock } = line;
            batch.update(lineRef, {
                startStock,
                purchases,
                sales,
                endStock,
                ...calculatedFields
            });
        });
        await batch.commit();
        toast({ title: "Изменения сохранены" });
    } catch (serverError) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `bars/${barId}/inventorySessions/${id}/lines`, operation: 'update' }));
    } finally {
        setIsSaving(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!sessionRef || !barId || !firestore) return;
    setIsCompleting(true);
    try {
      if (hasUnsavedChanges) {
          await handleSaveChanges();
      }
      await updateDoc(sessionRef, {
        status: 'completed',
        closedAt: serverTimestamp(),
      });
      toast({
          title: "Инвентаризация завершена",
          description: "Инвентаризация завершена и отчет готов.",
      });
      router.push(`/dashboard/sessions/${id}/report`);
    } catch(serverError) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: sessionRef.path, operation: 'update' }));
    } finally {
      setIsCompleting(false);
    }
  };
  
  const handleExportCSV = () => {
    if (!localLines || !allProducts) return;

    const headers = ["productId", "productName", "startStock", "purchases", "sales", "endStock"];
    
    const rows = localLines.map(line => {
      const product = allProducts.find(p => p.id === line.productId);
      return [
        line.productId,
        product ? buildProductDisplayName(product.name, product.bottleVolumeMl).replace(/,/g, '') : '',
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
    toast({ title: "Экспорт завершен", description: "Данные инвентаризации выгружены в CSV файл." });
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
        const rows = text.split('\n').slice(1);
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
        if(event.target) event.target.value = '';
      }
    };
    reader.readAsText(file);
  };
  
  if (isDeletingSession) {
      return (
          <div className="flex items-center justify-center h-full pt-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
  }

  // Handle loading and error states first
  if (!isReady || isLoadingSession) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessionError) {
    return <div className="text-center text-destructive p-4">Ошибка загрузки сессии: {sessionError.message}</div>;
  }
  
  if (!session) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <div className="text-center p-4 bg-destructive/10 rounded-md">
            <h3 className="font-bold text-destructive">Инвентаризация не найдена (DEBUG)</h3>
            <p className="text-sm text-destructive-foreground">Редирект отключен. Проверьте консоль.</p>
        </div>
      </div>
    );
  }
  
  const isLoading = isLoadingLines || isLoadingProducts;

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
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        className="hidden"
        accept=".csv"
      />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{session.name}</h1>
              <p className="text-muted-foreground">
                  {session.createdAt && `Создано ${session.createdAt?.toDate().toLocaleDateString('ru-RU')}`}
              </p>
            </div>
            <Badge variant={getStatusVariant(session.status)} className="capitalize text-base px-3 py-1">
                {translateStatus(session.status)}
            </Badge>
        </div>
        <div className="flex items-center gap-2">
            {session.status === 'completed' ? (
                <Button asChild>
                    <Link href={`/dashboard/sessions/${session.id}/report`}>
                        <FileText className="mr-2 h-4 w-4" />
                        Смотреть отчет
                    </Link>
                </Button>
            ) : (
                <>
                    <Button variant="outline" onClick={() => setIsAddProductOpen(true)} disabled={!isEditable}>
                      <PlusCircle className="mr-2 h-4 w-4"/>
                      Добавить продукт
                    </Button>
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

                    <Button onClick={handleSaveChanges} variant="outline" disabled={!isEditable || isSaving || !hasUnsavedChanges}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isSaving ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button disabled={!isEditable || isCompleting}>
                                {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Завершить
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Завершить инвентаризацию?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Все несохраненные изменения будут автоматически сохранены. После завершения вы не сможете вносить правки и будете перенаправлены на страницу отчета.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCompleteSession}>Завершить</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Другие действия</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                     <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Удалить инвентаризацию
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <div className="overflow-x-auto">
       {isLoading ? <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (localLines && allProducts && (
        <InventoryTable 
            lines={localLines} 
            setLines={setLocalLines} 
            products={allProducts}
            isEditable={isEditable} 
        />
      ))}
      </div>
       <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Добавить продукт в инвентаризацию</DialogTitle>
            <DialogDescription>
                Выберите продукт из общего каталога, чтобы добавить его в текущую инвентаризацию.
            </DialogDescription>
            </DialogHeader>
            <Combobox 
                options={groupedProductOptions}
                onSelect={(value) => {
                    handleAddProductToSession(value);
                }}
                placeholder="Выберите продукт..."
                searchPlaceholder="Поиск продукта..."
                notFoundText="Продукт не найден или уже добавлен."
            />
            <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>Отмена</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь безвозвратно удалить инвентаризацию "{session?.name}" и все связанные с ней данные. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession} className="bg-destructive hover:bg-destructive/90">
                {isDeletingSession ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
