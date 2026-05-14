'use client';

import React from 'react';

export type BarAccess = 'owner' | 'staff' | 'viewer';

type AuthUser = {
  id: string;
  email: string;
  profile?: any;
  workingBarId?: string | null;
  barAccess?: BarAccess | null;
};

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = React.createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        setUser(null);
      } else {
        setUser(json.user ?? null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = React.useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const value = React.useMemo(() => ({ user, isLoading, refresh, logout }), [user, isLoading, refresh, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuthSession must be used within AuthProvider');
  return ctx;
}

/** Активный бар для дашборда (совпадает с логикой API). */
export function getWorkingBarId(user: Pick<AuthUser, 'id' | 'workingBarId'> | null | undefined): string | null {
  if (!user?.id) return null;
  if (user.workingBarId != null && user.workingBarId !== '') return user.workingBarId;
  return `bar_${user.id}`;
}

export function canMutateWorkspace(user: Pick<AuthUser, 'barAccess'> | null | undefined): boolean {
  return user?.barAccess !== 'viewer';
}

