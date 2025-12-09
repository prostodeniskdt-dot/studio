'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert, Ruler, Weight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function UnifiedCalculatorPage() {
  // Состояния для калькулятора по высоте
  const [bottleHeight, setBottleHeight] = React.useState('');
  const [bottleVolume, setBottleVolume] = React.useState('');
  const [liquidHeight, setLiquidHeight] = React.useState('');
  const [calculatedVolumeByHeight, setCalculatedVolumeByHeight] = React.useState<number | null>(null);

  // Состояния для калькулятора по весу
  const [fullWeight, setFullWeight] = React.useState('');
  const [emptyWeight, setEmptyWeight] = React.useState('');
  const [currentWeight, setCurrentWeight] = React.useState('');
  // nominalVolume используется общий (bottleVolume)
  const [calculatedVolumeByWeight, setCalculatedVolumeByWeight] = React.useState<number | null>(null);
  
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
      <p className="text-muted-foreground mb-6">Рассчитайте остатки в бутылке, используя точные и быстрые методы.</p>
      
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Расчет объема жидкости</CardTitle>
          <CardDescription>Введите данные для получения точного и примерного расчетов.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Общие данные */}
          <div className="space-y-2">
            <Label htmlFor="bottleVolume">Номинальный объем бутылки (мл)</Label>
            <Input
              id="bottleVolume"
              type="number"
              value={bottleVolume}
              onChange={(e) => setBottleVolume(e.target.value)}
              placeholder="например, 700"
            />
          </div>

          <Separator />

          {/* Блок калькулятора по весу */}
          <div className="space-y-4">
            <div className='flex items-center gap-2'>
                <Weight className="h-5 w-5 text-primary"/>
                <h3 className="text-lg font-semibold">Точный расчет (по весу)</h3>
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
            <div className="space-y-2">
                <Label htmlFor="currentWeight">Текущий вес бутылки (г)</Label>
                <Input id="currentWeight" type="number" value={currentWeight} onChange={e => setCurrentWeight(e.target.value)} placeholder="Замер с помощью весов" />
            </div>
          </div>
          
          <Separator />

          {/* Блок калькулятора по высоте */}
           <div className="space-y-4">
            <div className='flex items-center gap-2'>
                <Ruler className="h-5 w-5 text-primary"/>
                <h3 className="text-lg font-semibold">Примерный расчет (по высоте)</h3>
            </div>
             <Alert variant="destructive" className="mt-4">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Внимание!</AlertTitle>
                <AlertDescription>
                    Метод по высоте неточен для бутылок неправильной формы. Используйте для быстрой оценки.
                </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="bottleHeight">Высота бутылки (см)</Label>
                    <Input id="bottleHeight" type="number" value={bottleHeight} onChange={(e) => setBottleHeight(e.target.value)} placeholder="30" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="liquidHeight">Высота жидкости (см)</Label>
                    <Input id="liquidHeight" type="number" value={liquidHeight} onChange={(e) => setLiquidHeight(e.target.value)} placeholder="Замер рейкой" />
                </div>
            </div>
          </div>
          
          <Button onClick={handleCalculate} className="w-full">
            Рассчитать
          </Button>

          {(calculatedVolumeByWeight !== null || calculatedVolumeByHeight !== null) && (
            <div className="pt-4 space-y-4">
              <Separator />
              <div className="text-center">
                  <p className="text-muted-foreground">Точный объем (по весу):</p>
                  <p className="text-3xl font-bold">{calculatedVolumeByWeight !== null ? `${calculatedVolumeByWeight} мл` : 'Нет данных'}</p>
              </div>
               <div className="text-center">
                  <p className="text-muted-foreground">Примерный объем (по высоте):</p>
                  <p className="text-xl font-medium text-muted-foreground">{calculatedVolumeByHeight !== null ? `${calculatedVolumeByHeight} мл` : 'Нет данных'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
