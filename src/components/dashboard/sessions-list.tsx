'use client';

import Link from "next/link";
import type { InventorySession } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, translateStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, MoreVertical, Trash2 } from "lucide-react";
import { Timestamp, doc, deleteDoc } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as React from "react";


type SessionsListProps = {
  sessions: InventorySession[];
  barId: string | null;
};

export function SessionsList({ sessions, barId }: SessionsListProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [sessionToDelete, setSessionToDelete] = React.useState<InventorySession | null>(null);

  const getStatusVariant = (status: InventorySession['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'draft':
        return 'outline';
      default:
        return 'default';
    }
  };
  
  const formatDate = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'Неверная дата';
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString('ru-RU');
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('ru-RU');
    }
    return 'Неверная дата';
  }

  const handleDeleteClick = (session: InventorySession) => {
    setSessionToDelete(session);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete || !barId || !firestore) {
        toast({ variant: "destructive", title: "Ошибка", description: "Не удалось удалить сессию." });
        return;
    }
    try {
        const sessionRef = doc(firestore, 'bars', barId, 'inventorySessions', sessionToDelete.id);
        await deleteDoc(sessionRef);
        toast({ title: "Сессия удалена", description: `Сессия "${sessionToDelete.name}" была успешно удалена.` });
    } catch (error) {
        toast({ variant: "destructive", title: "Ошибка", description: "При удалении сессии произошла ошибка." });
    } finally {
        setDialogOpen(false);
        setSessionToDelete(null);
    }
  };


  return (
    <>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <Card key={session.id} className="flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg pr-2">{session.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusVariant(session.status)} className="capitalize">
                    {translateStatus(session.status)}
                </Badge>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Открыть меню</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDeleteClick(session)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Удалить
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CardDescription>
              Создано {formatDate(session.createdAt)}
            </CardDescription>
          </CardHeader>
          <div className="flex-grow" />
          <CardFooter>
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link href={`/dashboard/sessions/${session.id}`}>
                {session.status === 'in_progress' ? 'Продолжить' : 'Смотреть'} сессию
                <ArrowRight className="ml-auto" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
     <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь безвозвратно удалить сессию инвентаризации "{sessionToDelete?.name}". Это действие нельзя отменить.
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
