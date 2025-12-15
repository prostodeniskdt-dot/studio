'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { MoreHorizontal, User as UserIcon, Trash2, Loader2 } from 'lucide-react';
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
import { useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';

interface AdminUsersTableProps {
  users: UserProfile[];
}

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  const { user: adminUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [processingUserId, setProcessingUserId] = React.useState<string | null>(null);

  const handleBanToggle = (user: UserProfile) => {
    if (!firestore || !adminUser || adminUser.uid === user.id) return;

    setProcessingUserId(user.id);
    const userRef = doc(firestore, 'users', user.id);
    const newBanStatus = !user.isBanned;

    updateDoc(userRef, { isBanned: newBanStatus })
      .then(() => {
        toast({ title: newBanStatus ? "Пользователь заблокирован" : "Пользователь разблокирован" });
      })
      .catch((error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: { isBanned: newBanStatus }
        }));
      })
      .finally(() => {
        setProcessingUserId(null);
      });
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
      header: 'Блокировка',
      cell: ({ row }) => {
        const user = row.original;
        const isSelf = adminUser?.uid === user.id;
        const isProcessing = processingUserId === user.id;
        
        return (
          <div className="flex items-center justify-center gap-2">
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Switch
                checked={!!user.isBanned}
                onCheckedChange={() => handleBanToggle(user)}
                disabled={isSelf || isProcessing}
                aria-label={user.isBanned ? 'Разблокировать пользователя' : 'Заблокировать пользователя'}
              />
            )}
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
                    <TableRow key={row.id}>
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
    </>
  );
}
