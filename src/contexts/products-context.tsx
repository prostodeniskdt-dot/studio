'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { logger } from '@/lib/logger';

interface ProductsContextValue {
  products: Product[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);

const PRODUCTS_CACHE_KEY = 'barboss_products_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 минут

interface CachedProducts {
  products: Product[];
  timestamp: number;
  barId?: string;
}

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const barId = user ? `bar_${user.uid}` : null;
  const [cache, setCache] = useState<CachedProducts | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);

  // Загрузить из localStorage при монтировании
  useEffect(() => {
    if (typeof window === 'undefined' || !barId) return;
    
    try {
      const cached = localStorage.getItem(`${PRODUCTS_CACHE_KEY}_${barId}`);
      if (cached) {
        const parsed: CachedProducts = JSON.parse(cached);
        const now = Date.now();
        if (now - parsed.timestamp < CACHE_EXPIRY_MS && parsed.barId === barId) {
          setCache(parsed);
        } else {
          localStorage.removeItem(`${PRODUCTS_CACHE_KEY}_${barId}`);
        }
      }
    } catch (e) {
      // Игнорировать ошибки парсинга
    }
  }, [barId]);

  // Запрос для глобальных продуктов (алкоголь)
  const globalProductsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'products'), where('isActive', '==', true)) : null,
    [firestore, forceRefresh]
  );
  
  // Запрос для примиксов текущего пользователя
  const premixesQuery = useMemoFirebase(() =>
    firestore && barId ? query(collection(firestore, 'bars', barId, 'premixes'), where('isActive', '==', true)) : null,
    [firestore, barId, forceRefresh]
  );
  
  const { data: globalProducts, isLoading: isLoadingGlobal, error: globalError } = useCollection<Product>(globalProductsQuery);
  const { data: premixes, isLoading: isLoadingPremixes, error: premixesError } = useCollection<Product>(premixesQuery);
  
  // Объединить глобальные продукты и примиксы
  // Если есть ошибка при загрузке примиксов, показываем хотя бы глобальные продукты
  const products = React.useMemo(() => {
    const global = globalProducts || [];
    const localPremixes = (premixesError ? [] : (premixes || [])); // Игнорируем примиксы если ошибка
    return [...global, ...localPremixes];
  }, [globalProducts, premixes, premixesError]);
  
  const isLoading = isLoadingGlobal || (isLoadingPremixes && !premixesError);
  // Показываем ошибку только если обе коллекции не загрузились
  const error = globalError || (premixesError && !globalProducts ? premixesError : null);

  // Обработка ошибок прав доступа - использовать кэш при ошибке
  useEffect(() => {
    if (premixesError) {
      // Ошибка при загрузке примиксов - это нормально, если коллекция еще не создана или нет прав
      // Не логируем как критическую ошибку, так как это ожидаемое поведение для новых пользователей
      if (premixesError instanceof Error && premixesError.message.includes('permission')) {
        logger.info('Premixes collection not accessible (this is OK for new users or if collection does not exist)');
      } else {
        logger.warn('Error loading premixes:', premixesError);
      }
    }
    if (globalError) {
      logger.warn('Permission error loading global products, using cache:', globalError);
    }
    if (error && cache && cache.barId === barId) {
      // Не очищаем кэш при ошибке прав доступа, используем его
    }
  }, [error, premixesError, globalError, cache, barId]);

  // Сохранить в localStorage при загрузке
  useEffect(() => {
    if (typeof window === 'undefined' || !barId) return;
    if (products && products.length > 0) {
      const cached: CachedProducts = {
        products,
        timestamp: Date.now(),
        barId,
      };
      try {
        localStorage.setItem(`${PRODUCTS_CACHE_KEY}_${barId}`, JSON.stringify(cached));
        setCache(cached);
      } catch (e) {
        // Игнорировать ошибки сохранения (например, quota exceeded)
      }
    }
  }, [products, barId]);

  const refresh = useCallback(() => {
    if (typeof window !== 'undefined' && barId) {
      localStorage.removeItem(`${PRODUCTS_CACHE_KEY}_${barId}`);
    }
    setCache(null);
    setForceRefresh(prev => prev + 1);
  }, [barId]);

  // Использовать кэш если данные еще загружаются
  const effectiveProducts = React.useMemo(() => 
    products || (cache?.barId === barId ? cache.products : []) || [], 
    [products, cache?.barId, cache?.products, barId]
  );
  const effectiveIsLoading = React.useMemo(() => isLoading && !cache, [isLoading, cache]);

  const value: ProductsContextValue = React.useMemo(() => ({
    products: effectiveProducts,
    isLoading: effectiveIsLoading,
    error: error || null,
    refresh,
  }), [effectiveProducts, effectiveIsLoading, error, refresh]);

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within ProductsProvider');
  }
  return context;
}

