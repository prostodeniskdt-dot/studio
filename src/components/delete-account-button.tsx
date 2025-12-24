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
import { useAuth, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export function DeleteAccountButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
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
      if (firestore && auth?.currentUser) {
        // Создать документ запроса на удаление
        await addDoc(collection(firestore, 'deletion_requests'), {
          userId: auth.currentUser.uid,
          requestedAt: serverTimestamp(),
          status: 'pending',
        });

        toast({
          title: 'Запрос отправлен',
          description: 'Ваш запрос на удаление аккаунта отправлен. Мы обработаем его в течение 30 дней.',
        });

        // Выйти из аккаунта
        await signOut(auth);
        router.push('/');
      }
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

