'use client';

import Link from "next/link";
import type { InventorySession } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, translateStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, MoreVertical, Trash2, Loader2, Calendar, Circle } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { EmptyState } from "@/components/ui/empty-state";
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
import { deleteSessionWithLinesClient } from "@/lib/firestore-utils";
import { Progress } from "@/components/ui/progress";
import { BarChart3 } from "lucide-react";

type SessionsListProps = {
  sessions: InventorySession[];
  barId: string;
};

export function SessionsList({ sessions, barId }: SessionsListProps) {
  const [sessionToDeleteId, setSessionToDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteProgress, setDeleteProgress] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 9; // 3x3 grid
  const firestore = useFirestore();
  const { toast } = useToast();

  const sessionToDelete = React.useMemo(
    () => sessions.find(s => s.id === sessionToDeleteId) ?? null,
    [sessions, sessionToDeleteId]
  );
  
  const handleOpenDeleteDialog = (e: React.MouseEvent, session: InventorySession) => {
    e.preventDefault(); // Prevent dropdown from closing immediately
    setSessionToDeleteId(session.id);
  };


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

  const confirmDelete = async () => {
    if (!sessionToDeleteId || !barId || !firestore) return;
    
    const idToDelete = sessionToDeleteId;
    
    setIsDeleting(true);
    setDeleteProgress(0);

    try {
        await deleteSessionWithLinesClient(firestore, barId, idToDelete, setDeleteProgress);
        toast({ title: "Инвентаризация удалена." });
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Произошла неизвестная ошибка.";
        toast({ 
            variant: "destructive", 
            title: "Не удалось удалить инвентаризацию", 
            description: errorMessage
        });
    } finally {
        setIsDeleting(false);
        setDeleteProgress(0);
        setSessionToDeleteId(null);
    }
  };


  if (!sessions) {
    return <div className="text-center text-muted-foreground py-10">Загрузка инвентаризаций...</div>;
  }
  
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Инвентаризаций пока нет"
        description="Начните первую инвентаризацию, чтобы отслеживать остатки продуктов в вашем баре."
      />
    );
  }

  const totalPages = Math.ceil(sessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSessions = sessions.slice(startIndex, endIndex);

  return (
    <>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {paginatedSessions.map((session) => (
        <Card key={session.id} className="group relative overflow-hidden flex flex-col animate-fade-in">
          {/* Gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-transparent" />
          
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg pr-2 group-hover:text-primary transition-colors font-semibold">
                {session.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusVariant(session.status)} className="capitalize whitespace-nowrap flex items-center gap-1.5">
                    {session.status === 'in_progress' && (
                      <Circle className="h-2 w-2 fill-current animate-pulse" />
                    )}
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
                        <DropdownMenuItem onClick={(e) => handleOpenDeleteDialog(e, session)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Удалить
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CardDescription className="flex items-center gap-2 mt-2">
              <Calendar className="h-3 w-3" />
              Создано {formatDate(session.createdAt)}
            </CardDescription>
          </CardHeader>
          
          {/* Progress bar for active sessions */}
          {session.status === 'in_progress' && (
            <div className="px-6 pb-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Прогресс</span>
                <span>—</span>
              </div>
              <Progress value={0} className="h-2" />
            </div>
          )}
          
          <div className="flex-grow" />
          <CardFooter className="pt-4">
            <Button 
              asChild 
              variant="ghost" 
              className="w-full group-hover:bg-primary/5 transition-colors"
            >
              <Link href={`/dashboard/sessions/${session.id}`}>
                {session.status === 'in_progress' ? 'Продолжить' : 'Смотреть'} инвентаризацию
                <ArrowRight className="ml-auto h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
    {totalPages > 1 && (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-muted-foreground">
          Показано {startIndex + 1} - {Math.min(endIndex, sessions.length)} из {sessions.length}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev: number) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Назад
          </Button>
          <div className="text-sm text-muted-foreground">
            Страница {currentPage} из {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev: number) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Вперед
          </Button>
        </div>
      </div>
    )}
      <AlertDialog open={!!sessionToDeleteId} onOpenChange={(open) => !open && setSessionToDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь безвозвратно удалить инвентаризацию "{sessionToDelete?.name}" и все связанные с ней данные. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
          {isDeleting && deleteProgress > 0 && (
            <div className="px-6 pb-4">
              <Progress value={deleteProgress} className="w-full" />
              <p className="text-xs text-muted-foreground mt-2 text-center">{deleteProgress}%</p>
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
