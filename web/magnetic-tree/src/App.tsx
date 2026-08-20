import { LoginScreen } from './components/LoginScreen';
import { Workspace } from './components/Workspace';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { identity, ready, error, clearError } = useAuth();
  if (!ready) return <div className="loading-screen"><span className="loading-ring" /><p>Securing your family archive…</p></div>;
  return identity ? <Workspace identity={identity} /> : <LoginScreen error={error} onClearError={clearError} />;
}
