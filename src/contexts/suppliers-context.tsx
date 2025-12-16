'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Supplier } from '@/lib/types';
import { logger } from '@/lib/logger';

interface SuppliersContextValue {
  suppliers: Supplier[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

const SuppliersContext = createContext<SuppliersContextValue | undefined>(undefined);

const SUPPLIERS_CACHE_KEY = 'barboss_suppliers_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 минут

interface CachedSuppliers {
  suppliers: Supplier[];
  timestamp: number;
  barId: string;
}

export function SuppliersProvider({ children, barId }: { children: React.ReactNode; barId: string | null }) {
  const firestore = useFirestore();
  const [cache, setCache] = useState<CachedSuppliers | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);

  useEffect(() => {
    if (!barId) return;
    
    try {
      const cached = localStorage.getItem(`${SUPPLIERS_CACHE_KEY}_${barId}`);
      if (cached) {
        const parsed: CachedSuppliers = JSON.parse(cached);
        const now = Date.now();
        if (now - parsed.timestamp < CACHE_EXPIRY_MS && parsed.barId === barId) {
          setCache(parsed);
        } else {
          localStorage.removeItem(`${SUPPLIERS_CACHE_KEY}_${barId}`);
        }
      }
    } catch (e) {
      // Игнорировать ошибки парсинга
    }
  }, [barId]);

  const suppliersQuery = useMemoFirebase(() =>
    firestore && barId ? query(collection(firestore, 'bars', barId, 'suppliers')) : null,
    [firestore, barId, forceRefresh]
  );
  
  const { data: suppliers, isLoading, error } = useCollection<Supplier>(suppliersQuery);

  // Обработка ошибок прав доступа - использовать кэш при ошибке
  useEffect(() => {
    if (error && cache && cache.barId === barId) {
      logger.warn('Permission error loading suppliers, using cache:', error);
      // Не очищаем кэш при ошибке прав доступа, используем его
    }
  }, [error, cache, barId]);

  useEffect(() => {
    if (suppliers && suppliers.length > 0 && barId) {
      const cached: CachedSuppliers = {
        suppliers,
        timestamp: Date.now(),
        barId,
      };
      try {
        localStorage.setItem(`${SUPPLIERS_CACHE_KEY}_${barId}`, JSON.stringify(cached));
        setCache(cached);
      } catch (e) {
        // Игнорировать ошибки сохранения
      }
    }
  }, [suppliers, barId]);

  const refresh = useCallback(() => {
    if (barId) {
      localStorage.removeItem(`${SUPPLIERS_CACHE_KEY}_${barId}`);
    }
    setCache(null);
    setForceRefresh(prev => prev + 1);
  }, [barId]);

  const effectiveSuppliers = React.useMemo(() => 
    suppliers || (cache?.barId === barId ? cache.suppliers : []) || [], 
    [suppliers, cache?.barId, cache?.suppliers, barId]
  );
  const effectiveIsLoading = React.useMemo(() => isLoading && !cache, [isLoading, cache]);

  const value: SuppliersContextValue = React.useMemo(() => ({
    suppliers: effectiveSuppliers,
    isLoading: effectiveIsLoading,
    error: error || null,
    refresh,
  }), [effectiveSuppliers, effectiveIsLoading, error, refresh]);

  return (
    <SuppliersContext.Provider value={value}>
      {children}
    </SuppliersContext.Provider>
  );
}

export function useSuppliers() {
  const context = useContext(SuppliersContext);
  if (context === undefined) {
    throw new Error('useSuppliers must be used within SuppliersProvider');
  }
  return context;
}

