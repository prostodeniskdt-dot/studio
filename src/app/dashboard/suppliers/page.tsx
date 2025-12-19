'use client';

import * as React from 'react';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SuppliersTable } from '@/components/suppliers/suppliers-table';
import { useSuppliers } from '@/contexts/suppliers-context';

export default function SuppliersPage() {
  const { user } = useUser();
  const barId = user ? `bar_${user.uid}` : null;

  const { suppliers, isLoading, error } = useSuppliers();

  if (isLoading || !barId) {
    return (
      <div className="w-full space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
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
