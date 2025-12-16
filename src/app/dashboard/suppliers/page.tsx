'use client';

import * as React from 'react';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { SuppliersTable } from '@/components/suppliers/suppliers-table';
import { useSuppliers } from '@/contexts/suppliers-context';

export default function SuppliersPage() {
  const { user } = useUser();
  const barId = user ? `bar_${user.uid}` : null;

  const { suppliers, isLoading, error } = useSuppliers();

  if (isLoading || !barId) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md">
          <p>Не удалось загрузить данные поставщиков.</p>
          <p className="text-xs">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="w-full">
        <SuppliersTable suppliers={suppliers || []} barId={barId} />
    </div>
  );
}
