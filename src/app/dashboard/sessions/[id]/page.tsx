'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { InventoryTable } from "@/components/sessions/inventory-table";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Save, XCircle, Download, Upload, PlusCircle } from "lucide-react";
import Link from "next/link";
import { translateStatus } from "@/lib/utils";
import type { InventorySession, Product, InventoryLine } from '@/lib/types';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, serverTimestamp, writeBatch, addDoc } from 'firebase/firestore';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { calculateLineFields } from '@/lib/calculations';
import { Combobox } from '@/components/ui/combobox';
import { translateCategory } from '@/lib/utils';


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
    firestore ? collection(firestore, 'products') : null,
    [firestore]
  );
  const { data: allProducts, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);

  const [localLines, setLocalLines] = React.useState<InventoryLine[] | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isAddProductOpen, setIsAddProductOpen] = React.useState(false);

  React.useEffect(() => {
    if (lines) {
      setLocalLines(lines);
    }
  }, [lines]);

  const productsInSession = React.useMemo(() => new Set(localLines?.map(line => line.productId)), [localLines]);
  
  const groupedProductOptions = React.useMemo(() => {
    if (!allProducts) return [];

    const availableProducts = allProducts.filter(p => p.isActive && !productsInSession.has(p.id));

    const groups: Record<string, { value: string; label: string }[]> = {};
    
    availableProducts.forEach(p => {
      const category = translateCategory(p.category);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ value: p.id, label: p.name });
    });

    return Object.entries(groups)
      .map(([label, options]) => ({ label, options }))
      .sort((a,b) => a.label.localeCompare(b.label));

  }, [allProducts, productsInSession]);


  const handleAddProductToSession = async (productId: string) => {
    if (!productId || !firestore || !barId || !linesRef) {
        toast({ variant: "destructive", title: "Ошибка", description: "Невозможно добавить продукт." });
        return;
    }
    const product = allProducts?.find(p => p.id === productId);
    if (!product) {
        toast({ variant: "destructive", title: "Ошибка", description: "Продукт не найден." });
        return;
    }

    const newLine = {
        id: '', // Firestore will generate this
        productId: product.id,
        inventorySessionId: id,
        startStock: 0,
        purchases: 0,
        sales: 0,
        endStock: 0,
        ...calculateLineFields({ startStock: 0, purchases: 0, sales: 0, endStock: 0 } as InventoryLine, product),
    };

    try {
        const lineDocRef = await addDoc(linesRef, newLine);
        // Firestore listener will update the UI. We can manually add it for faster UI response if needed.
        // setLocalLines(prev => [...(prev || []), { ...newLine, id: lineDocRef.id }]);
        toast({ title: "Продукт добавлен", description: `"${product.name}" добавлен в инвентаризацию.` });
        setIsAddProductOpen(false);
    } catch (error) {
        toast({ variant: "destructive", title: "Ошибка", description: "Не удалось добавить продукт в сессию." });
    }
  };
  
  const handleSaveChanges = async () => {
    if (!localLines || !barId || !firestore || !allProducts) return;

    setIsSaving(true);
    const batch = writeBatch(firestore);
    localLines.forEach(line => {
      const product = allProducts.find(p => p.id === line.productId);
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
    if (!sessionRef || !barId || !firestore || !localLines || !allProducts) return;
    setIsCompleting(true);
    
    await handleSaveChanges();

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
    if (!localLines || !allProducts) return;

    const headers = ["productId", "productName", "startStock", "purchases", "sales", "endStock"];
    
    const rows = localLines.map(line => {
      const product = allProducts.find(p => p.id === line.productId);
      return [
        line.productId,
        product?.name.replace(/,/g, '') || '',
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
       {localLines && allProducts && (
        <InventoryTable 
            lines={localLines} 
            setLines={setLocalLines} 
            products={allProducts}
            isEditable={isEditable} 
        />
      )}
       <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Добавить продукт в сессию</DialogTitle>
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
    </>
  );
}
