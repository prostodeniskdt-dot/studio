'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { logger } from '@/lib/logger';

interface ProductsContextValue {
  products: Product[]; // Объединенный список (globalProducts + premixes) для обратной совместимости
  globalProducts: Product[]; // Только глобальные продукты (без примиксов)
  premixes: Product[]; // Только примиксы пользователя
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
  
  // Глобальные продукты (без примиксов)
  const loadedGlobalProducts = React.useMemo(() => globalProducts || [], [globalProducts]);
  
  // Примиксы пользователя
  const loadedPremixes = React.useMemo(() => 
    (premixesError ? [] : (premixes || [])), // Игнорируем примиксы если ошибка
    [premixes, premixesError]
  );
  
  // Объединить глобальные продукты и примиксы (для обратной совместимости и калькулятора)
  const allProducts = React.useMemo(() => {
    return [...loadedGlobalProducts, ...loadedPremixes];
  }, [loadedGlobalProducts, loadedPremixes]);
  
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
    if (allProducts && allProducts.length > 0) {
      const cached: CachedProducts = {
        products: allProducts,
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
  }, [allProducts, barId]);

  const refresh = useCallback(() => {
    if (typeof window !== 'undefined' && barId) {
      localStorage.removeItem(`${PRODUCTS_CACHE_KEY}_${barId}`);
    }
    setCache(null);
    setForceRefresh(prev => prev + 1);
  }, [barId]);

  // Использовать кэш если данные еще загружаются
  const cachedProductsLength = cache?.products?.length ?? 0;
  const effectiveProducts = React.useMemo(() => {
    if (allProducts.length > 0) return allProducts;
    if (cache?.barId === barId && cache?.products && cachedProductsLength > 0) {
      return cache.products;
    }
    return [];
  }, [allProducts.length, cache?.barId, barId, cachedProductsLength]);
  
  // Раздельные списки: сначала из загруженных данных, потом из кэша если данные еще загружаются
  const effectiveGlobalProducts = React.useMemo(() => {
    if (loadedGlobalProducts.length > 0) return loadedGlobalProducts;
    if (cache?.barId === barId && cache?.products && cachedProductsLength > 0) {
      // Фильтруем примиксы из кэша
      return cache.products.filter(p => !p.isPremix && p.category !== 'Premix');
    }
    return [];
  }, [loadedGlobalProducts.length, cache?.barId, barId, cachedProductsLength]);
  
  const effectivePremixes = React.useMemo(() => {
    if (loadedPremixes.length > 0) return loadedPremixes;
    if (cache?.barId === barId && cache?.products && cachedProductsLength > 0) {
      // Фильтруем примиксы из кэша
      return cache.products.filter(p => p.isPremix === true || p.category === 'Premix');
    }
    return [];
  }, [loadedPremixes.length, cache?.barId, barId, cachedProductsLength]);
  
  const effectiveIsLoading = React.useMemo(() => isLoading && !cache, [isLoading, cache]);

  const value: ProductsContextValue = React.useMemo(() => ({
    products: effectiveProducts, // Объединенный список для обратной совместимости
    globalProducts: effectiveGlobalProducts,
    premixes: effectivePremixes,
    isLoading: effectiveIsLoading,
    error: error || null,
    refresh,
  }), [effectiveProducts, effectiveGlobalProducts, effectivePremixes, effectiveIsLoading, error, refresh]);

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

