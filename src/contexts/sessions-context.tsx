'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { InventorySession } from '@/lib/types';
import { logger } from '@/lib/logger';

interface SessionsContextValue {
  sessions: InventorySession[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

const SessionsContext = createContext<SessionsContextValue | undefined>(undefined);

const SESSIONS_CACHE_KEY = 'barboss_sessions_cache';
const CACHE_EXPIRY_MS = 2 * 60 * 1000; // 2 минуты

interface CachedSessions {
  sessions: InventorySession[];
  timestamp: number;
  barId: string;
}

export function SessionsProvider({ children, barId }: { children: React.ReactNode; barId: string | null }) {
  const firestore = useFirestore();
  const [cache, setCache] = useState<CachedSessions | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);

  // Загрузить из localStorage при монтировании
  useEffect(() => {
    if (typeof window === 'undefined' || !barId) return;
    
    try {
      const cached = localStorage.getItem(`${SESSIONS_CACHE_KEY}_${barId}`);
      if (cached) {
        const parsed: CachedSessions = JSON.parse(cached);
        const now = Date.now();
        if (now - parsed.timestamp < CACHE_EXPIRY_MS && parsed.barId === barId) {
          setCache(parsed);
        } else {
          localStorage.removeItem(`${SESSIONS_CACHE_KEY}_${barId}`);
        }
      }
    } catch (e) {
      // Игнорировать ошибки парсинга
    }
  }, [barId]);

  const sessionsQuery = useMemoFirebase(() =>
    firestore && barId ? query(collection(firestore, 'bars', barId, 'inventorySessions'), orderBy('createdAt', 'desc')) : null,
    [firestore, barId, forceRefresh]
  );
  
  const { data: sessions, isLoading, error } = useCollection<InventorySession>(sessionsQuery);

  // Обработка ошибок прав доступа - использовать кэш при ошибке
  useEffect(() => {
    if (error && cache && cache.barId === barId) {
      logger.warn('Permission error loading sessions, using cache:', error);
      // Не очищаем кэш при ошибке прав доступа, используем его
    }
  }, [error, cache, barId]);

  // Сохранить в localStorage при загрузке
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessions && sessions.length > 0 && barId) {
      const cached: CachedSessions = {
        sessions,
        timestamp: Date.now(),
        barId,
      };
      try {
        localStorage.setItem(`${SESSIONS_CACHE_KEY}_${barId}`, JSON.stringify(cached));
        setCache(cached);
      } catch (e) {
        // Игнорировать ошибки сохранения
      }
    }
  }, [sessions, barId]);

  const refresh = useCallback(() => {
    if (typeof window !== 'undefined' && barId) {
      localStorage.removeItem(`${SESSIONS_CACHE_KEY}_${barId}`);
    }
    setCache(null);
    setForceRefresh(prev => prev + 1);
  }, [barId]);

  // Использовать кэш если данные еще загружаются
  const effectiveSessions = React.useMemo(() => 
    sessions || (cache?.barId === barId ? cache.sessions : []) || [], 
    [sessions, cache?.barId, cache?.sessions, barId]
  );
  const effectiveIsLoading = React.useMemo(() => isLoading && !cache, [isLoading, cache]);

  const value: SessionsContextValue = React.useMemo(() => ({
    sessions: effectiveSessions,
    isLoading: effectiveIsLoading,
    error: error || null,
    refresh,
  }), [effectiveSessions, effectiveIsLoading, error, refresh]);

  return (
    <SessionsContext.Provider value={value}>
      {children}
    </SessionsContext.Provider>
  );
}

export function useSessions() {
  const context = useContext(SessionsContext);
  if (context === undefined) {
    throw new Error('useSessions must be used within SessionsProvider');
  }
  return context;
}

