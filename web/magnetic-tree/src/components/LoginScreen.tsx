import { useState } from 'react';
import { ArrowRight, GitBranch, LockKeyhole, ShieldCheck } from 'lucide-react';
import { login } from '../lib/firebase';

export function LoginScreen({ error, onClearError }: { error: string | null; onClearError: () => void }) {
  const [busy, setBusy] = useState(false); const [localError, setLocalError] = useState<string | null>(null);
  const signIn = async () => { setBusy(true); setLocalError(null); onClearError(); try { await login(); } catch (cause) { setLocalError(cause instanceof Error ? cause.message : 'Unable to sign in.'); } finally { setBusy(false); } };
  return <main className="login-shell">
    <div className="login-orb orb-one" /><div className="login-orb orb-two" />
    <section className="login-story">
      <div className="brand-mark"><GitBranch size={23} /></div>
      <p className="eyebrow">Private family archive</p>
      <h1>Every branch tells<br />a <em>story.</em></h1>
      <p className="login-lead">A thoughtful, private place to preserve the people and relationships that shaped your family.</p>
      <div className="feature-row"><span><ShieldCheck size={17} /></span><div><strong>Admin-only access</strong><small>Protected by Google sign-in and your Firebase allowlist.</small></div></div>
      <div className="feature-row"><span><GitBranch size={17} /></span><div><strong>One living family map</strong><small>Search, explore, and update every generation from one canvas.</small></div></div>
    </section>
    <section className="login-card">
      <div className="lock-badge"><LockKeyhole size={20} /></div><p className="eyebrow">Administrator portal</p><h2>Welcome back</h2><p>Sign in using one of the approved Google accounts for this tree.</p>
      {(localError || error) && <div className="error-banner" role="alert">{localError || error}</div>}
      <button type="button" className="google-button" disabled={busy} onClick={() => void signIn()}><span className="google-g">G</span>{busy ? 'Signing in…' : 'Continue with Google'}<ArrowRight size={17} /></button>
      <small className="privacy-note">Family data stays in your private Firestore database and is never published with this website.</small>
    </section>
  </main>;
}
