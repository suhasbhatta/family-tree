import { useState } from 'react';
import { ArrowRight, Clock3, GitBranch, LockKeyhole, LogOut, ShieldCheck, ShieldX } from 'lucide-react';
import { login, logout, type AccessRequestIdentity } from '../lib/firebase';

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
      <div className="feature-row"><span><ShieldCheck size={17} /></span><div><strong>Admin-approved access</strong><small>Every new Google account must be approved before viewing the archive.</small></div></div>
      <div className="feature-row"><span><GitBranch size={17} /></span><div><strong>One living family map</strong><small>Explore every generation; approved administrators manage updates.</small></div></div>
    </section>
    <section className="login-card">
      <div className="lock-badge"><LockKeyhole size={20} /></div><p className="eyebrow">Family portal</p><h2>Welcome back</h2><p>Sign in with Google. New accounts will send an access request to the family administrators.</p>
      {(localError || error) && <div className="error-banner" role="alert">{localError || error}</div>}
      <button type="button" className="google-button" disabled={busy} onClick={() => void signIn()}><span className="google-g">G</span>{busy ? 'Signing in…' : 'Continue with Google'}<ArrowRight size={17} /></button>
      <small className="privacy-note">Family data stays in your private Firestore database and is never published with this website.</small>
    </section>
  </main>;
}

export function AccessStatusScreen({ request }: { request: AccessRequestIdentity }) {
  const rejected = request.status === 'rejected';
  return <main className="access-status-shell"><section className="login-card access-status-card">
    <div className={`lock-badge ${rejected ? 'rejected' : ''}`}>{rejected ? <ShieldX size={21} /> : <Clock3 size={21} />}</div>
    <p className="eyebrow">Access request</p><h2>{rejected ? 'Access was not approved' : 'Waiting for approval'}</h2>
    <p>{rejected ? 'A family administrator reviewed this Google account and did not grant access.' : 'Your request was sent to the administrators. This screen will update automatically after they approve you as a user or administrator.'}</p>
    <div className="request-account"><span>{request.displayName[0]?.toLocaleUpperCase()}</span><div><strong>{request.displayName}</strong><small>{request.user.email}</small></div></div>
    <button type="button" className="secondary-button access-signout" onClick={() => void logout()}><LogOut size={16} /> Sign out</button>
    <small className="privacy-note">Family information remains unavailable until an administrator grants access.</small>
  </section></main>;
}
