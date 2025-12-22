'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { translateStatus } from '@/lib/utils';
import type { InventorySession } from '@/lib/types';
import { Button } from '@/components/ui/button';
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

  const handleViewReport = () => {
    console.log('Opening report for session:', session.id);
    router.push(`/dashboard/sessions/${session.id}/report`);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{session.name}</h1>
          <p className="text-muted-foreground mt-1">
            {session.createdAt && (session.createdAt.toDate ? session.createdAt.toDate().toLocaleDateString('ru-RU') : (session.createdAt instanceof Date ? session.createdAt.toLocaleDateString('ru-RU') : new Date(session.createdAt.toMillis ? session.createdAt.toMillis() : Date.now()).toLocaleDateString('ru-RU')))}
          </p>
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

