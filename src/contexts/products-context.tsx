'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { logger } from '@/lib/logger';
import { dedupeProductsByName } from '@/lib/utils';

interface ProductsContextValue {
  products: Product[]; // Объединенный список (персональные + библиотека) для обратной совместимости
  globalProducts: Product[]; // Только продукты без примиксов (персональные + библиотека)
  premixes: Product[]; // Только примиксы (персональные + библиотека)
  personalProducts: Product[]; // Только персональные продукты пользователя (без примиксов)
  personalPremixes: Product[]; // Только персональные примиксы пользователя
  libraryProducts: Product[]; // Только продукты из библиотеки (без примиксов)
  libraryPremixes: Product[]; // Только примиксы из библиотеки
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

  // Запрос для персональных продуктов пользователя (barId === текущий barId)
  const personalProductsQuery = useMemoFirebase(() =>
    firestore && barId ? query(
      collection(firestore, 'products'),
      where('barId', '==', barId)
    ) : null,
    [firestore, barId, forceRefresh]
  );
  
  // Запрос для продуктов из библиотеки (isInLibrary === true)
  const libraryProductsQuery = useMemoFirebase(() =>
    firestore ? query(
      collection(firestore, 'products'),
      where('isInLibrary', '==', true)
    ) : null,
    [firestore, forceRefresh]
  );
  
  const { data: personalProducts, isLoading: isLoadingPersonal, error: personalError } = useCollection<Product>(personalProductsQuery);
  const { data: libraryProducts, isLoading: isLoadingLibrary, error: libraryError } = useCollection<Product>(libraryProductsQuery);
  
  // Фильтруем персональные продукты: исключаем те, которые в библиотеке (на случай если есть и barId и isInLibrary)
  const filteredPersonalProducts = React.useMemo(() => {
    if (!personalProducts || personalProducts.length === 0) return [];
    return personalProducts.filter(p => p.isInLibrary !== true);
  }, [personalProducts]);
  
  // Объединяем персональные продукты и библиотеку
  const allProducts = React.useMemo(() => {
    const personal = filteredPersonalProducts || [];
    const library = libraryProducts || [];
    // Объединяем и убираем дубликаты по ID
    const combined = [...personal, ...library];
    const uniqueById = new Map<string, Product>();
    combined.forEach(p => {
      if (!uniqueById.has(p.id)) {
        uniqueById.set(p.id, p);
      }
    });
    return Array.from(uniqueById.values());
  }, [filteredPersonalProducts, libraryProducts]);
  
  // Глобальные продукты (без примиксов) с дедупликацией
  const loadedGlobalProducts = React.useMemo(() => {
    if (allProducts.length === 0) return [];
    // Фильтруем примиксы из всех продуктов
    const nonPremixes = allProducts.filter(p => !p.isPremix && p.category !== 'Premix');
    return dedupeProductsByName(nonPremixes);
  }, [allProducts]);
  
  // Примиксы из всех продуктов с дедупликацией
  const loadedPremixes = React.useMemo(() => {
    if (allProducts.length === 0) return [];
    // Фильтруем примиксы
    const premixes = allProducts.filter(p => p.isPremix === true || p.category === 'Premix');
    return dedupeProductsByName(premixes);
  }, [allProducts]);
  
  const isLoading = isLoadingPersonal || isLoadingLibrary;
  const error = personalError || libraryError;

  // Обработка ошибок прав доступа - использовать кэш при ошибке
  useEffect(() => {
    if (error) {
      logger.warn('Permission error loading products, using cache:', error);
    }
    if (error && cache && cache.barId === barId) {
      // Не очищаем кэш при ошибке прав доступа, используем его
    }
  }, [error, cache, barId]);

  // Сохранить в localStorage при загрузке с дедупликацией
  useEffect(() => {
    if (typeof window === 'undefined' || !barId) return;
    if (allProducts && allProducts.length > 0) {
      const deduplicated = dedupeProductsByName(allProducts);
      const cached: CachedProducts = {
        products: deduplicated,
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
  
  // Персональные продукты (только те, что принадлежат текущему пользователю, без примиксов)
  const personalProductsList = React.useMemo(() => {
    const personal = filteredPersonalProducts || [];
    return personal.filter(p => !p.isPremix && p.category !== 'Premix');
  }, [filteredPersonalProducts]);
  
  // Персональные примиксы
  const personalPremixesList = React.useMemo(() => {
    const personal = filteredPersonalProducts || [];
    return personal.filter(p => p.isPremix === true || p.category === 'Premix');
  }, [filteredPersonalProducts]);
  
  // Продукты из библиотеки (без примиксов)
  const libraryProductsList = React.useMemo(() => {
    const library = libraryProducts || [];
    return library.filter(p => !p.isPremix && p.category !== 'Premix');
  }, [libraryProducts]);
  
  // Примиксы из библиотеки
  const libraryPremixesList = React.useMemo(() => {
    const library = libraryProducts || [];
    return library.filter(p => p.isPremix === true || p.category === 'Premix');
  }, [libraryProducts]);

  const refresh = useCallback(() => {
    if (typeof window !== 'undefined' && barId) {
      localStorage.removeItem(`${PRODUCTS_CACHE_KEY}_${barId}`);
    }
    setCache(null);
    setForceRefresh(prev => prev + 1);
  }, [barId]);

  // Использовать кэш если данные еще загружаются с дедупликацией
  const cachedProductsLength = cache?.products?.length ?? 0;
  const effectiveProducts = React.useMemo(() => {
    if (allProducts.length > 0) return allProducts;
    if (cache?.barId === barId && cache?.products && cachedProductsLength > 0) {
      return dedupeProductsByName(cache.products);
    }
    return [];
  }, [allProducts.length, cache?.barId, barId, cachedProductsLength]);
  
  // Раздельные списки: сначала из загруженных данных, потом из кэша если данные еще загружаются с дедупликацией
  const effectiveGlobalProducts = React.useMemo(() => {
    if (loadedGlobalProducts.length > 0) return loadedGlobalProducts;
    if (cache?.barId === barId && cache?.products && cachedProductsLength > 0) {
      // Фильтруем примиксы из кэша и применяем дедупликацию
      const filtered = cache.products.filter(p => !p.isPremix && p.category !== 'Premix');
      return dedupeProductsByName(filtered);
    }
    return [];
  }, [loadedGlobalProducts.length, cache?.barId, barId, cachedProductsLength]);
  
  const effectivePremixes = React.useMemo(() => {
    if (loadedPremixes.length > 0) return loadedPremixes;
    if (cache?.barId === barId && cache?.products && cachedProductsLength > 0) {
      // Фильтруем примиксы из кэша и применяем дедупликацию
      const filtered = cache.products.filter(p => p.isPremix === true || p.category === 'Premix');
      return dedupeProductsByName(filtered);
    }
    return [];
  }, [loadedPremixes.length, cache?.barId, barId, cachedProductsLength]);
  
  const effectiveIsLoading = React.useMemo(() => isLoading && !cache, [isLoading, cache]);

  // Эффективные значения с учетом кэша для персональных продуктов
  const effectivePersonalProducts = React.useMemo(() => {
    if (personalProductsList.length > 0) return personalProductsList;
    if (cache?.barId === barId && cache?.products && cachedProductsLength > 0) {
      const cached = cache.products.filter(p => 
        p.barId === barId && 
        p.isInLibrary !== true && 
        !p.isPremix && 
        p.category !== 'Premix'
      );
      return dedupeProductsByName(cached);
    }
    return [];
  }, [personalProductsList.length, cache?.barId, barId, cachedProductsLength]);
  
  const effectivePersonalPremixes = React.useMemo(() => {
    if (personalPremixesList.length > 0) return personalPremixesList;
    if (cache?.barId === barId && cache?.products && cachedProductsLength > 0) {
      const cached = cache.products.filter(p => 
        p.barId === barId && 
        p.isInLibrary !== true && 
        (p.isPremix === true || p.category === 'Premix')
      );
      return dedupeProductsByName(cached);
    }
    return [];
  }, [personalPremixesList.length, cache?.barId, barId, cachedProductsLength]);
  
  // Эффективные значения для библиотеки
  const effectiveLibraryProducts = React.useMemo(() => {
    if (libraryProductsList.length > 0) return libraryProductsList;
    if (cache?.barId === barId && cache?.products && cachedProductsLength > 0) {
      const cached = cache.products.filter(p => 
        p.isInLibrary === true && 
        !p.isPremix && 
        p.category !== 'Premix'
      );
      return dedupeProductsByName(cached);
    }
    return [];
  }, [libraryProductsList.length, cache?.barId, barId, cachedProductsLength]);
  
  const effectiveLibraryPremixes = React.useMemo(() => {
    if (libraryPremixesList.length > 0) return libraryPremixesList;
    if (cache?.barId === barId && cache?.products && cachedProductsLength > 0) {
      const cached = cache.products.filter(p => 
        p.isInLibrary === true && 
        (p.isPremix === true || p.category === 'Premix')
      );
      return dedupeProductsByName(cached);
    }
    return [];
  }, [libraryPremixesList.length, cache?.barId, barId, cachedProductsLength]);

  const value: ProductsContextValue = React.useMemo(() => ({
    products: effectiveProducts, // Объединенный список для обратной совместимости
    globalProducts: effectiveGlobalProducts,
    premixes: effectivePremixes,
    personalProducts: effectivePersonalProducts,
    personalPremixes: effectivePersonalPremixes,
    libraryProducts: effectiveLibraryProducts,
    libraryPremixes: effectiveLibraryPremixes,
    isLoading: effectiveIsLoading,
    error: error || null,
    refresh,
  }), [
    effectiveProducts, 
    effectiveGlobalProducts, 
    effectivePremixes, 
    effectivePersonalProducts,
    effectivePersonalPremixes,
    effectiveLibraryProducts,
    effectiveLibraryPremixes,
    effectiveIsLoading, 
    error, 
    refresh
  ]);

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

