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

  const usersQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'users')) : null,
    [firestore]
  );
  
  const { data: users, isLoading, error } = useCollection<UserProfile>(usersQuery);

  React.useEffect(() => {
    if (!isUserLoading && user?.email !== 'prostodeniskdt@gmail.com') {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user?.email !== 'prostodeniskdt@gmail.com') {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
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
      {isLoading ? (
         <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
      ) : (
        <AdminUsersTable users={users || []} />
      )}
    </div>
  );
}
