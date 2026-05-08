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
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{session.name}</h1>
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

