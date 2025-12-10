'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { MoreHorizontal, User, Trash2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { Badge } from '@/components/ui/badge';
import type { BarMember } from '@/lib/types';
import { translateRole } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
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
import { useToast } from '@/hooks/use-toast';
import { removeStaffMember } from '@/lib/actions';
import { AddStaffDialog } from './add-staff-dialog';

interface StaffTableProps {
    staff: BarMember[];
    barId: string;
}

export function StaffTable({ staff, barId }: StaffTableProps) {
  const { toast } = useToast();
  const [memberToDelete, setMemberToDelete] = React.useState<BarMember | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);

  const handleDeleteClick = (member: BarMember) => {
    setMemberToDelete(member);
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;
    try {
      const result = await removeStaffMember(barId, memberToDelete.userId);
      if (result.success) {
        toast({
          title: 'Сотрудник удален',
          description: `Пользователь ${memberToDelete.userProfile?.email} был удален из вашего бара.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить сотрудника.',
      });
    } finally {
      setMemberToDelete(null);
    }
  };

  const columns: ColumnDef<BarMember>[] = [
    {
      accessorKey: 'userProfile.displayName',
      header: 'Сотрудник',
      cell: ({ row }) => {
        const member = row.original;
        const name = member.userProfile?.displayName;
        const email = member.userProfile?.email;
        const avatarUrl = email ? `https://avatar.vercel.sh/${email}.png` : undefined;
        const initials = name ? name.split(' ').map(n => n[0]).join('') : <User/>;

        return (
            <div className="flex items-center gap-4">
                 <Avatar>
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                    <div className="font-medium">{name || 'Имя не указано'}</div>
                    <div className="text-sm text-muted-foreground">{email}</div>
                </div>
            </div>
        )
      },
    },
    {
      accessorKey: 'role',
      header: 'Роль',
      cell: ({ row }) => {
          const role = row.getValue('role') as BarMember['role'];
          return (
             <Badge variant="outline">{translateRole(role)}</Badge>
          )
      }
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const member = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Открыть меню</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Действия</DropdownMenuLabel>
                <DropdownMenuItem disabled>Изменить роль</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className={"text-destructive focus:text-destructive"}
                  onClick={() => handleDeleteClick(member)}
                 >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить из бара
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: staff,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full">
        <div className="flex items-center justify-between py-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Персонал</h1>
                <p className="text-muted-foreground">Управляйте командой вашего бара и их ролями.</p>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Пригласить сотрудника
            </Button>
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
                    <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    >
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
                    В вашем баре пока нет сотрудников.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      <AddStaffDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} barId={barId} />
      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Вы собираетесь удалить сотрудника <span className="font-semibold">{memberToDelete?.userProfile?.displayName}</span> из вашего бара. Это действие нельзя отменить.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Удалить</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
