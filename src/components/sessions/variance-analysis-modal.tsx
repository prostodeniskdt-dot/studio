'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

import type { CalculatedInventoryLine } from '@/lib/types';
import { runVarianceAnalysis } from '@/lib/actions';
import { formatCurrency } from '@/lib/utils';

type VarianceAnalysisModalProps = {
  line: CalculatedInventoryLine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VarianceAnalysisModal({ line, open, onOpenChange }: VarianceAnalysisModalProps) {
  const [analysis, setAnalysis] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setIsLoading(true);
      setError(null);
      setAnalysis(null);
      
      runVarianceAnalysis(line)
        .then(result => {
          setAnalysis(result.analysis);
        })
        .catch(err => {
          setError(err.message || 'An unknown error occurred.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, line]);

  const varianceType = line.differenceVolume > 0 ? 'Surplus' : 'Shortage';
  const varianceColor = line.differenceVolume > 0 ? 'text-green-600' : 'text-destructive';


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Variance Analysis: {line.product?.name}</DialogTitle>
          <DialogDescription>
            AI-powered insights into a <span className={varianceColor}>{varianceType} of {Math.abs(Math.round(line.differenceVolume))}ml ({formatCurrency(Math.abs(line.differenceMoney))})</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <h3 className="font-semibold">Potential Causes</h3>
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
                    <AlertTitle>Analysis Failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {analysis && (
                <div className="text-sm text-muted-foreground prose prose-sm dark:prose-invert">
                    <p>{analysis}</p>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
