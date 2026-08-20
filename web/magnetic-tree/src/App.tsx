import { AccessStatusScreen, LoginScreen } from './components/LoginScreen';
import { Workspace } from './components/Workspace';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { state, ready, error, clearError } = useAuth();
  if (!ready) return <div className="loading-screen"><span className="loading-ring" /><p>Securing your family archive…</p></div>;
  if (state.kind === 'approved') return <Workspace identity={state.identity} />;
  if (state.kind === 'waiting') return <AccessStatusScreen request={state.request} />;
  return <LoginScreen error={error} onClearError={clearError} />;
}
