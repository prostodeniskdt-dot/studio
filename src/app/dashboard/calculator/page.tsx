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
  
  const [calculatedVolumeByWeight, setCalculatedVolumeByWeight] = React.useState<number | null>(null);
  const [calculatedVolumeByHeight, setCalculatedVolumeByHeight] = React.useState<number | null>(null);
  
  const [isSending, setIsSending] = React.useState(false);
  const [lastSentVolume, setLastSentVolume] = React.useState<'weight' | 'height' | null>(null);

  const handleProductSelect = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    setSelectedProductId(productId);
    if (product) {
        setBottleVolume(product.bottleVolumeMl?.toString() ?? '');
        setFullWeight(product.fullBottleWeightG?.toString() ?? '');
        setEmptyWeight(product.emptyBottleWeightG?.toString() ?? '');
        setCalculatedVolumeByWeight(null);
        setCalculatedVolumeByHeight(null);
    }
  };

  const handleCalculate = () => {
    setCalculatedVolumeByWeight(null);
    setCalculatedVolumeByHeight(null);

    // Weight calculation
    const bv = parseFloat(bottleVolume);
    const fw = parseFloat(fullWeight);
    const ew = parseFloat(emptyWeight);
    const cw = parseFloat(currentWeight);

    if (fw > ew && cw >= ew && bv > 0) {
        const liquidNetWeight = fw - ew;
        const currentLiquidWeight = cw - ew;
        if (currentLiquidWeight <= 0) {
            setCalculatedVolumeByWeight(0);
        } else {
            const volume = (currentLiquidWeight / liquidNetWeight) * bv;
            setCalculatedVolumeByWeight(Math.round(volume));
        }
    }
    
    // Height calculation
    const ll = parseFloat(liquidLevel);
    if (ll > 0 && bv > 0) {
        // This is a very rough approximation and assumes a linear shape.
        // A better approach would use a lookup table or a more complex formula per bottle type.
        // For now, we'll assume the bottle is mostly cylindrical.
        // A rough heuristic: 1 cm of liquid is ~35-40ml for a standard 700ml bottle.
        const mlPerCm = bv / 25; // Super rough estimate: 25cm avg height
        const volume = ll * mlPerCm;
        setCalculatedVolumeByHeight(Math.round(volume > bv ? bv : volume));
    }
  };

  const handleSendToInventory = async (volume: number | null, type: 'weight' | 'height') => {
    if (volume === null || !selectedProductId || !barId || !firestore) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Сначала рассчитайте объем и выберите продукт.",
      });
      return;
    }

    setIsSending(true);
    setLastSentVolume(type);
    
    try {
      const sessionsQuery = query(
          collection(firestore, 'bars', barId, 'inventorySessions'), 
          where('status', '==', 'in_progress'),
          orderBy('createdAt', 'desc'),
          limit(1)
      );

      const sessionsSnapshot = await getDocs(sessionsQuery);

      if (sessionsSnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Нет активной сессии",
          description: "Пожалуйста, начните новую инвентаризацию на главной панели.",
        });
        setIsSending(false);
        return;
      }
      
      const activeSession = sessionsSnapshot.docs[0];
      const activeSessionId = activeSession.id;

      const linesQuery = query(
        collection(firestore, 'bars', barId, 'inventorySessions', activeSessionId, 'lines'),
        where('productId', '==', selectedProductId),
        limit(1)
      );
      
      const linesSnapshot = await getDocs(linesQuery);

      if (linesSnapshot.empty) {
        const product = products?.find(p => p.id === selectedProductId);
        if (!product) return;

        const batch = writeBatch(firestore);
        const newLineRef = doc(collection(firestore, 'bars', barId, 'inventorySessions', activeSessionId, 'lines'));
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
        await batch.commit();

      } else {
        const lineDoc = linesSnapshot.docs[0];
        const lineRef = doc(firestore, 'bars', barId, 'inventorySessions', activeSessionId, 'lines', lineDoc.id);
        await updateDoc(lineRef, { endStock: volume });
      }
      
      toast({
        title: "Данные отправлены",
        description: `Остаток для продукта ${products?.find(p => p.id === selectedProductId)?.name} (${volume} мл) обновлен в текущей сессии.`,
      });

    } catch (error: any) {
       toast({
          variant: "destructive",
          title: "Ошибка отправки данных",
          description: "Не удалось обновить данные в сессии.",
      });
    } finally {
        setIsSending(false);
    }
  };

  if (isLoadingProducts) {
      return (
          <div className="flex justify-center items-center h-full pt-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
          <div>
              <h1 className="text-3xl font-bold tracking-tight">Универсальный калькулятор</h1>
              <p className="text-muted-foreground">Рассчитайте остатки в бутылке и отправьте данные в текущую инвентаризацию.</p>
          </div>
      </div>
      
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Расчет объема жидкости</CardTitle>
          <CardDescription>Выберите продукт для автозаполнения, введите замеры и отправьте результат в активную сессию.</CardDescription>
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
              
              { (calculatedVolumeByWeight !== null || calculatedVolumeByHeight !== null) && (
                <Card className='bg-muted/50'>
                  <CardHeader>
                    <CardTitle>Результаты расчета</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {calculatedVolumeByWeight !== null && (
                        <div className="text-center p-4 rounded-lg bg-background">
                            <p className="text-base text-muted-foreground flex items-center justify-center gap-2"><Weight className='h-4 w-4'/> Точный объем (по весу):</p>
                            <p className="text-4xl font-bold text-primary">{calculatedVolumeByWeight} мл</p>
                             <Button onClick={() => handleSendToInventory(calculatedVolumeByWeight, 'weight')} className="w-full mt-2" disabled={calculatedVolumeByWeight === null || isSending || !barId}>
                                {isSending && lastSentVolume === 'weight' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                {isSending && lastSentVolume === 'weight' ? 'Отправка...' : 'Отправить в инвентаризацию'}
                            </Button>
                        </div>
                    )}
                     {calculatedVolumeByHeight !== null && (
                        <div className="text-center p-4 rounded-lg bg-background">
                            <p className="text-base text-muted-foreground flex items-center justify-center gap-2"><Ruler className='h-4 w-4'/> Примерный объем (по высоте):</p>
                            <p className="text-4xl font-bold text-secondary-foreground">{calculatedVolumeByHeight} мл</p>
                             <Button onClick={() => handleSendToInventory(calculatedVolumeByHeight, 'height')} className="w-full mt-2" disabled={calculatedVolumeByHeight === null || isSending || !barId}>
                                {isSending && lastSentVolume === 'height' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                {isSending && lastSentVolume === 'height' ? 'Отправка...' : 'Отправить в инвентаризацию'}
                            </Button>
                        </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
