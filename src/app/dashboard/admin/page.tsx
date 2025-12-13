'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { AdminUsersTable } from '@/components/admin/admin-users-table';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Простая и надежная проверка администратора по email
  const isAuthorizedAdmin = !isUserLoading && user?.email === 'prostodeniskdt@gmail.com';

  React.useEffect(() => {
    // Если загрузка пользователя завершена и он не является админом, перенаправляем его
    if (!isUserLoading && !isAuthorizedAdmin) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, isAuthorizedAdmin, router]);

  // Запрос пользователей будет выполнен только после подтверждения прав администратора
  const usersQuery = useMemoFirebase(() =>
    firestore && isAuthorizedAdmin ? query(collection(firestore, 'users')) : null,
    [firestore, isAuthorizedAdmin]
  );
  
  const { data: users, isLoading: isLoadingUsers, error } = useCollection<UserProfile>(usersQuery);

  const showLoader = isUserLoading;

  if (showLoader) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // Этот блок будет показан кратковременно перед редиректом
  if (!isAuthorizedAdmin) {
    return (
       <div className="flex justify-center items-center h-full">
        <p>У вас нет прав для доступа к этой странице.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md">
        <p>Не удалось загрузить пользователей.</p>
        <p className="text-xs">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {isLoadingUsers ? (
         <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
      ) : (
        <AdminUsersTable users={users || []} />
      )}
    </div>
  );
}
