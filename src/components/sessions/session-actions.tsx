'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  onExportCSV: () => void;
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
  onExportCSV,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
}: SessionActionsProps) {
  if (!isEditable) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onAddProduct} className="transition-all duration-200">
          <PlusCircle className="mr-2 h-4 w-4"/>
          Добавить продукт
        </Button>
        <Button variant="outline" onClick={onExportCSV} className="transition-all duration-200">
          <Download className="mr-2 h-4 w-4" />
          Экспорт в CSV
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="transition-all duration-200">
              Импорт/Экспорт
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={onImportClick} className="transition-colors">
              <Upload className="mr-2 h-4 w-4" />
              <span>Импорт из CSV</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportCSV} className="transition-colors">
              <Download className="mr-2 h-4 w-4" />
              <span>Экспорт в CSV</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          onClick={onSave} 
          variant="outline" 
          disabled={!hasUnsavedChanges || isSaving}
          className="transition-all duration-200"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={isCompleting} className="transition-all duration-200">
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
              <Trash2 className="mr-2 h-4 w-4"/>
              Удалить инвентаризацию
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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

