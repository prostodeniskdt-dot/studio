'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PlusCircle, Save, MoreVertical, Trash2, Download, Upload, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SessionActionsProps {
  isEditable: boolean;
  isSaving: boolean;
  isCompleting: boolean;
  isDeleting: boolean;
  deleteProgress: number;
  hasUnsavedChanges: boolean;
  sessionName?: string;
  onAddProduct: () => void;
  onSave: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onImportClick: () => void;
  /** mirror — формат как при последнем импорте; иначе явный тип файла */
  onSessionExport: (mode: 'mirror' | 'csv' | 'xlsx' | 'pdf') => void | Promise<void>;
  /** Подпись основной кнопки экспорта (зеркало последнего импорта). */
  exportButtonLabel?: string;
  isImporting?: boolean;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
}

export function SessionActions({
  isEditable,
  isSaving,
  isCompleting,
  isDeleting,
  deleteProgress,
  hasUnsavedChanges,
  sessionName,
  onAddProduct,
  onSave,
  onComplete,
  onDelete,
  onImportClick,
  onSessionExport,
  exportButtonLabel = 'Экспорт в CSV',
  isImporting = false,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
}: SessionActionsProps) {
  const isMobile = useIsMobile();

  if (!isEditable) {
    return null;
  }

  const completeDialog = (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          disabled={isCompleting}
          className={`transition-all duration-200 ${isMobile ? 'h-11 w-full' : ''}`}
        >
          {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Завершить
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Завершить инвентаризацию?</AlertDialogTitle>
          <AlertDialogDescription>
            Все несохраненные изменения будут автоматически сохранены. После завершения вы не сможете вносить правки и будете перенаправлены на страницу отчета.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={onComplete}>Завершить</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <>
      {isMobile ? (
        <div className="mb-4 flex w-full min-w-0 flex-col gap-2 pb-safe">
          <Button variant="outline" onClick={onAddProduct} className="h-11 w-full shrink-0 transition-all duration-200">
            <PlusCircle className="mr-2 h-4 w-4" />
            Добавить продукт
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 w-full transition-all duration-200">
                <Download className="mr-2 h-4 w-4" />
                Экспорт / импорт
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[min(100vw-2rem,20rem)]">
              <DropdownMenuItem onSelect={() => void onSessionExport('mirror')}>
                <Download className="mr-2 h-4 w-4" />
                <div className="flex flex-col gap-0.5">
                  <span>{exportButtonLabel}</span>
                  <span className="text-xs font-normal text-muted-foreground">Как при последнем импорте</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onSessionExport('xlsx')}>
                <Download className="mr-2 h-4 w-4" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onSessionExport('csv')}>
                <Download className="mr-2 h-4 w-4" />
                CSV (UTF-8)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onSessionExport('pdf')}>
                <Download className="mr-2 h-4 w-4" />
                PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onImportClick} disabled={isImporting}>
                {isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {isImporting ? 'Импорт…' : 'Импорт файла'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={onSave}
            variant="outline"
            disabled={!hasUnsavedChanges || isSaving}
            className="h-11 w-full transition-all duration-200"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
          {completeDialog}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 w-full">
                <MoreVertical className="mr-2 h-4 w-4" />
                Ещё
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => setIsDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить инвентаризацию
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onAddProduct} className="transition-all duration-200">
            <PlusCircle className="mr-2 h-4 w-4" />
            Добавить продукт
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="transition-all duration-200">
                <Download className="mr-2 h-4 w-4" />
                Экспорт
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[14rem]">
              <DropdownMenuItem onSelect={() => void onSessionExport('mirror')}>
                <Download className="mr-2 h-4 w-4 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span>{exportButtonLabel}</span>
                  <span className="text-xs font-normal text-muted-foreground">Как при последнем импорте</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void onSessionExport('xlsx')}>
                <Download className="mr-2 h-4 w-4" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onSessionExport('csv')}>
                <Download className="mr-2 h-4 w-4" />
                CSV (UTF-8)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onSessionExport('pdf')}>
                <Download className="mr-2 h-4 w-4" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            disabled={isImporting}
            onClick={onImportClick}
            className="transition-all duration-200"
          >
            {isImporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isImporting ? 'Импорт…' : 'Импорт файла'}
          </Button>

          <Button
            onClick={onSave}
            variant="outline"
            disabled={!hasUnsavedChanges || isSaving}
            className="transition-all duration-200"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
          {completeDialog}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Другие действия</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => setIsDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить инвентаризацию
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь безвозвратно удалить инвентаризацию {sessionName && `"${sessionName}"`} и все связанные с ней данные. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isDeleting && deleteProgress > 0 && deleteProgress < 100 && (
            <div className="flex items-center gap-2">
              <Progress value={deleteProgress} className="w-full" />
              <span className="text-sm text-muted-foreground">{deleteProgress}%</span>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={onDelete} 
              disabled={isDeleting} 
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

