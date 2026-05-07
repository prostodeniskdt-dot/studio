'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser } from '@/firebase';
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
  const { user } = useUser();
  const [cache, setCache] = useState<CachedSessions | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [sessions, setSessions] = useState<InventorySession[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user || !barId) {
        setSessions(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/sessions', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed to load sessions');
        if (!cancelled) setSessions(json.sessions ?? []);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        logger.warn('Failed loading sessions from API, using cache if present:', err);
        if (!cancelled) {
          setError(err);
          setSessions([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, barId, forceRefresh]);

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

