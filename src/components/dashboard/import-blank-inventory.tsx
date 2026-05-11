'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/contexts/products-context';
import { useSessions } from '@/contexts/sessions-context';
import type { InventorySession } from '@/lib/types';
import { useAuthSession, getWorkingBarId, canMutateWorkspace } from '@/contexts/auth-context';
import { Loader2, Upload } from 'lucide-react';

export function ImportBlankInventory() {
  const { toast } = useToast();
  const router = useRouter();
  const { refresh } = useProducts();
  const { refresh: refreshSessions, addSession } = useSessions();
  const { user } = useAuthSession();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [pendingUpload, setPendingUpload] = React.useState<{
    file: File;
    hash: string;
  } | null>(null);

  const barId = getWorkingBarId(user);
  const allowMutate = canMutateWorkspace(user);

  const runUpload = async (file: File, confirmDuplicate: boolean): Promise<boolean> => {
    const fd = new FormData();
    fd.set('file', file);
    if (confirmDuplicate) fd.set('confirmDuplicate', 'true');

    const res = await fetch('/api/inventory/import-blank', {
      method: 'POST',
      body: fd,
    });
    const json = await res.json();

    if (!confirmDuplicate && json.duplicateList && json.importListHash) {
      setPendingUpload({ file, hash: json.importListHash });
      return false;
    }

    if (!res.ok || json?.ok !== true) {
      throw new Error(json?.error ?? json?.hint ?? 'Не удалось импортировать');
    }

    if (barId && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`barboss_products_cache_${barId}`);
      } catch {
        /* ignore */
      }
    }

    refresh();
    if (json.sessionId) {
      const detailRes = await fetch(`/api/sessions/${json.sessionId}`, { cache: 'no-store' });
      const detailJson = await detailRes.json();
      if (detailRes.ok && detailJson?.session) {
        addSession(detailJson.session as InventorySession);
      } else {
        refreshSessions();
      }
    } else {
      refreshSessions();
    }
    toast({
      title: 'Бланк импортирован',
      description:
        json.createdProducts > 0
          ? `Сессия создана: новых позиций в каталоге — ${json.createdProducts}. Откройте и заполните остатки.`
          : 'Сессия создана из того же списка: добавлены только строки инвентаризации.',
    });
    if (json.sessionId) router.push(`/dashboard/sessions/${json.sessionId}`);
    setPendingUpload(null);
    return true;
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);
    try {
      await runUpload(file, false);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Ошибка импорта',
        description: err instanceof Error ? err.message : 'Попробуйте CSV или XLSX.',
      });
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const confirmDuplicateUpload = async () => {
    if (!pendingUpload) return;
    setIsUploading(true);
    try {
      await runUpload(pendingUpload.file, true);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Ошибка импорта',
        description: err instanceof Error ? err.message : 'Не удалось импортировать',
      });
    } finally {
      setIsUploading(false);
      setPendingUpload(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.pdf,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={onPickFile}
      />
      <Button
        variant="outline"
        type="button"
        disabled={!user || isUploading || !allowMutate}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        Загрузить бланк
      </Button>

      <AlertDialog open={Boolean(pendingUpload)} onOpenChange={(o) => !o && !isUploading && setPendingUpload(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Повтор той же номенклатуры?</AlertDialogTitle>
            <AlertDialogDescription>
              Список позиций совпадает с уже загружённым ранее. Продолжить? Будут созданы новая инвентаризация и
              только недостающие карточки; существующие продукты не изменятся.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUploading}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDuplicateUpload} disabled={isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> : null}
              Продолжить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
