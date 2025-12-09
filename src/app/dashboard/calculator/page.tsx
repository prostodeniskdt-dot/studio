'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function CalculatorPage() {
  const [bottleHeight, setBottleHeight] = React.useState('');
  const [bottleVolume, setBottleVolume] = React.useState('');
  const [liquidHeight, setLiquidHeight] = React.useState('');
  const [calculatedVolume, setCalculatedVolume] = React.useState<number | null>(null);

  const handleCalculate = () => {
    const bh = parseFloat(bottleHeight);
    const bv = parseFloat(bottleVolume);
    const lh = parseFloat(liquidHeight);

    if (bh > 0 && bv > 0 && lh >= 0) {
        if (lh > bh) {
            setCalculatedVolume(bv); // If liquid height is more than bottle height, it's a full bottle
            return;
        }
      // Assuming the bottle is a cylinder, the volume is proportional to the height.
      const volume = (lh / bh) * bv;
      setCalculatedVolume(Math.round(volume));
    } else {
      setCalculatedVolume(null);
    }
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Калькулятор объема</h1>
      <p className="text-muted-foreground mb-6">Рассчитайте объем жидкости в бутылке по высоте.</p>
      
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Ввод данных</CardTitle>
          <CardDescription>Введите замеры для расчета объема жидкости.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bottleHeight">Высота бутылки (см)</Label>
            <Input
              id="bottleHeight"
              type="number"
              value={bottleHeight}
              onChange={(e) => setBottleHeight(e.target.value)}
              placeholder="например, 30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bottleVolume">Объем бутылки (мл)</Label>
            <Input
              id="bottleVolume"
              type="number"
              value={bottleVolume}
              onChange={(e) => setBottleVolume(e.target.value)}
              placeholder="например, 700"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="liquidHeight">Высота жидкости (см)</Label>
            <Input
              id="liquidHeight"
              type="number"
              value={liquidHeight}
              onChange={(e) => setLiquidHeight(e.target.value)}
              placeholder="Замер с помощью рейки"
            />
          </div>
          <Button onClick={handleCalculate} className="w-full">
            Рассчитать
          </Button>

          {calculatedVolume !== null && (
            <div className="pt-4 text-center">
                <p className="text-muted-foreground">Рассчитанный объем жидкости:</p>
                <p className="text-3xl font-bold">{calculatedVolume} мл</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
