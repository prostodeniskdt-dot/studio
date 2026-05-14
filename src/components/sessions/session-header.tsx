'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { translateStatus } from '@/lib/utils';
import type { InventorySession } from '@/lib/types';
import { Circle } from 'lucide-react';

interface SessionHeaderProps {
  session: InventorySession;
  isEditable: boolean;
}

export function SessionHeader({ session, isEditable }: SessionHeaderProps) {
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

  const createdAtText = React.useMemo(() => {
    const v: any = session.createdAt;
    if (!v) return '';
    const d = v instanceof Date ? v : typeof v === 'string' ? new Date(v) : null;
    return d ? d.toLocaleDateString('ru-RU') : '';
  }, [session.createdAt]);

  return (
    <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl break-words">{session.name}</h1>
          {createdAtText ? <p className="text-muted-foreground mt-1">{createdAtText}</p> : null}
        </div>
        <Badge variant={getStatusVariant(session.status)} className="capitalize text-base px-3 py-1 flex items-center gap-1.5">
          {session.status === 'in_progress' && (
            <Circle className="h-2 w-2 fill-current animate-pulse" />
          )}
          {translateStatus(session.status)}
        </Badge>
      </div>
    </div>
  );
}

