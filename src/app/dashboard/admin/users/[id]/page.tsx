'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useAuthSession } from '@/contexts/auth-context';
import type { UserProfile, Supplier } from '@/lib/types';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SuppliersTable } from '@/components/suppliers/suppliers-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminUserDetailsPage() {
  const params = useParams();
  const userId = typeof params?.id === 'string' ? params.id : '';
  const { user: adminUser, isLoading: isAuthLoading } = useAuthSession();
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [suppliers, setSuppliers] = React.useState<Supplier[] | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [userMissing, setUserMissing] = React.useState(false);

  const barId = userId ? `bar_${userId}` : null;

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadError(null);
      setUserMissing(false);

      if (isAuthLoading) {
        return;
      }
      if (!adminUser) {
        return;
      }
      if (!userId) {
        if (!cancelled) {
          setUserMissing(true);
          setUserProfile(null);
          setSuppliers([]);
        }
        return;
      }

      setUserProfile(null);
      setSuppliers(null);
      setIsLoadingProfile(true);
      setIsLoadingSuppliers(true);
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.status === 404 || json?.error === 'Not found') {
          setUserProfile(null);
          setSuppliers([]);
          setUserMissing(true);
          return;
        }
        if (!res.ok || json?.ok === false) {
          setLoadError(String(json?.error ?? `HTTP ${res.status}`));
          setUserProfile(null);
          setSuppliers([]);
          return;
        }

        setUserProfile(json.user ?? null);
        setSuppliers(json.suppliers ?? []);
        if (!json.user) {
          setUserMissing(true);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : String(e));
          setUserProfile(null);
          setSuppliers([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
          setIsLoadingSuppliers(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, adminUser, userId]);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!adminUser) {
    return (
      <Alert variant="destructive" className="max-w-xl mx-auto mt-8">
        <AlertTitle>Нет доступа</AlertTitle>
        <AlertDescription>Войдите в аккаунт администратора, чтобы просматривать карточку пользователя.</AlertDescription>
      </Alert>
    );
  }

  const isLoading = isLoadingProfile || isLoadingSuppliers;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto mt-8 space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Не удалось загрузить данные</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к пользователям
          </Link>
        </Button>
      </div>
    );
  }

  if (userMissing || !userProfile) {
    return (
      <div className="max-w-xl mx-auto mt-8 space-y-4">
        <Alert>
          <AlertTitle>Пользователь не найден</AlertTitle>
          <AlertDescription>Запись отсутствует или была удалена.</AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/dashboard/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к пользователям
          </Link>
        </Button>
      </div>
    );
  }

  const initials = userProfile.displayName
    ? userProfile.displayName.split(' ').map((n) => n[0]).join('')
    : '?';
  const avatarUrl = userProfile.email
    ? `https://avatar.vercel.sh/${userProfile.email}.png`
    : undefined;

  return (
    <>
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к пользователям
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userProfile.displayName} />}
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{userProfile.displayName}</CardTitle>
                <CardDescription>{userProfile.email}</CardDescription>
                <div className="mt-2">
                  <Badge variant={userProfile.isBanned ? 'destructive' : 'default'}>
                    {userProfile.isBanned ? 'Заблокирован' : 'Активен'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground">Заведение</dt>
                <dd className="mt-1 text-sm text-foreground">{userProfile.establishment || '-'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground">Город</dt>
                <dd className="mt-1 text-sm text-foreground">{userProfile.city || '-'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground">Телефон</dt>
                <dd className="mt-1 text-sm text-foreground">{userProfile.phone || '-'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground">Соц. сеть</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {userProfile.socialLink ? (
                    <a
                      href={userProfile.socialLink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary hover:underline"
                    >
                      {userProfile.socialLink}
                    </a>
                  ) : (
                    '-'
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Поставщики бара</CardTitle>
            <CardDescription>Список поставщиков, добавленных этим пользователем.</CardDescription>
          </CardHeader>
          <CardContent>
            {barId ? (
              <SuppliersTable suppliers={suppliers || []} barId={barId} />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
