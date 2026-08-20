import { useState } from 'react';
import { Magnet } from 'lucide-react';
import { MagneticField } from './components/MagneticField';
import { FamilyCanvas } from './components/FamilyCanvas';
import { AddPersonModal } from './components/AddPersonModal';
import { sampleFamily } from './data/sampleFamily';
import { useFamilyTree } from './hooks/useFamilyTree';

function App() {
  const { people, pendingAdd, requestAdd, cancelAdd, commitAdd } = useFamilyTree(sampleFamily);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-void font-sans">
      <MagneticField />

      <header className="pointer-events-none fixed left-6 top-6 z-30 flex items-center gap-2.5">
        <div className="glass flex h-10 w-10 items-center justify-center rounded-xl border-cyan-300/25">
          <Magnet size={18} className="text-cyan-300" />
        </div>
        <div>
          <h1 className="font-display text-sm font-semibold leading-tight text-zinc-100">Magnetic Family Tree</h1>
          <p className="font-kn text-[11px] leading-tight text-zinc-500">ಕುಟುಂಬ ವೃಕ್ಷ</p>
        </div>
      </header>

      <div className="absolute inset-0 z-10">
        <FamilyCanvas
          people={people}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRequestAdd={requestAdd}
          activePath={[]}
          pathColor="emerald"
        />
      </div>

      <AddPersonModal
        open={pendingAdd !== null}
        anchorName={pendingAdd?.anchorName ?? ''}
        kind={pendingAdd?.kind ?? null}
        onCancel={cancelAdd}
        onSubmit={commitAdd}
      />
    </div>
  );
}

export default App;
