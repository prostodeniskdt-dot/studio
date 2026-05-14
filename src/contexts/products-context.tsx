'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuthSession, getWorkingBarId } from '@/contexts/auth-context';
import type { Product } from '@/lib/types';
import { logger } from '@/lib/logger';
import { dedupeProductsByName } from '@/lib/utils';

/** Опции `refresh()` — по умолчанию «мягкая» перезагрузка: списки не очищаются, UI не блокируется. */
export type ProductsRefreshOptions = {
  /**
   * Сбросить списки в памяти (как раньше) и показать полную загрузку до ответа API.
   * Нужно редко; для добавления/редактирования одного элемента не используйте.
   */
  resetLists?: boolean;
};

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
  /** Фоновая синхронизация с сервером; см. ProductsRefreshOptions. */
  refresh: (options?: ProductsRefreshOptions) => void;
  /** Сразу обновить кэш в памяти после POST/PATCH (без повторной загрузки всего каталога). */
  upsertProduct: (product: Product) => void;
  /** Убрать продукт из локальных списков (после DELETE). */
  removeProductById: (productId: string) => void;
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
  const { user } = useAuthSession();
  const barId = getWorkingBarId(user);
  const prevBarIdRef = React.useRef<string | undefined>(undefined);
  const loadSeqRef = React.useRef(0);
  const [cache, setCache] = useState<CachedProducts | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [personalProducts, setPersonalProducts] = useState<Product[] | null>(null);
  const [libraryProducts, setLibraryProducts] = useState<Product[] | null>(null);
  const [isLoadingPersonal, setIsLoadingPersonal] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [personalError, setPersonalError] = useState<Error | null>(null);
  const [libraryError, setLibraryError] = useState<Error | null>(null);

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

  /** При смене бара сбрасываем состояние, чтобы не показывать продукты другого заведения. */
  React.useEffect(() => {
    if (!user) {
      prevBarIdRef.current = undefined;
      return;
    }
    if (prevBarIdRef.current !== undefined && prevBarIdRef.current !== barId) {
      // #region agent log
      fetch('http://127.0.0.1:7501/ingest/9bee7bc9-09c8-4378-897e-ea159885b11d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6e7a9b'},body:JSON.stringify({sessionId:'6e7a9b',location:'products-context.tsx:bar-switch',message:'bar id changed; clearing product lists',data:{previousBarId:String(prevBarIdRef.current ?? 'undefined'),nextBarId:String(barId ?? 'null')},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      setPersonalProducts(null);
      setLibraryProducts(null);
      setCache(null);
      try {
        if (typeof window !== 'undefined' && prevBarIdRef.current) {
          localStorage.removeItem(`${PRODUCTS_CACHE_KEY}_${prevBarIdRef.current}`);
        }
      } catch {
        /* ignore */
      }
    }
    prevBarIdRef.current = barId ?? undefined;
  }, [user, barId]);

  // Load from Postgres via API
  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      loadSeqRef.current += 1;
      const seq = loadSeqRef.current;
      const t0 = typeof performance !== 'undefined' ? performance.now() : 0;

      if (!user) {
        setPersonalProducts(null);
        setLibraryProducts(null);
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7501/ingest/9bee7bc9-09c8-4378-897e-ea159885b11d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6e7a9b'},body:JSON.stringify({sessionId:'6e7a9b',location:'products-context.tsx:load:start',message:'products API load starting',data:{seq,forceRefresh,barId:String(barId ?? 'null'),userId:String(user?.id ?? '')},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      setIsLoadingPersonal(true);
      setIsLoadingLibrary(true);
      setPersonalError(null);
      setLibraryError(null);

      try {
        const res = await fetch('/api/products', {
          cache: 'no-store',
          signal: ac.signal,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load products');

        if (!cancelled) {
          setPersonalProducts(json.personalProducts ?? []);
          setLibraryProducts(json.libraryProducts ?? []);
          const ms = typeof performance !== 'undefined' ? Math.round(performance.now() - t0) : 0;
          // #region agent log
          fetch('http://127.0.0.1:7501/ingest/9bee7bc9-09c8-4378-897e-ea159885b11d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6e7a9b'},body:JSON.stringify({sessionId:'6e7a9b',location:'products-context.tsx:load:ok',message:'products API load applied',data:{seq,ms,personalLen:Array.isArray(json?.personalProducts)?json.personalProducts.length:-1,libraryLen:Array.isArray(json?.libraryProducts)?json.libraryProducts.length:-1,runId:'post-fix'},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
          // #endregion
        }
      } catch (e) {
        const aborted =
          cancelled ||
          ac.signal.aborted ||
          (e instanceof DOMException && e.name === 'AbortError') ||
          (e instanceof Error && e.name === 'AbortError');
        if (aborted) {
          return;
        }
        const err = e instanceof Error ? e : new Error(String(e));
        logger.warn('Failed loading products from API, using cache if present:', err);
        // #region agent log
        fetch('http://127.0.0.1:7501/ingest/9bee7bc9-09c8-4378-897e-ea159885b11d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6e7a9b'},body:JSON.stringify({sessionId:'6e7a9b',location:'products-context.tsx:load:err',message:'products API load failed',data:{seq,wasCancelled:cancelled,err:String(err.message).slice(0,120)},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        if (!cancelled) {
          setPersonalError(err);
          setLibraryError(err);
          setPersonalProducts([]);
          setLibraryProducts([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPersonal(false);
          setIsLoadingLibrary(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      ac.abort();
      const seqEnd = loadSeqRef.current;
      // #region agent log
      fetch('http://127.0.0.1:7501/ingest/9bee7bc9-09c8-4378-897e-ea159885b11d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6e7a9b'},body:JSON.stringify({sessionId:'6e7a9b',location:'products-context.tsx:load:cleanup',message:'load effect cleanup (cancel)',data:{lastSeqStarted:seqEnd},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
    };
  }, [user, forceRefresh, barId]);
  
  // Персональные продукты: включаем все продукты с barId (включая те, что также в библиотеке)
  const filteredPersonalProducts = React.useMemo(() => {
    if (!personalProducts || personalProducts.length === 0) return [];
    // Включаем все продукты с barId, независимо от флага isInLibrary
    // Это позволяет продуктам быть видимыми и в библиотеке, и в персональных продуктах
    return personalProducts;
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
    // Включаем все продукты с isInLibrary === true, независимо от наличия barId
    // Это позволяет продуктам быть видимыми и в библиотеке, и в персональных продуктах
    return library.filter(p => 
      !p.isPremix && 
      p.category !== 'Premix'
    );
  }, [libraryProducts]);
  
  // Примиксы из библиотеки
  const libraryPremixesList = React.useMemo(() => {
    const library = libraryProducts || [];
    // Включаем все премиксы с isInLibrary === true, независимо от наличия barId
    // Это позволяет премиксам быть видимыми и в библиотеке, и в персональных премиксах
    return library.filter(p => 
      p.isPremix === true || p.category === 'Premix'
    );
  }, [libraryProducts]);

  const upsertProduct = useCallback(
    (p: Product) => {
      const addToPersonal = Boolean(!p.isInLibrary && barId != null && p.barId === barId);
      const addToLibrary = Boolean(p.isInLibrary);

      setPersonalProducts((prev) => {
        if (prev === null) return prev;
        const without = prev.filter((x) => x.id !== p.id);
        if (!addToPersonal) return without;
        return [p, ...without];
      });
      setLibraryProducts((prev) => {
        if (prev === null) return prev;
        const without = prev.filter((x) => x.id !== p.id);
        if (!addToLibrary) return without;
        return [p, ...without];
      });
    },
    [barId],
  );

  const removeProductById = useCallback((productId: string) => {
    setPersonalProducts((prev) => (prev === null ? prev : prev.filter((x) => x.id !== productId)));
    setLibraryProducts((prev) => (prev === null ? prev : prev.filter((x) => x.id !== productId)));
  }, []);

  const refresh = useCallback(
    (options?: ProductsRefreshOptions) => {
      const resetLists = options?.resetLists === true;

      // #region agent log
      fetch('http://127.0.0.1:7501/ingest/9bee7bc9-09c8-4378-897e-ea159885b11d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6e7a9b'},body:JSON.stringify({sessionId:'6e7a9b',location:'products-context.tsx:refresh',message:'refresh called',data:{resetLists},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion

      if (typeof window !== 'undefined' && barId) {
        try {
          localStorage.removeItem(`${PRODUCTS_CACHE_KEY}_${barId}`);
        } catch {
          /* ignore */
        }
      }
      setCache(null);
      if (resetLists) {
        setPersonalProducts(null);
        setLibraryProducts(null);
      }
      setForceRefresh((prev) => prev + 1);
    },
    [barId],
  );

  // Использовать кэш если данные еще загружаются с дедупликацией
  const cachedProductsLength = cache?.products?.length ?? 0;
  const effectiveProducts = React.useMemo(() => {
    if (allProducts.length > 0) return allProducts;
    if (cache?.barId === barId && cache?.products && cachedProductsLength > 0) {
      return dedupeProductsByName(cache.products);
    }
    return [];
  }, [allProducts, cache?.barId, barId, cachedProductsLength]);
  
  // Раздельные списки: сначала из загруженных данных, потом из кэша если данные еще загружаются с дедупликацией
  const effectiveGlobalProducts = React.useMemo(() => {
    if (loadedGlobalProducts.length > 0) return loadedGlobalProducts;
    if (cache?.barId === barId && cache?.products && cachedProductsLength > 0) {
      // Фильтруем примиксы из кэша и применяем дедупликацию
      const filtered = cache.products.filter(p => !p.isPremix && p.category !== 'Premix');
      return dedupeProductsByName(filtered);
    }
    return [];
  }, [loadedGlobalProducts, cache?.barId, barId, cachedProductsLength]);
  
  const effectivePremixes = React.useMemo(() => {
    if (loadedPremixes.length > 0) return loadedPremixes;
    if (cache?.barId === barId && cache?.products && cachedProductsLength > 0) {
      // Фильтруем примиксы из кэша и применяем дедупликацию
      const filtered = cache.products.filter(p => p.isPremix === true || p.category === 'Premix');
      return dedupeProductsByName(filtered);
    }
    return [];
  }, [loadedPremixes, cache?.barId, barId, cachedProductsLength]);

  /** Только первый загруз или смена бара (`null`). Фоновая подгрузка после refresh() интерфейс не блокирует. */
  const effectiveIsLoading = React.useMemo(
    () => personalProducts === null || libraryProducts === null,
    [personalProducts, libraryProducts],
  );

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
  }, [personalProductsList, cache?.barId, barId, cachedProductsLength]);
  
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
  }, [personalPremixesList, cache?.barId, barId, cachedProductsLength]);
  
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
  }, [libraryProductsList, cache?.barId, barId, cachedProductsLength]);
  
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
  }, [libraryPremixesList, cache?.barId, barId, cachedProductsLength]);

  const value: ProductsContextValue = React.useMemo(
    () => ({
      products: effectiveProducts,
      globalProducts: effectiveGlobalProducts,
      premixes: effectivePremixes,
      personalProducts: effectivePersonalProducts,
      personalPremixes: effectivePersonalPremixes,
      libraryProducts: effectiveLibraryProducts,
      libraryPremixes: effectiveLibraryPremixes,
      isLoading: effectiveIsLoading,
      error: error || null,
      refresh,
      upsertProduct,
      removeProductById,
    }),
    [
      effectiveProducts,
      effectiveGlobalProducts,
      effectivePremixes,
      effectivePersonalProducts,
      effectivePersonalPremixes,
      effectiveLibraryProducts,
      effectiveLibraryPremixes,
      effectiveIsLoading,
      error,
      refresh,
      upsertProduct,
      removeProductById,
    ],
  );

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

