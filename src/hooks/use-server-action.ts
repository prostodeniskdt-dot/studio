'use client';

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ServerActionResponse } from '@/lib/actions';

interface UseServerActionOptions<T> {
    onSuccess?: (data?: T) => void;
    onError?: (error: string | undefined) => void;
    successMessage?: string;
    errorMessage?: string;
}

export function useServerAction<TInput, TData>(
    action: (input: TInput) => Promise<ServerActionResponse<TData>>,
    options: UseServerActionOptions<TData> = {}
) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | undefined>(undefined);
    const [data, setData] = React.useState<TData | undefined>(undefined);

    const execute = React.useCallback(async (input: TInput) => {
        setIsLoading(true);
        setError(undefined);
        setData(undefined);

        try {
            const result = await action(input);

            if (result.success) {
                setData(result.data);
                if (options.successMessage) {
                    toast({ title: options.successMessage });
                }
                // For actions that return data, pass it to the onSuccess callback.
                // For actions that don't (like delete), the callback will be called without args.
                options.onSuccess?.(result.data);
            } else {
                setError(result.error);
                toast({
                    variant: 'destructive',
                    title: options.errorMessage || 'Произошла ошибка',
                    description: result.error,
                });
                options.onError?.(result.error);
            }
        } catch (e: any) {
            const errorMessage = e.message || 'Произошла непредвиденная ошибка на сервере.';
            setError(errorMessage);
            toast({
                variant: 'destructive',
                title: options.errorMessage || 'Произошла ошибка',
                description: errorMessage,
            });
            options.onError?.(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [action, toast, options]);

    return { execute, isLoading, error, data };
}
