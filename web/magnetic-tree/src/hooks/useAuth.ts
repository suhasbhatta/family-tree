import { useEffect, useState } from 'react';
import { initializeAuth, type AuthState } from '../lib/firebase';

export function useAuth() {
  const [state, setState] = useState<AuthState>({ kind: 'signedOut' });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let unsubscribe: () => void = () => undefined; void initializeAuth((next, message) => { setState(next); setError((current) => message ?? (next.kind === 'approved' ? null : current)); setReady(true); }).then((stop) => { unsubscribe = stop; }); return () => unsubscribe(); }, []);
  return { state, ready, error, clearError: () => setError(null) };
}
