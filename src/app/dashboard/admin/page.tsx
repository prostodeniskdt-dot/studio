'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { AdminUsersTable } from '@/components/admin/admin-users-table';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';


export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Reference to the admin role document for the current user.
  const adminRoleRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'roles_admin', user.uid) : null, 
    [firestore, user]
  );
  
  const { data: adminRoleDoc, isLoading: isAdminRoleLoading, error: adminRoleError } = useDoc(adminRoleRef);
  
  const isAuthorizedAdmin = !isAdminRoleLoading && !adminRoleError && adminRoleDoc !== null;

  // Effect to handle redirection if the user is not an admin.
  React.useEffect(() => {
    const allLoadsFinished = !isUserLoading && !isAdminRoleLoading;
    
    // If all data is loaded and the user is determined not to be an admin (or there was an error), redirect.
    if (allLoadsFinished && !isAuthorizedAdmin) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, isAuthorizedAdmin, isAdminRoleLoading, router]);

  // The query for users should only be constructed if the user is a confirmed admin.
  const usersQuery = useMemoFirebase(() =>
    firestore && isAuthorizedAdmin ? query(collection(firestore, 'users')) : null,
    [firestore, isAuthorizedAdmin]
  );
  
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useCollection<UserProfile>(usersQuery);

  // Show a top-level loader while checking user auth and admin role.
  if (isUserLoading || isAdminRoleLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // If there was an error fetching the admin role, show a specific error message.
  if (adminRoleError) {
    return (
      <Alert variant="destructive" className="max-w-xl mx-auto">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Ошибка проверки прав администратора</AlertTitle>
        <AlertDescription>
          <p>Не удалось проверить ваш статус администратора. Это может быть связано с проблемой правил безопасности или конфигурации проекта.</p>
          <p className="mt-2 text-xs">Детали: {adminRoleError.message}</p>
          <p className="mt-2 text-xs">Убедитесь, что правила Firestore развернуты, и ваш проект (`projectId`) в коде совпадает с проектом в Firebase CLI.</p>
        </AlertDescription>
      </Alert>
    )
  }

  // This block will render if loads are finished but the user is not an admin,
  // just before the useEffect redirects them.
  if (!isAuthorizedAdmin) {
    return (
       <div className="flex justify-center items-center h-full">
        <p>У вас нет прав для доступа к этой странице. Вы будете перенаправлены...</p>
      </div>
    )
  }

  // If the user is an admin, show the main content.
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
