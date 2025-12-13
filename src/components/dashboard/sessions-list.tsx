'use client';

import Link from "next/link";
import type { InventorySession } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, translateStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, MoreVertical, Trash2, Loader2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";
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
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { deleteSessionWithLines } from "@/lib/actions";

type SessionsListProps = {
  sessions: InventorySession[];
  barId: string;
};

export function SessionsList({ sessions, barId }: SessionsListProps) {
  const [sessionToDeleteId, setSessionToDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const sessionToDelete = React.useMemo(
    () => sessions.find(s => s.id === sessionToDeleteId) ?? null,
    [sessions, sessionToDeleteId]
  );
  
  // Safeguard: if the session to delete disappears from the list (e.g. deleted in another tab), close the dialog.
  React.useEffect(() => {
    if (!sessionToDeleteId) return;
    if (!sessions.some(s => s.id === sessionToDeleteId)) {
        setSessionToDeleteId(null);
    }
  }, [sessions, sessionToDeleteId]);


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
    setSessionToDeleteId(session.id);
  };

  const confirmDelete = async () => {
    if (!sessionToDeleteId || !barId || !firestore) return;
    
    const idToDelete = sessionToDeleteId;
    
    // Close the dialog immediately to prevent UI race conditions
    setSessionToDeleteId(null);
    setIsDeleting(true);

    try {
        await deleteSessionWithLines(firestore, barId, idToDelete);
        toast({ title: "Инвентаризация удалена." });
    } catch (e: any) {
        toast({ 
            variant: "destructive", 
            title: "Не удалось удалить инвентаризацию", 
            description: e?.message ?? "Произошла неизвестная ошибка."
        });
    } finally {
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
     <AlertDialog open={!!sessionToDeleteId} onOpenChange={(open) => !open && setSessionToDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь безвозвратно удалить инвентаризацию "{sessionToDelete?.name}" и все связанные с ней данные. Это действие нельзя отменить.
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
