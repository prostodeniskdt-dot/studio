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

  // Reference to the admin role document for the current user.
  const adminRoleRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'roles_admin', user.uid) : null, 
    [firestore, user]
  );
  
  // Hook to fetch the admin role document. isLoading is true while fetching.
  // data will be null if the document does not exist, or the document data if it exists.
  const { data: adminRoleDoc, isLoading: isAdminRoleLoading } = useDoc(adminRoleRef);
  
  // Derived state to determine if the user is an authorized admin.
  // This is only true AFTER loading is complete AND the document exists.
  const isAuthorizedAdmin = !isAdminRoleLoading && adminRoleDoc !== null;

  // Effect to handle redirection if the user is not an admin.
  React.useEffect(() => {
    const allLoadsFinished = !isUserLoading && !isAdminRoleLoading;
    
    // If all data is loaded and the user is determined not to be an admin, redirect.
    if (allLoadsFinished && !isAuthorizedAdmin) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, isAuthorizedAdmin, isAdminRoleLoading, router]);

  // The query for users should only be constructed if the user is a confirmed admin.
  const usersQuery = useMemoFirebase(() =>
    firestore && isAuthorizedAdmin ? query(collection(firestore, 'users')) : null,
    [firestore, isAuthorizedAdmin]
  );
  
  const { data: users, isLoading: isLoadingUsers, error } = useCollection<UserProfile>(usersQuery);

  // Show a top-level loader while checking user auth and admin role.
  if (isUserLoading || isAdminRoleLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // This block will render if loads are finished but the user is not an admin,
  // just before the useEffect redirects them.
  if (!isAuthorizedAdmin) {
    return (
       <div className="flex justify-center items-center h-full">
        <p>У вас нет прав для доступа к этой странице.</p>
      </div>
    )
  }

  // If the user is an admin, show the main content.
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
