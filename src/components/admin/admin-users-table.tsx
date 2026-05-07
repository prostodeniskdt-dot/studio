'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { MoreHorizontal, User as UserIcon, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';

interface AdminUsersTableProps {
  users: UserProfile[];
}

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  const { user: adminUser } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [processingUserId, setProcessingUserId] = React.useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleBanToggle = (e: React.MouseEvent, user: UserProfile) => {
    e.stopPropagation(); // Prevent row click event
    if (!adminUser || adminUser.uid === user.id) return;

    setProcessingUserId(user.id);
    const newBanStatus = !user.isBanned;
    (async () => {
      try {
        const token = await adminUser.getIdToken();
        const res = await fetch(`/api/admin/users/${user.id}`, {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isBanned: newBanStatus }),
        });
        const json = await res.json();
        if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed');
        toast({ title: newBanStatus ? "Пользователь заблокирован" : "Пользователь разблокирован" });
      } catch {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось изменить статус пользователя.' });
      } finally {
        setProcessingUserId(null);
      }
    })();
  };

  const handleRowClick = (userId: string) => {
    router.push(`/dashboard/admin/users/${userId}`);
  };

  const columns: ColumnDef<UserProfile>[] = [
    {
      accessorKey: 'displayName',
      header: 'Пользователь',
      cell: ({ row }) => {
        const user = row.original;
        const name = user.displayName;
        const email = user.email;
        const avatarUrl = email ? `https://avatar.vercel.sh/${email}.png` : undefined;
        const initials = name ? name.split(' ').map(n => n[0]).join('') : <UserIcon/>;

        return (
            <div className="flex items-center gap-4">
                 <Avatar>
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={name || 'avatar'} />}
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                    <div className="font-medium">{name || 'Имя не указано'}</div>
                    <div className="text-sm text-muted-foreground">{email || 'Email не найден'}</div>
                </div>
            </div>
        )
      },
    },
    {
        accessorKey: 'establishment',
        header: 'Заведение',
        cell: ({ row }) => {
            const user = row.original;
            return (
                <div>
                    <div className="font-medium">{user.establishment || '-'}</div>
                    <div className="text-sm text-muted-foreground">{user.city || '-'}</div>
                </div>
            )
        }
    },
    {
        accessorKey: 'phone',
        header: 'Контакты',
        cell: ({ row }) => {
            const user = row.original;
            return (
                <div>
                    <div>{user.phone || '-'}</div>
                    {user.socialLink && <a href={user.socialLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">Соцсеть</a>}
                </div>
            )
        }
    },
    {
      accessorKey: 'isBanned',
      header: 'Статус',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Badge variant={user.isBanned ? 'destructive' : 'default'}>
            {user.isBanned ? 'Заблокирован' : 'Активен'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Действия',
      cell: ({ row }) => {
        const user = row.original;
        const isSelf = adminUser?.uid === user.id;
        const isProcessing = processingUserId === user.id;
        
        return (
          <div className="flex items-center justify-end gap-2">
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-muted-foreground">{user.isBanned ? 'Заблокирован' : 'Активен'}</span>
                <Switch
                  checked={!!user.isBanned}
                  onCheckedChange={(checked) => handleBanToggle(new MouseEvent('click') as any, user)}
                  disabled={isSelf || isProcessing}
                  aria-label={user.isBanned ? 'Разблокировать пользователя' : 'Заблокировать пользователя'}
                />
              </div>
            )}
             <Button variant="ghost" size="icon" asChild>
                <Link href={`/dashboard/admin/users/${user.id}`} onClick={(e) => e.stopPropagation()}>
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
        <div className="flex items-center justify-between py-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Управление пользователями</h1>
                <p className="text-muted-foreground">Просмотр и блокировка учетных записей пользователей.</p>
            </div>
        </div>
        {isMobile ? (
          <div className="space-y-3">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const profile = row.original;
                const isSelf = adminUser?.uid === profile.id;
                const isProcessing = processingUserId === profile.id;
                const name = profile.displayName || 'Имя не указано';
                const email = profile.email || 'Email не найден';
                const avatarUrl = profile.email ? `https://avatar.vercel.sh/${profile.email}.png` : undefined;
                const initials = profile.displayName ? profile.displayName.split(' ').map(n => n[0]).join('') : '??';
                return (
                  <Card key={profile.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar>
                            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{name}</div>
                            <div className="text-sm text-muted-foreground truncate">{email}</div>
                          </div>
                        </div>
                        <Badge variant={profile.isBanned ? 'destructive' : 'default'} className="flex-shrink-0">
                          {profile.isBanned ? 'Заблокирован' : 'Активен'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-muted-foreground">Заведение</div>
                          <div className="font-medium truncate">{profile.establishment || '-'}</div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-muted-foreground">Город</div>
                          <div className="font-medium truncate">{profile.city || '-'}</div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-muted-foreground">Телефон</div>
                          <div className="font-medium truncate">{profile.phone || '-'}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          className="h-11 flex-1"
                          onClick={() => handleRowClick(profile.id)}
                        >
                          Открыть
                        </Button>
                        <div className="flex items-center gap-2">
                          {isProcessing ? (
                            <div className="h-11 w-11 flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            <Switch
                              checked={!!profile.isBanned}
                              onCheckedChange={(checked) => {
                                // preserve original handler semantics
                                handleBanToggle(new MouseEvent('click') as any, profile as any);
                              }}
                              disabled={isSelf || isProcessing}
                              aria-label={profile.isBanned ? 'Разблокировать пользователя' : 'Заблокировать пользователя'}
                            />
                          )}
                        </div>
                        <Button variant="ghost" className="h-11" onClick={() => handleRowClick(profile.id)}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Пользователи не найдены.
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
              <Table>
              <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                      return (
                          <TableHead key={header.id}>
                          {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                              )}
                          </TableHead>
                      );
                      })}
                  </TableRow>
                  ))}
              </TableHeader>
              <TableBody>
                  {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} onClick={() => handleRowClick(row.original.id)} className="cursor-pointer">
                      {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                          {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                          )}
                          </TableCell>
                      ))}
                      </TableRow>
                  ))
                  ) : (
                  <TableRow>
                      <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                      >
                      Пользователи не найдены.
                      </TableCell>
                  </TableRow>
                  )}
              </TableBody>
              </Table>
          </div>
        )}
    </>
  );
}
