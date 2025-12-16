'use client';

import * as React from 'react';
import { useToast } from './use-toast';

type ServerAction<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

type UseServerActionOptions<TOutput> = {
  onSuccess?: (result: TOutput) => void;
  onError?: (error: string) => void;
};

export function useServerAction<TInput, TOutput>(
  action: ServerAction<TInput, TOutput>,
  options: UseServerActionOptions<TOutput> = {}
) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [data, setData] = React.useState<TOutput | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const execute = React.useCallback(async (input: TInput) => {
    setIsLoading(true);
    setData(null);
    setError(null);

    try {
      const result = await action(input);
      setData(result);
      if (options.onSuccess) {
        options.onSuccess(result);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Произошла неизвестная ошибка';
      setError(errorMessage);
      if (options.onError) {
        options.onError(errorMessage);
      } else {
        toast({
            variant: "destructive",
            title: "Ошибка",
            description: errorMessage
        })
      }
    } finally {
      setIsLoading(false);
    }
  }, [action, options, toast]);

  return { execute, isLoading, data, error };
}
