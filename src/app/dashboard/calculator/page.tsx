'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert } from 'lucide-react';

function HeightCalculator() {
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
      <Card>
        <CardHeader>
          <CardTitle>Калькулятор по высоте</CardTitle>
          <CardDescription>Введите замеры для примерного расчета объема жидкости.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Внимание!</AlertTitle>
                <AlertDescription>
                    Этот метод неточен для большинства бутылок, так как их форма не является идеальным цилиндром. Используйте для быстрой оценки.
                </AlertDescription>
            </Alert>
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
                <p className="text-muted-foreground">Примерный объем жидкости:</p>
                <p className="text-3xl font-bold">{calculatedVolume} мл</p>
            </div>
          )}
        </CardContent>
      </Card>
  );
}


function WeightCalculator() {
    const [fullWeight, setFullWeight] = React.useState('');
    const [emptyWeight, setEmptyWeight] = React.useState('');
    const [currentWeight, setCurrentWeight] = React.useState('');
    const [nominalVolume, setNominalVolume] = React.useState('');
    const [calculatedVolume, setCalculatedVolume] = React.useState<number | null>(null);

    const handleCalculate = () => {
        const fw = parseFloat(fullWeight);
        const ew = parseFloat(emptyWeight);
        const cw = parseFloat(currentWeight);
        const nv = parseFloat(nominalVolume);

        if (fw > ew && cw >= ew && nv > 0) {
            const liquidNetWeight = fw - ew;
            const currentLiquidWeight = cw - ew;
            if (currentLiquidWeight <= 0) {
                setCalculatedVolume(0);
                return;
            }
            const volume = (currentLiquidWeight / liquidNetWeight) * nv;
            setCalculatedVolume(Math.round(volume));
        } else {
            setCalculatedVolume(null);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Калькулятор по весу</CardTitle>
                <CardDescription>Введите замеры для точного расчета объема.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="nominalVolume">Номинальный объем (мл)</Label>
                    <Input id="nominalVolume" type="number" value={nominalVolume} onChange={e => setNominalVolume(e.target.value)} placeholder="например, 700" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullWeight">Вес полной бутылки (г)</Label>
                        <Input id="fullWeight" type="number" value={fullWeight} onChange={e => setFullWeight(e.target.value)} placeholder="например, 1150" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="emptyWeight">Вес пустой бутылки (г)</Label>
                        <Input id="emptyWeight" type="number" value={emptyWeight} onChange={e => setEmptyWeight(e.target.value)} placeholder="например, 450" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="currentWeight">Текущий вес бутылки (г)</Label>
                    <Input id="currentWeight" type="number" value={currentWeight} onChange={e => setCurrentWeight(e.target.value)} placeholder="Замер с помощью весов" />
                </div>
                
                <Button onClick={handleCalculate} className="w-full">Рассчитать</Button>

                {calculatedVolume !== null && (
                    <div className="pt-4 text-center">
                        <p className="text-muted-foreground">Рассчитанный объем жидкости:</p>
                        <p className="text-3xl font-bold">{calculatedVolume} мл</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


export default function CalculatorPage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Калькулятор объема</h1>
      <p className="text-muted-foreground mb-6">Выберите метод для расчета остатков в бутылке.</p>
      
      <Tabs defaultValue="weight" className="max-w-md mx-auto">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weight">Точный (по весу)</TabsTrigger>
            <TabsTrigger value="height">Примерный (по высоте)</TabsTrigger>
        </TabsList>
        <TabsContent value="weight" className="mt-4">
            <WeightCalculator />
        </TabsContent>
        <TabsContent value="height" className="mt-4">
            <HeightCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
