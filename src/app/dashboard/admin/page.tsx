'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { AdminUsersTable } from '@/components/admin/admin-users-table';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Check if the current user has an admin role document.
  const adminRoleRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'roles_admin', user.uid) : null,
    [firestore, user]
  );
  const { data: adminRole, isLoading: isLoadingAdminRole } = useDoc(adminRoleRef);
  
  const isAuthorizedAdmin = adminRole?.isAdmin === true;

  const usersQuery = useMemoFirebase(() =>
    // Only attempt to fetch users if the user is an authorized admin.
    firestore && isAuthorizedAdmin ? query(collection(firestore, 'users')) : null,
    [firestore, isAuthorizedAdmin]
  );
  
  const { data: users, isLoading: isLoadingUsers, error } = useCollection<UserProfile>(usersQuery);

  React.useEffect(() => {
    // If auth/role checks are done and user is not an admin, redirect them.
    if (!isUserLoading && !isLoadingAdminRole && !isAuthorizedAdmin) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, isLoadingAdminRole, isAuthorizedAdmin, router]);

  const showLoader = isUserLoading || isLoadingAdminRole;

  if (showLoader) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!isAuthorizedAdmin) {
    // This state is temporary while the useEffect redirect kicks in.
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
