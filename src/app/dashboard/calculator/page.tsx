'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ruler, Weight, Bot } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { Product } from '@/lib/types';
import { mockProducts } from '@/lib/data';

export default function UnifiedCalculatorPage() {
  const [products] = React.useState<Product[]>(mockProducts);
  const [selectedProductId, setSelectedProductId] = React.useState<string | null>(null);

  // Состояния для калькулятора
  const [bottleHeight, setBottleHeight] = React.useState('');
  const [bottleVolume, setBottleVolume] = React.useState('');
  const [liquidHeight, setLiquidHeight] = React.useState('');
  const [calculatedVolumeByHeight, setCalculatedVolumeByHeight] = React.useState<number | null>(null);

  const [fullWeight, setFullWeight] = React.useState('');
  const [emptyWeight, setEmptyWeight] = React.useState('');
  const [currentWeight, setCurrentWeight] = React.useState('');
  const [calculatedVolumeByWeight, setCalculatedVolumeByWeight] = React.useState<number | null>(null);
  
  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setSelectedProductId(productId);
    if (product) {
        setBottleVolume(product.bottleVolumeMl?.toString() ?? '');
        setFullWeight(product.fullBottleWeightG?.toString() ?? '');
        setEmptyWeight(product.emptyBottleWeightG?.toString() ?? '');
        setBottleHeight(product.bottleHeightCm?.toString() ?? '');
        // Сброс результатов при выборе нового продукта
        setCalculatedVolumeByHeight(null);
        setCalculatedVolumeByWeight(null);
    }
  };

  const handleCalculate = () => {
    // Расчет по высоте
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
    } else {
      setCalculatedVolumeByHeight(null);
    }

    // Расчет по весу
    const fw = parseFloat(fullWeight);
    const ew = parseFloat(emptyWeight);
    const cw = parseFloat(currentWeight);
    const nv = parseFloat(bottleVolume); // Используем общий объем

    if (fw > ew && cw >= ew && nv > 0) {
        const liquidNetWeight = fw - ew;
        const currentLiquidWeight = cw - ew;
        if (currentLiquidWeight <= 0) {
            setCalculatedVolumeByWeight(0);
        } else {
            const volume = (currentLiquidWeight / liquidNetWeight) * nv;
            setCalculatedVolumeByWeight(Math.round(volume));
        }
    } else {
        setCalculatedVolumeByWeight(null);
    }
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Универсальный калькулятор</h1>
      <p className="text-muted-foreground mb-6">Рассчитайте остатки в бутылке, используя сохраненные профили и точные методы.</p>
      
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Расчет объема жидкости</CardTitle>
          <CardDescription>Выберите продукт для автозаполнения или введите данные вручную.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          <div className="space-y-2">
            <Label htmlFor="product-select">Выберите продукт (профиль бутылки)</Label>
            <Select onValueChange={handleProductSelect}>
              <SelectTrigger id="product-select">
                <SelectValue placeholder="Выберите продукт из каталога..." />
              </SelectTrigger>
              <SelectContent>
                {products.filter(p => p.isActive).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-8">
            {/* Левая колонка: Ввод данных */}
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

            {/* Правая колонка: Результаты */}
            <div className="space-y-6">
               <Button onClick={handleCalculate} className="w-full h-12 text-lg">
                Рассчитать
              </Button>
              
              {(calculatedVolumeByWeight !== null || calculatedVolumeByHeight !== null) && (
                <Card className='bg-muted/50'>
                  <CardHeader>
                    <CardTitle>Результаты расчета</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center p-4 rounded-lg bg-background">
                      <p className="text-base text-muted-foreground flex items-center justify-center gap-2"><Weight className='h-4 w-4'/> Точный объем (по весу):</p>
                      <p className="text-4xl font-bold text-primary">{calculatedVolumeByWeight !== null ? `${calculatedVolumeByWeight} мл` : 'Нет данных'}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-background">
                      <p className="text-base text-muted-foreground flex items-center justify-center gap-2"><Ruler className='h-4 w-4'/> Примерный объем (по высоте):</p>
                      <p className="text-2xl font-semibold text-muted-foreground">{calculatedVolumeByHeight !== null ? `${calculatedVolumeByHeight} мл` : 'Нет данных'}</p>
                    </div>
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
