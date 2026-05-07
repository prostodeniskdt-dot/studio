'use client';

import { useState } from 'react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { signOut } from 'firebase/auth';

export function DeleteAccountButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (confirmText !== 'УДАЛИТЬ') {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Пожалуйста, введите "УДАЛИТЬ" для подтверждения',
      });
      return;
    }

    setIsDeleting(true);
    try {
      if (!auth?.currentUser) throw new Error('Пользователь не найден');
      // TODO: implement Postgres-backed deletion request endpoint.
      toast({
        variant: 'destructive',
        title: 'Функция временно недоступна',
        description: 'Удаление аккаунта сейчас в процессе миграции на Postgres. Напишите в поддержку для удаления.',
      });
    } catch (error) {
      console.error('Failed to create deletion request:', error);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось отправить запрос на удаление. Попробуйте позже.',
      });
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Удалить аккаунт
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удаление аккаунта</AlertDialogTitle>
          <AlertDialogDescription>
            Это действие нельзя отменить. После удаления:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Доступ к аккаунту будет закрыт</li>
              <li>Данные будут удалены или обезличены в течение 30 дней</li>
              <li>Некоторые данные могут храниться дольше, если это требуется по закону</li>
            </ul>
            <p className="mt-4 font-semibold">
              Для подтверждения введите: <strong>УДАЛИТЬ</strong>
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="УДАЛИТЬ"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== 'УДАЛИТЬ'}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Удаление...' : 'Удалить аккаунт'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

