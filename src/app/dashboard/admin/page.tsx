'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { AdminUsersTable } from '@/components/admin/admin-users-table';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Info } from 'lucide-react';
import Link from 'next/link';


export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // --- ВСЕ ХУКИ ПЕРЕМЕЩЕНЫ ВВЕРХ ---

  // Хук для получения роли администратора
  const adminRoleRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'roles_admin', user.uid) : null, 
    [firestore, user]
  );
  const { data: adminRoleDoc, isLoading: isAdminRoleLoading, error: adminRoleError } = useDoc(adminRoleRef);
  
  // Хук для получения списка всех пользователей (выполняется всегда, если есть firestore)
  const usersQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'users')) : null,
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useCollection<UserProfile>(usersQuery);

  // --- КОНЕЦ БЛОКА ХУКОВ ---


  const isAuthorizedAdmin = adminRoleDoc !== null;

  // Условная логика рендеринга теперь идет ПОСЛЕ всех хуков
  if (isUserLoading || isAdminRoleLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (adminRoleError) {
    return (
      <Alert variant="destructive" className="max-w-xl mx-auto">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Ошибка проверки прав администратора</AlertTitle>
        <AlertDescription>
          <p>Не удалось проверить ваш статус администратора из-за ошибки прав доступа.</p>
          <p className="mt-2 text-xs">Детали: {adminRoleError.message}</p>
          <p className="mt-2 text-xs">Убедитесь, что правила Firestore (`firestore.rules`) развернуты и ваш `projectId` в коде совпадает с проектом в Firebase CLI.</p>
        </AlertDescription>
      </Alert>
    )
  }
  
  // Запрос пользователей запускается только после проверки прав админа
  if (!isAuthorizedAdmin) {
     if (user?.email === 'prostodeniskdt@gmail.com') {
        return (
             <Alert className="max-w-xl mx-auto">
                <Info className="h-4 w-4" />
                <AlertTitle>Роль администратора не активирована</AlertTitle>
                <AlertDescription>
                    <p>Ваша учетная запись имеет право быть администратором, но роль еще не активирована в базе данных.</p>
                    <Button asChild className="mt-4">
                        <Link href="/dashboard/admin/debug">
                            Перейти к активации
                        </Link>
                    </Button>
                </AlertDescription>
            </Alert>
        )
     }
    return (
       <div className="flex justify-center items-center h-full">
        <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Доступ запрещен</AlertTitle>
            <AlertDescription>У вас нет прав для доступа к этой странице.</AlertDescription>
        </Alert>
      </div>
    )
  }

  // --- Отсюда пользователь — авторизованный администратор ---
  
  if (usersError) {
    return (
      <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md">
        <p>Не удалось загрузить пользователей.</p>
        <p className="text-xs">{usersError.message}</p>
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
