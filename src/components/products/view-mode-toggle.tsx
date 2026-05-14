'use client';

import * as React from 'react';
import { LayoutGrid, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'cards' | 'table';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

const STORAGE_KEY = 'products_view_mode';

export function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  const handleChange = (mode: ViewMode) => {
    onChange(mode);
    // Сохранить в localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch (e) {
        // Игнорировать ошибки localStorage
      }
    }
  };

  return (
    <div className={cn("flex items-center gap-1 border rounded-md p-1 bg-background", className)}>
      <Button
        variant={value === 'cards' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleChange('cards')}
        className={cn(
          "flex items-center gap-2",
          value === 'cards' && "shadow-sm"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Карточки</span>
      </Button>
      <Button
        variant={value === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleChange('table')}
        className={cn(
          "flex items-center gap-2",
          value === 'table' && "shadow-sm"
        )}
      >
        <Table className="h-4 w-4" />
        <span className="hidden sm:inline">Таблица</span>
      </Button>
    </div>
  );
}

// Хук для получения сохраненного режима просмотра из localStorage
export function useViewMode(defaultMode: ViewMode = 'cards'): ViewMode {
  const [mode, setMode] = React.useState<ViewMode>(defaultMode);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
        if (saved === 'cards' || saved === 'table') {
          setMode(saved);
        }
      } catch (e) {
        // Игнорировать ошибки localStorage
      }
    }
  }, []);

  return mode;
}

