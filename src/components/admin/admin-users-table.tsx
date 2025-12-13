'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { MoreHorizontal, User as UserIcon, Trash2 } from 'lucide-react';
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
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface AdminUsersTableProps {
  users: UserProfile[];
}

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  const [userToDelete, setUserToDelete] = React.useState<UserProfile | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDeleteClick = (user: UserProfile) => {
    setUserToDelete(user);
  };

  const confirmDelete = () => {
    if (!userToDelete || !firestore) return;
    const userRef = doc(firestore, 'users', userToDelete.id);
    
    deleteDoc(userRef)
      .then(() => {
        toast({ title: "Пользователь удален." });
      })
      .catch((error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'delete' }));
      })
      .finally(() => {
        setUserToDelete(null);
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
        accessorKey: 'createdAt',
        header: 'Дата регистрации',
        cell: ({ row }) => {
            const date = (row.getValue('createdAt') as any)?.toDate();
            return date ? date.toLocaleDateString('ru-RU') : 'Неизвестно';
        }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original;
        const isAdmin = user.email === 'prostodeniskdt@gmail.com';
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" disabled={isAdmin}>
                  <span className="sr-only">Открыть меню</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Действия</DropdownMenuLabel>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDeleteClick(user)}
                  disabled={isAdmin}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить пользователя
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                <p className="text-muted-foreground">Просмотр и удаление учетных записей пользователей.</p>
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
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Вы собираетесь безвозвратно удалить пользователя <span className="font-semibold">{userToDelete?.displayName} ({userToDelete?.email})</span>. Это действие нельзя отменить.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Удалить</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
