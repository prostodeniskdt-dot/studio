'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Combobox, type GroupedComboboxOption } from '@/components/ui/combobox';
import { Weight, Send, Loader2, Ruler } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { translateCategory } from '@/lib/utils';
import { errorEmitter, FirestorePermissionError } from '@/firebase';

export default function UnifiedCalculatorPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;

  const productsQuery = useMemoFirebase(() => 
      firestore ? query(collection(firestore, 'products'), where('isActive', '==', true)) : null,
      [firestore]
  );
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const groupedProductOptions = React.useMemo<GroupedComboboxOption[]>(() => {
    if (!products) return [];

    const groups: Record<string, { value: string; label: string }[]> = {};
    
    products.filter(p => p.isActive).forEach(p => {
      const category = translateCategory(p.category);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ value: p.id, label: p.name });
    });

    return Object.entries(groups)
      .map(([label, options]) => ({ label, options }))
      .sort((a,b) => a.label.localeCompare(b.label));

  }, [products]);

  const [selectedProductId, setSelectedProductId] = React.useState<string | undefined>(undefined);

  const [bottleVolume, setBottleVolume] = React.useState('');
  const [fullWeight, setFullWeight] = React.useState('');
  const [emptyWeight, setEmptyWeight] = React.useState('');
  const [currentWeight, setCurrentWeight] = React.useState('');
  const [liquidLevel, setLiquidLevel] = React.useState('');
  
  const [calculatedVolume, setCalculatedVolume] = React.useState<number | null>(null);
  
  const [isSending, setIsSending] = React.useState(false);

  const handleProductSelect = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    setSelectedProductId(productId);
    if (product) {
        setBottleVolume(product.bottleVolumeMl?.toString() ?? '');
        setFullWeight(product.fullBottleWeightG?.toString() ?? '');
        setEmptyWeight(product.emptyBottleWeightG?.toString() ?? '');
        setCalculatedVolume(null);
    }
  };

  const handleCalculate = () => {
    setCalculatedVolume(null);
    let volumeByWeight: number | null = null;
    let volumeByHeight: number | null = null;

    // Weight calculation
    const bv = parseFloat(bottleVolume);
    const fw = parseFloat(fullWeight);
    const ew = parseFloat(emptyWeight);
    const cw = parseFloat(currentWeight);

    if (fw > ew && cw >= ew && bv > 0) {
        const liquidNetWeight = fw - ew;
        const currentLiquidWeight = cw - ew;
        if (currentLiquidWeight <= 0) {
            volumeByWeight = 0;
        } else {
            const volume = (currentLiquidWeight / liquidNetWeight) * bv;
            volumeByWeight = Math.round(volume);
        }
    }
    
    // Height calculation
    const ll = parseFloat(liquidLevel);
    if (ll > 0 && bv > 0) {
        // This is a very rough approximation and assumes a linear shape.
        const mlPerCm = bv / 25; // Super rough estimate: 25cm avg height
        const volume = ll * mlPerCm;
        volumeByHeight = Math.round(volume > bv ? bv : volume);
    }

    // Prioritize weight calculation as it's more accurate
    if (volumeByWeight !== null) {
        setCalculatedVolume(volumeByWeight);
    } else if (volumeByHeight !== null) {
        setCalculatedVolume(volumeByHeight);
    }
  };

  const handleSendToInventory = async (volume: number | null) => {
    if (volume === null || !selectedProductId || !barId || !firestore) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Сначала рассчитайте объем и выберите продукт.",
      });
      return;
    }

    setIsSending(true);
    
    const sessionsQuery = query(
        collection(firestore, 'bars', barId, 'inventorySessions'), 
        where('status', '==', 'in_progress'),
        orderBy('createdAt', 'desc'),
        limit(1)
    );

    getDocs(sessionsQuery).then(sessionsSnapshot => {
        if (sessionsSnapshot.empty) {
            toast({
                variant: "destructive",
                title: "Нет активной инвентаризации",
                description: "Пожалуйста, начните новую инвентаризацию на главной панели.",
            });
            setIsSending(false);
            return;
        }
      
        const activeSession = sessionsSnapshot.docs[0];
        const activeSessionId = activeSession.id;
        const linesColRef = collection(firestore, 'bars', barId, 'inventorySessions', activeSessionId, 'lines');
        const linesQuery = query(linesColRef, where('productId', '==', selectedProductId), limit(1));
      
        return getDocs(linesQuery).then(linesSnapshot => {
            if (linesSnapshot.empty) {
                const product = products?.find(p => p.id === selectedProductId);
                if (!product) {
                    setIsSending(false);
                    return;
                };

                const batch = writeBatch(firestore);
                const newLineRef = doc(linesColRef);
                const newLineData = {
                  id: newLineRef.id,
                  productId: selectedProductId,
                  inventorySessionId: activeSessionId,
                  startStock: 0,
                  purchases: 0,
                  sales: 0,
                  endStock: volume,
                  theoreticalEndStock: 0,
                  differenceVolume: 0,
                  differenceMoney: 0,
                  differencePercent: 0,
                };
                batch.set(newLineRef, newLineData);
                
                batch.commit().then(() => {
                    toast({
                        title: "Данные отправлены",
                        description: `Остаток для продукта ${product.name} (${volume} мл) добавлен в текущую инвентаризацию.`,
                    });
                }).catch(serverError => {
                    const permissionError = new FirestorePermissionError({ path: newLineRef.path, operation: 'create', requestResourceData: newLineData });
                    errorEmitter.emit('permission-error', permissionError);
                }).finally(() => {
                    setIsSending(false);
                });

            } else {
                const lineDoc = linesSnapshot.docs[0];
                const lineRef = doc(firestore, 'bars', barId, 'inventorySessions', activeSessionId, 'lines', lineDoc.id);
                const updateData = { endStock: volume };
                updateDoc(lineRef, updateData).then(() => {
                     toast({
                        title: "Данные отправлены",
                        description: `Остаток для продукта ${products?.find(p => p.id === selectedProductId)?.name} (${volume} мл) обновлен в текущей инвентаризации.`,
                    });
                }).catch(serverError => {
                    const permissionError = new FirestorePermissionError({ path: lineRef.path, operation: 'update', requestResourceData: updateData });
                    errorEmitter.emit('permission-error', permissionError);
                }).finally(() => {
                    setIsSending(false);
                });
            }
        }).catch(serverError => {
            const permissionError = new FirestorePermissionError({ path: linesColRef.path, operation: 'list' });
            errorEmitter.emit('permission-error', permissionError);
            setIsSending(false);
        });

    }).catch(serverError => {
        const permissionError = new FirestorePermissionError({ path: `bars/${barId}/inventorySessions`, operation: 'list' });
        errorEmitter.emit('permission-error', permissionError);
        setIsSending(false);
    });
  };

  if (isLoadingProducts) {
      return (
          <div className="flex justify-center items-center h-full pt-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      )
  }

  return (
    <>
      <div className="py-4">
          <h1 className="text-3xl font-bold tracking-tight">Универсальный калькулятор</h1>
          <p className="text-muted-foreground">Рассчитайте остатки в бутылке и отправьте данные в текущую инвентаризацию.</p>
      </div>
      
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Расчет объема жидкости</CardTitle>
          <CardDescription>Выберите продукт для автозаполнения, введите замеры и отправьте результат в активную инвентаризацию.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          <div className="space-y-2">
            <Label htmlFor="product-select">Выберите продукт (профиль бутылки)</Label>
            <Combobox 
              options={groupedProductOptions}
              value={selectedProductId}
              onSelect={handleProductSelect}
              placeholder={isLoadingProducts ? "Загрузка продуктов..." : "Выберите продукт из каталога..."}
              searchPlaceholder='Поиск продукта...'
              notFoundText='Продукт не найден.'
            />
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
                {/* Расчет по весу */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Расчет по весу</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullWeight">Вес полной (г)</Label>
                            <Input id="fullWeight" type="number" value={fullWeight} onChange={e => setFullWeight(e.target.value)} placeholder="1150" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="emptyWeight">Вес пустой (г)</Label>
                            <Input id="emptyWeight" type="number" value={emptyWeight} onChange={e => setEmptyWeight(e.target.value)} placeholder="450" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="currentWeight">Текущий вес (г)</Label>
                        <Input id="currentWeight" type="number" value={currentWeight} onChange={e => setCurrentWeight(e.target.value)} placeholder="Замер с весов" />
                    </div>
                </div>

                 <Separator />
                
                {/* Расчет по высоте */}
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Расчет по высоте</h3>
                    <div className="space-y-2">
                        <Label htmlFor="liquidLevel">Уровень жидкости (см)</Label>
                        <Input id="liquidLevel" type="number" value={liquidLevel} onChange={e => setLiquidLevel(e.target.value)} placeholder="Замер линейкой" />
                    </div>
                 </div>

                <Separator />
                
                <div className="space-y-2">
                    <Label htmlFor="bottleVolume">Номинальный объем (мл)</Label>
                    <Input id="bottleVolume" type="number" value={bottleVolume} onChange={(e) => setBottleVolume(e.target.value)} placeholder="700" />
                </div>
            </div>

            <div className="space-y-6">
               <Button onClick={handleCalculate} className="w-full h-12 text-lg">
                Рассчитать
              </Button>
              
              { calculatedVolume !== null && (
                <Card className='bg-muted/50'>
                  <CardHeader>
                    <CardTitle>Результат расчета</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-4 rounded-lg bg-background">
                        <p className="text-base text-muted-foreground flex items-center justify-center gap-2"><Weight className='h-4 w-4'/> Рассчитанный объем:</p>
                        <p className="text-4xl font-bold text-primary">{calculatedVolume} мл</p>
                         <Button onClick={() => handleSendToInventory(calculatedVolume)} className="w-full mt-2" disabled={calculatedVolume === null || isSending || !barId}>
                            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {isSending ? 'Отправка...' : 'Отправить в инвентаризацию'}
                        </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
