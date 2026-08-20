import { useEffect, useState } from 'react';
import { initializeAuth, type AdminIdentity } from '../lib/firebase';

export function useAuth() {
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let unsubscribe: () => void = () => undefined; void initializeAuth((next, message) => { setIdentity(next); setError((current) => message ?? (next ? null : current)); setReady(true); }).then((stop) => { unsubscribe = stop; }); return () => unsubscribe(); }, []);
  return { identity, ready, error, clearError: () => setError(null) };
}
