'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { InventoryTable } from "@/components/sessions/inventory-table";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Save, MoreVertical, Trash2, Download, Upload, PlusCircle } from "lucide-react";
import Link from "next/link";
import { translateStatus, buildProductDisplayName } from "@/lib/utils";
import type { InventorySession, Product, InventoryLine, CalculatedInventoryLine } from '@/lib/types';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, collection, query, setDoc, writeBatch, serverTimestamp, updateDoc, getDoc, where, getDocs } from 'firebase/firestore';
import { useProducts } from '@/contexts/products-context';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { SessionHeader } from '@/components/sessions/session-header';
import { SessionActions } from '@/components/sessions/session-actions';
import { useOffline } from '@/hooks/use-offline';
import { HelpIcon } from '@/components/ui/help-icon';
import { Progress } from '@/components/ui/progress';
import { WifiOff, AlertTriangle } from 'lucide-react';

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
  const [deleteProgress, setDeleteProgress] = React.useState(0);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [localLines, setLocalLines] = React.useState<InventoryLine[] | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = React.useState(false);

  const [isSaving, setIsSaving] = React.useState(false);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [isAddingProduct, setIsAddingProduct] = React.useState(false);
  
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

  const hasNavigatedRef = React.useRef(false);
  const [cachedSession, setCachedSession] = React.useState<InventorySession | null>(null);
  
  // Использовать кэшированную сессию если реальная еще не загружена
  const effectiveSession = session || cachedSession;

  // Использовать контекст продуктов вместо прямой загрузки
  const { products: allProducts, isLoading: isLoadingProducts } = useProducts();

  // Проверить sessionStorage для новых сессий (исправление race condition)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const cachedData = sessionStorage.getItem(`session_${id}`);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.isNew) {
          // Использовать кэшированные данные временно
          setCachedSession({
            ...parsed,
            createdAt: parsed.createdAt ? { 
              toDate: () => new Date(parsed.createdAt), 
              toMillis: () => new Date(parsed.createdAt).getTime() 
            } as { toDate: () => Date; toMillis: () => number } : undefined,
          } as InventorySession);
        }
      } catch (e) {
        // Игнорировать ошибки парсинга
      }
    }
  }, [id]);

  // Очистить sessionStorage после успешной загрузки
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (session && cachedSession) {
      sessionStorage.removeItem(`session_${id}`);
      setCachedSession(null);
    }
  }, [session, id, cachedSession]);

  React.useEffect(() => {
    // Использовать кэшированную сессию если есть, иначе проверять загрузку
    const currentSession = session || cachedSession;
    
    // Увеличить таймаут для проверки несуществующей сессии
    if (!isLoadingSession && !currentSession && !sessionError && !hasNavigatedRef.current) {
      // Подождать дополнительно для новых сессий
      const isNewSession = cachedSession !== null;
      const timeout = isNewSession ? 2000 : 500; // 2 секунды для новых, 500ms для старых
      
      const timer = setTimeout(() => {
        if (!session && !isLoadingSession && !cachedSession) {
          hasNavigatedRef.current = true;
          toast({
            variant: 'destructive',
            title: 'Инвентаризация не найдена',
            description: 'Возможно, она была удалена. Перенаправляем на список инвентаризаций.',
          });
          router.replace('/dashboard/sessions');
        }
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [isLoadingSession, session, cachedSession, sessionError, router, toast]);

  // Обработка ошибок загрузки сессии
  React.useEffect(() => {
    if (sessionError) {
      console.error('Error loading session:', sessionError);
      hasNavigatedRef.current = true;
      toast({
        variant: 'destructive',
        title: 'Ошибка загрузки инвентаризации',
        description: sessionError instanceof Error 
          ? sessionError.message 
          : 'Не удалось загрузить данные инвентаризации. Проверьте подключение к интернету.',
      });
      // Не перенаправлять автоматически, дать пользователю возможность повторить
    }
  }, [sessionError, toast]);

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
    setDeleteProgress(0);

    try {
        await deleteSessionWithLinesClient(firestore, barId, id, setDeleteProgress);
        toast({ title: "Инвентаризация удалена." });
        // Navigate AFTER successful deletion to prevent component unmounting during async operation
        router.replace("/dashboard/sessions");
    } catch(e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Произошла неизвестная ошибка.";
        toast({ 
            variant: "destructive", 
            title: "Не удалось удалить инвентаризацию", 
            description: errorMessage
        });
        // Reset deleting state on error so user can try again
        setIsDeletingSession(false);
    } finally {
        setDeleteProgress(0);
    }
  };
  
  const handleAddToOrder = async (line: CalculatedInventoryLine & { product: Product }) => {
    if (!user || !barId || !allProducts || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось определить пользователя или подключение к базе данных',
      });
      return;
    }

    if (!line.product.reorderQuantity) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'У продукта не указано рекомендуемое количество заказа. Укажите его в настройках продукта.',
      });
      return;
    }

    try {
      // Получить supplierId (может быть пустой строкой если поставщик не указан)
      const supplierId = line.product.defaultSupplierId || '';
      
      // Найти существующий заказ для этого поставщика (или без поставщика) со статусом draft
      const ordersRef = collection(firestore, 'bars', barId, 'purchaseOrders');
      const ordersQuery = query(
        ordersRef,
        where('supplierId', '==', supplierId),
        where('status', '==', 'draft')
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      
      let orderRef;
      if (!ordersSnapshot.empty) {
        // Использовать существующий заказ
        orderRef = doc(firestore, 'bars', barId, 'purchaseOrders', ordersSnapshot.docs[0].id);
      } else {
        // Создать новый заказ
        orderRef = doc(collection(firestore, 'bars', barId, 'purchaseOrders'));
        const orderData = {
          id: orderRef.id,
          barId,
          supplierId: supplierId, // Может быть пустой строкой
          status: 'draft' as const,
          orderDate: serverTimestamp(),
          createdAt: serverTimestamp(),
          createdByUserId: user.uid,
        };
        await setDoc(orderRef, orderData);
      }

      // Проверить, нет ли уже этого продукта в заказе
      const linesRef = collection(orderRef, 'lines');
      const linesQuery = query(linesRef, where('productId', '==', line.product.id));
      const linesSnapshot = await getDocs(linesQuery);

      if (!linesSnapshot.empty) {
        // Обновить существующую строку
        const existingLine = linesSnapshot.docs[0];
        const currentQuantity = existingLine.data().quantity || 0;
        const newQuantity = currentQuantity + (line.product.reorderQuantity || 1);
        await updateDoc(existingLine.ref, {
          quantity: newQuantity,
          costPerItem: line.product.costPerBottle || 0,
        });
      } else {
        // Создать новую строку
        const lineRef = doc(collection(orderRef, 'lines'));
        const lineData = {
          id: lineRef.id,
          purchaseOrderId: orderRef.id,
          productId: line.product.id,
          quantity: line.product.reorderQuantity || 1,
          costPerItem: line.product.costPerBottle || 0,
          receivedQuantity: 0,
        };
        await setDoc(lineRef, lineData);
      }

      toast({
        title: 'Продукт добавлен в заказ',
        description: `${buildProductDisplayName(line.product.name, line.product.bottleVolumeMl)} добавлен в заказ${line.product.defaultSupplierId ? '' : ' (без указания поставщика)'}.`,
      });
    } catch (error) {
      console.error('Error adding to order:', error);
      toast({
        variant: 'destructive',
        title: 'Ошибка при добавлении в заказ',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
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
    } catch (serverError: unknown) {
        const errorMessage = serverError instanceof Error ? serverError.message : 'Не удалось добавить продукт';
        toast({
            variant: "destructive",
            title: "Ошибка",
            description: errorMessage,
        });
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
    } catch (serverError: unknown) {
        const errorMessage = serverError instanceof Error ? serverError.message : 'Не удалось сохранить изменения';
        toast({
            variant: "destructive",
            title: "Ошибка сохранения",
            description: errorMessage,
        });
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
          description: "Инвентаризация завершена.",
      });
      router.push('/dashboard/sessions');
    } catch(serverError: unknown) {
        const errorMessage = serverError instanceof Error ? serverError.message : 'Не удалось завершить инвентаризацию';
        toast({
            variant: "destructive",
            title: "Ошибка",
            description: errorMessage,
        });
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: sessionRef.path, operation: 'update' }));
    } finally {
      setIsCompleting(false);
    }
  };
  
  const handleExportCSV = () => {
    if (!localLines || !allProducts) return;

    // Helper function to escape CSV values - always wrap in quotes for consistency
    const escapeCSV = (value: string | number): string => {
      const stringValue = String(value);
      // Always wrap in quotes and escape double quotes by doubling them
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    // Use semicolon as separator for Russian locale Excel compatibility
    const SEPARATOR = ';';
    const headers = ["Наименование продукта", "Фактический остаток (мл)"];
    const headerRow = headers.map(escapeCSV).join(SEPARATOR);
    
    // Data rows - только название продукта и фактический остаток
    const rows = localLines.map(line => {
      const product = allProducts.find(p => p.id === line.productId);
      return [
        product ? buildProductDisplayName(product.name, product.bottleVolumeMl) : '',
        line.endStock
      ].map(escapeCSV).join(SEPARATOR);
    });

    // Use \r\n for Windows compatibility
    const csvContent = [headerRow, ...rows].join('\r\n');
    
    // Add UTF-8 BOM at the beginning of the string for Excel compatibility
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    // Use data URI with proper encoding - this works better than encodeURI for CSV
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvWithBOM);
    const link = document.createElement("a");
    link.setAttribute("href", dataUri);
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
  
  // Показывать loading только если нет кэшированной сессии
  if (isLoadingSession && !cachedSession) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Использовать effectiveSession для проверки существования
  if (!effectiveSession) {
    // Проверка уже обработана в useEffect с таймаутом
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Явное отображение ошибки загрузки
  if (sessionError && !isLoadingSession) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Alert className="max-w-md" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ошибка загрузки</AlertTitle>
          <AlertDescription>
            {sessionError instanceof Error 
              ? sessionError.message 
              : 'Не удалось загрузить инвентаризацию. Попробуйте обновить страницу.'}
            <Button 
              variant="link" 
              className="p-0 h-auto ml-1"
              onClick={() => window.location.reload()}
            >
              Обновить страницу
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const isLoading = (isLoadingSession || isLoadingLines || isLoadingProducts) && !sessionError;
  const isEditable = effectiveSession.status === 'in_progress';

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        className="hidden"
        accept=".csv"
      />
      <SessionHeader session={effectiveSession} isEditable={isEditable} />
      {isEditable && (
        <div className="mb-4 flex items-center gap-2">
          <HelpIcon 
            description="Используйте калькулятор для расчета остатков. Результаты автоматически появятся в таблице. Проверьте фактические остатки и завершите инвентаризацию."
          />
          <span className="text-sm text-muted-foreground">Подсказка работы раздела</span>
        </div>
      )}
      <SessionActions
        isEditable={isEditable}
        isSaving={isSaving}
        isCompleting={isCompleting}
        isDeleting={isDeletingSession}
        deleteProgress={deleteProgress}
        hasUnsavedChanges={hasUnsavedChanges}
        sessionName={effectiveSession.name}
        onAddProduct={() => setIsAddProductOpen(true)}
        onSave={handleSaveChanges}
        onComplete={handleCompleteSession}
        onDelete={handleDeleteSession}
        onImportClick={handleImportClick}
        onExportCSV={handleExportCSV}
        isDeleteDialogOpen={isDeleteDialogOpen}
        setIsDeleteDialogOpen={setIsDeleteDialogOpen}
      />
      <div className="overflow-x-auto">
       {isLoading ? <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (localLines && allProducts && (
        <InventoryTable 
            lines={localLines} 
            setLines={setLocalLines} 
            products={allProducts}
            isEditable={isEditable}
            onAddToOrder={handleAddToOrder}
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
              Вы собираетесь безвозвратно удалить инвентаризацию "{effectiveSession?.name}" и все связанные с ней данные. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSession}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession} disabled={isDeletingSession} className="bg-destructive hover:bg-destructive/90">
                {isDeletingSession ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                {isDeletingSession ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
          {isDeletingSession && deleteProgress > 0 && (
            <div className="px-6 pb-4">
              <Progress value={deleteProgress} className="w-full" />
              <p className="text-xs text-muted-foreground mt-2 text-center">{deleteProgress}%</p>
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
