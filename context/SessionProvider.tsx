import { VaultData } from '@/lib/vault';
import React, { createContext, useContext, useMemo, useState } from 'react';

type SessionValue = {
  unlocked: boolean;
  vault: VaultData | null;
  vaultKey: string | null;
  unlock: (vault: VaultData, vaultKey: string) => void;
  lock: () => void;
  setVault: (updater: (prev: VaultData) => VaultData) => void;
};

const SessionContext = createContext<SessionValue | undefined>(undefined);

export const SessionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [vault, setVaultState] = useState<VaultData | null>(null);
  const [vaultKey, setVaultKey] = useState<string | null>(null);

  const value = useMemo<SessionValue>(() => ({
    unlocked: !!vault && !!vaultKey,
    vault,
    vaultKey,
    unlock: (v, k) => {
      setVaultState(v);
      setVaultKey(k);
    },
    lock: () => {
      setVaultState(null);
      setVaultKey(null);
    },
    setVault: (updater) => {
      if (!vault) return;
      setVaultState(updater(vault));
    }
  }), [vault, vaultKey]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
};
