'use client';

import Link from "next/link";
import type { InventorySession } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, translateStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, MoreVertical, Trash2, Loader2 } from "lucide-react";
import { Timestamp, doc, deleteDoc, writeBatch, getDocs, collection } from "firebase/firestore";
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
import { useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

type SessionsListProps = {
  sessions: InventorySession[];
  barId: string;
};

export function SessionsList({ sessions, barId }: SessionsListProps) {
  const [sessionToDelete, setSessionToDelete] = React.useState<InventorySession | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

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
  };

  const confirmDelete = async () => {
    if (!sessionToDelete || !barId || !firestore) return;

    setIsDeleting(true);
    const sessionRef = doc(firestore, 'bars', barId, 'inventorySessions', sessionToDelete.id);
    
    try {
        // We will only delete the session document.
        // The subcollection of lines will become "orphaned" but inaccessible,
        // which is secure. A backend cleanup function could be implemented later if needed.
        await deleteDoc(sessionRef);
        
        toast({ title: "Инвентаризация удалена." });
        setSessionToDelete(null); // Close dialog on success

    } catch (serverError: any) {
        // If deleting the session fails, emit the permission error
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: sessionRef.path,
            operation: 'delete'
        }));
    } finally {
        // This will run regardless of success or failure, ensuring the loading state is always reset.
        setIsDeleting(false);
    }
  };


  if (!sessions) {
    return <div className="text-center text-muted-foreground py-10">Загрузка инвентаризаций...</div>;
  }
  
  if (sessions.length === 0) {
    return <div className="text-center text-muted-foreground py-10">Инвентаризаций пока нет. Начните первую!</div>;
  }


  return (
    <>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <Card key={session.id} className="flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg pr-2">{session.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusVariant(session.status)} className="capitalize whitespace-nowrap">
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
                {session.status === 'in_progress' ? 'Продолжить' : 'Смотреть'} инвентаризацию
                <ArrowRight className="ml-auto" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
     <AlertDialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь безвозвратно удалить инвентаризацию "{sessionToDelete?.name}". Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
