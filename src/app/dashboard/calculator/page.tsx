'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ruler, Weight, Send, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { Product, InventorySession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function UnifiedCalculatorPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;

  const productsQuery = useMemoFirebase(() => 
      firestore && barId ? query(collection(firestore, 'bars', barId, 'products'), where('isActive', '==', true)) : null,
      [firestore, barId]
  );
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const [selectedProductId, setSelectedProductId] = React.useState<string | undefined>(undefined);

  const [bottleHeight, setBottleHeight] = React.useState('');
  const [bottleVolume, setBottleVolume] = React.useState('');
  const [liquidHeight, setLiquidHeight] = React.useState('');
  const [calculatedVolumeByHeight, setCalculatedVolumeByHeight] = React.useState<number | null>(null);

  const [fullWeight, setFullWeight] = React.useState('');
  const [emptyWeight, setEmptyWeight] = React.useState('');
  const [currentWeight, setCurrentWeight] = React.useState('');
  const [calculatedVolumeByWeight, setCalculatedVolumeByWeight] = React.useState<number | null>(null);
  
  const [isSending, setIsSending] = React.useState(false);

  const handleProductSelect = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    setSelectedProductId(productId);
    if (product) {
        setBottleVolume(product.bottleVolumeMl?.toString() ?? '');
        setFullWeight(product.fullBottleWeightG?.toString() ?? '');
        setEmptyWeight(product.emptyBottleWeightG?.toString() ?? '');
        setBottleHeight(product.bottleHeightCm?.toString() ?? '');
        setCalculatedVolumeByHeight(null);
        setCalculatedVolumeByWeight(null);
    }
  };

  const handleCalculate = () => {
    // Reset calculations first
    setCalculatedVolumeByHeight(null);
    setCalculatedVolumeByWeight(null);

    // Height calculation
    const bh = parseFloat(bottleHeight);
    const bv = parseFloat(bottleVolume);
    const lh = parseFloat(liquidHeight);

    if (bh > 0 && bv > 0 && lh >= 0) {
      if (lh > bh) {
        setCalculatedVolumeByHeight(bv); 
      } else {
        const volume = (lh / bh) * bv;
        setCalculatedVolumeByHeight(Math.round(volume));
      }
    }

    // Weight calculation
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
  };

  const handleSendToInventory = async () => {
    if (calculatedVolumeByWeight === null || !selectedProductId || !barId || !firestore) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Сначала рассчитайте точный объем по весу и выберите продукт.",
      });
      return;
    }

    setIsSending(true);
    
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
        toast({
          variant: "destructive",
          title: "Продукт не найден в сессии",
          description: "Этот продукт не является частью текущей инвентаризации.",
        });
        setIsSending(false);
        return;
      }
      
      const lineDoc = linesSnapshot.docs[0];
      const lineRef = doc(firestore, 'bars', barId, 'inventorySessions', activeSessionId, 'lines', lineDoc.id);

      await updateDoc(lineRef, { endStock: calculatedVolumeByWeight });
      
      toast({
        title: "Данные отправлены",
        description: `Остаток для продукта ${products?.find(p => p.id === selectedProductId)?.name} (${calculatedVolumeByWeight} мл) обновлен в текущей сессии.`,
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

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Универсальный калькулятор</h1>
      <p className="text-muted-foreground mb-6">Рассчитайте остатки в бутылке и отправьте данные в текущую инвентаризацию.</p>
      
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Расчет объема жидкости</CardTitle>
          <CardDescription>Выберите продукт для автозаполнения, введите замеры и отправьте результат в активную сессию.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          <div className="space-y-2">
            <Label htmlFor="product-select">Выберите продукт (профиль бутылки)</Label>
            <Select onValueChange={handleProductSelect} value={selectedProductId}>
              <SelectTrigger id="product-select" disabled={isLoadingProducts}>
                <SelectValue placeholder={isLoadingProducts ? "Загрузка продуктов..." : "Выберите продукт из каталога..."} />
              </SelectTrigger>
              <SelectContent>
                {products?.filter(p => p.isActive).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Параметры и замеры</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="bottleVolume">Номинальный объем (мл)</Label>
                        <Input id="bottleVolume" type="number" value={bottleVolume} onChange={(e) => setBottleVolume(e.target.value)} placeholder="700" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="bottleHeight">Высота бутылки (см)</Label>
                        <Input id="bottleHeight" type="number" value={bottleHeight} onChange={(e) => setBottleHeight(e.target.value)} placeholder="30" />
                    </div>
                </div>
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
              </div>
              
              <Separator />

              <div className="space-y-4">
                 <h3 className="text-lg font-semibold">Текущие замеры</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentWeight">Текущий вес (г)</Label>
                        <Input id="currentWeight" type="number" value={currentWeight} onChange={e => setCurrentWeight(e.target.value)} placeholder="Замер с весов" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="liquidHeight">Высота жидкости (см)</Label>
                        <Input id="liquidHeight" type="number" value={liquidHeight} onChange={(e) => setLiquidHeight(e.target.value)} placeholder="Замер рейкой" />
                    </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
               <Button onClick={handleCalculate} className="w-full h-12 text-lg">
                Рассчитать
              </Button>
              
              {(calculatedVolumeByWeight !== null || calculatedVolumeByHeight !== null) && (
                <Card className='bg-muted/50'>
                  <CardHeader>
                    <CardTitle>Результаты расчета</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-4 rounded-lg bg-background">
                      <p className="text-base text-muted-foreground flex items-center justify-center gap-2"><Weight className='h-4 w-4'/> Точный объем (по весу):</p>
                      <p className="text-4xl font-bold text-primary">{calculatedVolumeByWeight !== null ? `${calculatedVolumeByWeight} мл` : 'Нет данных'}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-background">
                      <p className="text-base text-muted-foreground flex items-center justify-center gap-2"><Ruler className='h-4 w-4'/> Примерный объем (по высоте):</p>
                      <p className="text-2xl font-semibold text-muted-foreground">{calculatedVolumeByHeight !== null ? `${calculatedVolumeByHeight} мл` : 'Нет данных'}</p>
                    </div>
                     <Button onClick={handleSendToInventory} className="w-full" disabled={calculatedVolumeByWeight === null || isSending}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        {isSending ? 'Отправка...' : 'Отправить в инвентаризацию'}
                    </Button>
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
