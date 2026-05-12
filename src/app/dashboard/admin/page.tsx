'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useAuthSession } from '@/contexts/auth-context';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Info } from 'lucide-react';
import Link from 'next/link';

// Dynamic import for heavy admin table component
const AdminUsersTable = dynamic(
  () => import('@/components/admin/admin-users-table').then(mod => ({ default: mod.AdminUsersTable })),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);


export default function AdminPage() {
  const { user, isLoading: isUserLoading } = useAuthSession();
  const router = useRouter();
  const [users, setUsers] = React.useState<UserProfile[] | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);
  const [usersError, setUsersError] = React.useState<Error | null>(null);

  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = React.useState<boolean>(false);
  const [adminRoleError, setAdminRoleError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      setIsLoadingUsers(true);
      setUsersError(null);
      setAdminRoleError(null);
      try {
        const res = await fetch('/api/admin/users', {
          cache: 'no-store',
        });
        const json = await res.json();
        if (res.status === 403) {
          if (!cancelled) setIsAuthorizedAdmin(false);
          return;
        }
        if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed to load users');
        if (!cancelled) {
          setIsAuthorizedAdmin(true);
          setUsers(json.users ?? []);
        }
      } catch (e) {
        if (!cancelled) setAdminRoleError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setIsLoadingUsers(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Условная логика рендеринга теперь идет ПОСЛЕ всех хуков
  if (isUserLoading) {
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
     if (user?.profile?.role === 'admin') {
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
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Администрирование</h1>
          <p className="text-muted-foreground mt-2">Управление пользователями и данными</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/admin/products-migration">
            Миграция продуктов
          </Link>
        </Button>
      </div>
      
      {isLoadingUsers ? (
         <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
      ) : (
        <AdminUsersTable
          users={users || []}
          onUserBannedChange={(userId, isBanned) => {
            setUsers((prev) =>
              (prev ?? []).map((u) => (u.id === userId ? { ...u, isBanned } : u))
            );
          }}
        />
      )}
    </div>
  );
}
