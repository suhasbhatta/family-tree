import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRightLeft, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Person, RelationshipResult } from '../types/family';
import { FamilyGraph } from '../lib/familyGraph';
import { findRelationship } from '../lib/relationshipEngine';

interface RelationshipFinderProps {
  open: boolean;
  onClose: () => void;
  people: Person[];
  graph: FamilyGraph;
  onResult: (result: RelationshipResult | null) => void;
}

const GLOW_TEXT: Record<string, string> = {
  cyan: 'text-cyan-300',
  magenta: 'text-fuchsia-300',
  emerald: 'text-emerald-300',
};

function PersonSelect({
  people,
  value,
  onChange,
  placeholder,
}: {
  people: Person[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="glass w-full appearance-none rounded-xl border-white/10 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-cyan-300/50"
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {people.map((p) => (
        <option key={p.id} value={p.id} className="bg-zinc-900">
          {p.name} · {p.kannadaName}
        </option>
      ))}
    </select>
  );
}

export function RelationshipFinder({ open, onClose, people, graph, onResult }: RelationshipFinderProps) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');

  const sortedPeople = useMemo(() => [...people].sort((a, b) => a.name.localeCompare(b.name)), [people]);

  const result: RelationshipResult | null = useMemo(() => {
    if (!fromId || !toId || fromId === toId) return null;
    return findRelationship(graph, fromId, toId);
  }, [fromId, toId, graph]);

  useEffect(() => {
    onResult(result);
  }, [result, onResult]);

  const fromPerson = graph.get(fromId);
  const toPerson = graph.get(toId);

  const handleClose = () => {
    onResult(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="glass fixed right-0 top-0 z-50 h-full w-[380px] border-l p-6"
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-zinc-100">Relationship Finder</h2>
              <p className="font-kn text-sm text-cyan-300">ಸಂಬಂಧ ಹುಡುಕು</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Node A
              </label>
              <PersonSelect people={sortedPeople} value={fromId} onChange={setFromId} placeholder="Select first person" />
            </div>

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setFromId(toId);
                  setToId(fromId);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-white/5 hover:text-cyan-300"
              >
                <ArrowRightLeft size={14} />
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Node B
              </label>
              <PersonSelect people={sortedPeople} value={toId} onChange={setToId} placeholder="Select second person" />
            </div>
          </div>

          <div className="mt-8">
            <AnimatePresence mode="wait">
              {!fromId || !toId ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-500"
                >
                  <Search size={22} className="text-zinc-600" />
                  Select two people to trace their connection.
                </motion.div>
              ) : fromId === toId ? (
                <motion.div
                  key="same"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-500"
                >
                  That's the same person.
                </motion.div>
              ) : result ? (
                <motion.div
                  key={`${fromId}-${toId}`}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className={`glass rounded-2xl border p-5 ${
                    result.color === 'cyan'
                      ? 'border-cyan-300/40 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
                      : result.color === 'magenta'
                        ? 'border-fuchsia-300/40 shadow-[0_0_30px_rgba(232,121,249,0.2)]'
                        : 'border-emerald-300/40 shadow-[0_0_30px_rgba(52,211,153,0.2)]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Sparkles size={12} className={GLOW_TEXT[result.color]} />
                    <span>
                      {toPerson?.name} is {fromPerson?.name}'s
                    </span>
                  </div>
                  <p className={`font-kn mt-2 text-3xl font-semibold ${GLOW_TEXT[result.color]}`}>
                    {result.kannadaScript}
                  </p>
                  <p className="mt-1 text-lg font-medium text-zinc-200">{result.kannadaLabel}</p>
                  <p className="mt-3 text-xs text-zinc-500">{result.englishLabel}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-4">
                    {result.path.map((id, i) => (
                      <span key={id} className="flex items-center gap-1.5">
                        <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-zinc-300">
                          {graph.get(id)?.name}
                        </span>
                        {i < result.path.length - 1 && <span className="text-zinc-600">→</span>}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-500"
                >
                  No traceable relationship found between these two nodes.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
