'use client';
import * as React from 'react';
import { useParams, notFound } from 'next/navigation';
import { useAuthSession } from '@/contexts/auth-context';
import type { UserProfile, Supplier } from '@/lib/types';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SuppliersTable } from '@/components/suppliers/suppliers-table';

export default function AdminUserDetailsPage() {
  const params = useParams();
  const userId = params.id as string;
  const { user: adminUser } = useAuthSession();
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [suppliers, setSuppliers] = React.useState<Supplier[] | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = React.useState(false);

  const barId = userId ? `bar_${userId}` : null;

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!adminUser) return;
      setIsLoadingProfile(true);
      setIsLoadingSuppliers(true);
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed');
        if (!cancelled) {
          setUserProfile(json.user ?? null);
          setSuppliers(json.suppliers ?? []);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
          setIsLoadingSuppliers(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [adminUser, userId]);


  const isLoading = isLoadingProfile || isLoadingSuppliers;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userProfile) {
    if (!isLoadingProfile) {
      notFound();
    }
    return null;
  }
  
  const initials = userProfile.displayName ? userProfile.displayName.split(' ').map(n => n[0]).join('') : '?';
  const avatarUrl = userProfile.email ? `https://avatar.vercel.sh/${userProfile.email}.png` : undefined;

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
                    <dd className="mt-1 text-sm text-foreground">{userProfile.socialLink ? <a href={userProfile.socialLink} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline">{userProfile.socialLink}</a> : '-'}</dd>
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
                <SuppliersTable suppliers={suppliers || []} barId={barId!} />
            </CardContent>
        </Card>
      </div>
    </>
  )
}
