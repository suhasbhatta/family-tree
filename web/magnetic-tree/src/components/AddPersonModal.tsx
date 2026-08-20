import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, MapPin, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Gender, PersonDraft } from '../types/family';
import type { RelativeKind } from './NodeCard';

interface AddPersonModalProps {
  open: boolean;
  anchorName: string;
  kind: RelativeKind | null;
  onCancel: () => void;
  onSubmit: (draft: PersonDraft) => void;
}

const KIND_LABEL: Record<RelativeKind, string> = {
  spouse: 'Spouse',
  child: 'Child',
  parent: 'Parent',
  sibling: 'Sibling',
};

const EMPTY_DRAFT: PersonDraft = {
  name: '',
  kannadaName: '',
  gender: 'M',
  dob: '',
  placeOfResidence: '',
};

export function AddPersonModal({ open, anchorName, kind, onCancel, onSubmit }: AddPersonModalProps) {
  const [draft, setDraft] = useState<PersonDraft>(EMPTY_DRAFT);

  useEffect(() => {
    if (open) setDraft(EMPTY_DRAFT);
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    onSubmit(draft);
  };

  return (
    <AnimatePresence>
      {open && kind && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="glass w-[420px] rounded-3xl border-cyan-300/15 p-6 shadow-[0_0_60px_rgba(34,211,238,0.12)]"
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-zinc-100">
                  Add {KIND_LABEL[kind]}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Relative to <span className="text-zinc-300">{anchorName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <User size={12} /> Name
                </label>
                <input
                  autoFocus
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Anjali Rao"
                  className="glass w-full rounded-xl border-white/10 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Kannada Name
                </label>
                <input
                  value={draft.kannadaName}
                  onChange={(e) => setDraft((d) => ({ ...d, kannadaName: e.target.value }))}
                  placeholder="ಅಂಜಲಿ ರಾವ್"
                  className="font-kn glass w-full rounded-xl border-white/10 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <Calendar size={12} /> Date of Birth
                  </label>
                  <input
                    type="date"
                    value={draft.dob}
                    onChange={(e) => setDraft((d) => ({ ...d, dob: e.target.value }))}
                    className="glass w-full rounded-xl border-white/10 px-3 py-2.5 text-sm text-zinc-100 outline-none [color-scheme:dark] focus:border-cyan-300/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Gender
                  </label>
                  <div className="glass flex overflow-hidden rounded-xl border-white/10">
                    {(['M', 'F'] as Gender[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, gender: g }))}
                        className={`flex-1 py-2.5 text-sm transition-colors ${
                          draft.gender === g
                            ? g === 'M'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'bg-fuchsia-500/20 text-fuchsia-300'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {g === 'M' ? 'Male' : 'Female'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <MapPin size={12} /> Place of Residence
                </label>
                <input
                  value={draft.placeOfResidence}
                  onChange={(e) => setDraft((d) => ({ ...d, placeOfResidence: e.target.value }))}
                  placeholder="e.g. Bengaluru, Karnataka"
                  className="glass w-full rounded-xl border-white/10 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
                />
              </div>
            </div>

            <div className="mt-7 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!draft.name.trim()}
                className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-void shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-opacity hover:shadow-[0_0_28px_rgba(34,211,238,0.7)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add to Tree
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
