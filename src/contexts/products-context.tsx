'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Product } from '@/lib/types';

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
}

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const [cache, setCache] = useState<CachedProducts | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);

  // Загрузить из localStorage при монтировании
  useEffect(() => {
    try {
      const cached = localStorage.getItem(PRODUCTS_CACHE_KEY);
      if (cached) {
        const parsed: CachedProducts = JSON.parse(cached);
        const now = Date.now();
        if (now - parsed.timestamp < CACHE_EXPIRY_MS) {
          setCache(parsed);
        } else {
          localStorage.removeItem(PRODUCTS_CACHE_KEY);
        }
      }
    } catch (e) {
      // Игнорировать ошибки парсинга
    }
  }, []);

  const productsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'products'), where('isActive', '==', true)) : null,
    [firestore, forceRefresh]
  );
  
  const { data: products, isLoading, error } = useCollection<Product>(productsQuery);

  // Сохранить в localStorage при загрузке
  useEffect(() => {
    if (products && products.length > 0) {
      const cached: CachedProducts = {
        products,
        timestamp: Date.now(),
      };
      try {
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(cached));
        setCache(cached);
      } catch (e) {
        // Игнорировать ошибки сохранения (например, quota exceeded)
      }
    }
  }, [products]);

  const refresh = useCallback(() => {
    localStorage.removeItem(PRODUCTS_CACHE_KEY);
    setCache(null);
    setForceRefresh(prev => prev + 1);
  }, []);

  // Использовать кэш если данные еще загружаются
  const effectiveProducts = products || cache?.products || [];
  const effectiveIsLoading = isLoading && !cache;

  const value: ProductsContextValue = {
    products: effectiveProducts,
    isLoading: effectiveIsLoading,
    error: error || null,
    refresh,
  };

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

