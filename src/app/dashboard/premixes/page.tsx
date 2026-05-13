'use client';
import { PremixesCardView } from "@/components/premixes/premixes-card-view";
import { useProducts } from "@/contexts/products-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HelpIcon } from '@/components/ui/help-icon';
import { Button } from '@/components/ui/button';
import { Library } from 'lucide-react';
import Link from 'next/link';
import { useAuthSession, getWorkingBarId } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/types';
import { buildProductDisplayName } from '@/lib/utils';
import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function PremixesPage() {
    const { personalPremixes, isLoading, refresh: refreshProducts } = useProducts();
    const [premixToSendToLibrary, setPremixToSendToLibrary] = React.useState<Product | null>(null);
    const [isSendingToLibrary, setIsSendingToLibrary] = React.useState(false);

    const { user } = useAuthSession();
    const barId = getWorkingBarId(user);
    const { toast } = useToast();

    // #region agent log
    const __dbg = React.useCallback((message: string, data: Record<string, unknown>) => {
        fetch('http://127.0.0.1:7368/ingest/4b9e7ee6-7078-4b91-881c-e050e57a31cc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '6a8e21' },
            body: JSON.stringify({
                sessionId: '6a8e21',
                runId: 'products-sync',
                hypothesisId: 'A+C',
                location: 'src/app/dashboard/premixes/page.tsx',
                message,
                data,
                timestamp: Date.now(),
            }),
        }).catch(() => {});
    }, []);
    // #endregion

    const handleSendToLibrary = React.useCallback((premix: Product) => {
        setPremixToSendToLibrary(premix);
    }, []);

    const confirmSendToLibrary = React.useCallback(async () => {
        if (!premixToSendToLibrary || !user || !barId) return;

        setIsSendingToLibrary(true);

        try {
            __dbg('premixSendToLibrary:start', { premixId: premixToSendToLibrary.id, barId });
            const res = await fetch(`/api/products/${premixToSendToLibrary.id}`, {
                method: 'PATCH',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({ sendToLibrary: true }),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed');
            __dbg('premixSendToLibrary:success', { premixId: premixToSendToLibrary.id, barId });

            if (typeof window !== 'undefined' && barId) {
                try {
                    localStorage.removeItem(`barboss_products_cache_${barId}`);
                } catch {
                    // Игнорировать ошибки очистки кэша
                }
            }

            refreshProducts();
            __dbg('premixSendToLibrary:refreshCalled', { premixId: premixToSendToLibrary.id, barId });

            toast({
                title: 'Премикс отправлен в библиотеку',
                description: `Премикс "${buildProductDisplayName(premixToSendToLibrary.name, premixToSendToLibrary.bottleVolumeMl)}" теперь доступен всем пользователям.`,
            });
            setPremixToSendToLibrary(null);
        } catch {
            __dbg('premixSendToLibrary:error', { premixId: premixToSendToLibrary?.id, barId });
            toast({
                variant: 'destructive',
                title: 'Ошибка отправки в библиотеку',
                description: 'Не удалось отправить премикс в библиотеку. Попробуйте еще раз.',
            });
        } finally {
            setIsSendingToLibrary(false);
        }
    }, [premixToSendToLibrary, user, barId, refreshProducts, toast]);

    if (isLoading) {
        return (
            <div className="w-full space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-40" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-20 w-full mb-4" />
                                <Skeleton className="h-16 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="w-full">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpIcon 
                  description="Управляйте премиксами - заготовками и коктейлями. Создавайте новые премиксы, редактируйте существующие. Премиксы используются для расчета себестоимости коктейлей."
                />
                <span className="text-sm text-muted-foreground">Подсказка работы раздела</span>
              </div>
              <Link href="/dashboard/premixes/library">
                <Button variant="outline" className="gap-2">
                  <Library className="h-4 w-4" />
                  Библиотека премиксов
                </Button>
              </Link>
            </div>
            <PremixesCardView 
              premixes={personalPremixes || []} 
              onSendToLibrary={handleSendToLibrary}
            />

            {/* Диалог подтверждения отправки в библиотеку */}
            <AlertDialog open={!!premixToSendToLibrary} onOpenChange={(open) => !open && setPremixToSendToLibrary(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Отправить премикс в библиотеку?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Вы уверены, что хотите отправить премикс "{premixToSendToLibrary ? buildProductDisplayName(premixToSendToLibrary.name, premixToSendToLibrary.bottleVolumeMl) : ''}" в общую библиотеку? 
                            После этого он станет доступен всем пользователям, но вы больше не сможете его редактировать.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPremixToSendToLibrary(null)}>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmSendToLibrary}
                            disabled={isSendingToLibrary}
                        >
                            {isSendingToLibrary ? 'Отправка...' : 'Отправить в библиотеку'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

