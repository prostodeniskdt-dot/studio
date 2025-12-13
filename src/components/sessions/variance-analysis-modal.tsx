'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Lightbulb } from 'lucide-react';
import type { CalculatedInventoryLine } from '@/lib/types';
import { analyzeVariance } from '@/lib/actions';
import { formatCurrency, translateProductName } from '@/lib/utils';
import { useServerAction } from '@/hooks/use-server-action';

type VarianceAnalysisModalProps = {
  line: CalculatedInventoryLine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VarianceAnalysisModal({ line, open, onOpenChange }: VarianceAnalysisModalProps) {
  
  const { execute: performAnalysis, isLoading, data, error } = useServerAction(analyzeVariance);

  const analysisCallback = React.useCallback(() => {
    if (open && line) {
        performAnalysis(line);
    }
  }, [line, open, performAnalysis]);

  React.useEffect(() => {
     analysisCallback();
  }, [analysisCallback]);

  const varianceType = line.differenceVolume > 0 ? 'Излишек' : 'Недостача';
  const varianceColor = line.differenceVolume > 0 ? 'text-green-600' : 'text-destructive';


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Анализ отклонений: {line.product ? translateProductName(line.product.name) : ''}</DialogTitle>
          <DialogDescription>
            AI-аналитика <span className={varianceColor}>{varianceType} в {Math.abs(Math.round(line.differenceVolume))}мл ({formatCurrency(Math.abs(line.differenceMoney))})</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Lightbulb className="text-primary"/> Возможные причины</h3>
            {isLoading && (
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            )}
            {error && (
                <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Ошибка анализа</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {data && (
                <div className="text-sm text-muted-foreground prose prose-sm dark:prose-invert rounded-md border p-4 bg-muted/50">
                    <p>{data.analysis}</p>
                </div>
            )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">Закрыть</Button>
          <Button onClick={() => performAnalysis(line)} disabled={isLoading}>
            {isLoading ? "Анализ..." : "Повторить анализ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
