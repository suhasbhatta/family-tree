import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Plus, User } from 'lucide-react';
import { useState } from 'react';
import type { Person } from '../types/family';
import { useMagneticPull } from '../hooks/useMagneticPull';
import { RadialAddMenu } from './RadialAddMenu';

export type RelativeKind = 'spouse' | 'child' | 'parent' | 'sibling';
export type GlowKind = 'none' | 'cyan' | 'magenta' | 'emerald';

interface NodeCardProps {
  /** One person (single) or two (a merged spouse unit). */
  members: Person[];
  selected: boolean;
  glow: GlowKind;
  isEndpoint: boolean;
  hasChildren: boolean;
  collapsed: boolean;
  hiddenCount: number;
  onSelect: (id: string) => void;
  onRequestAdd: (personId: string, kind: RelativeKind) => void;
  onToggleCollapse: (unitId: string) => void;
}

const GLOW_STYLES: Record<GlowKind, string> = {
  none: 'border-white/[0.09]',
  cyan: 'border-cyan-300/70 shadow-[0_0_28px_rgba(34,211,238,0.55)]',
  magenta: 'border-fuchsia-300/70 shadow-[0_0_28px_rgba(232,121,249,0.55)]',
  emerald: 'border-emerald-300/70 shadow-[0_0_28px_rgba(52,211,153,0.55)]',
};

function MemberRow({ person }: { person: Person }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          person.gender === 'M' ? 'bg-cyan-500/15 text-cyan-300' : 'bg-fuchsia-500/15 text-fuchsia-300'
        }`}
      >
        <User size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[13px] font-medium text-zinc-100">{person.name}</p>
        <p className="font-kn truncate text-[12px] text-zinc-400">{person.kannadaName}</p>
      </div>
      <span className="shrink-0 text-[10px] text-zinc-500">{person.birthYear}</span>
    </div>
  );
}

export function NodeCard({
  members,
  selected,
  glow,
  isEndpoint,
  hasChildren,
  collapsed,
  hiddenCount,
  onSelect,
  onRequestAdd,
  onToggleCollapse,
}: NodeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const magnet = useMagneticPull();
  const unitId = members[0].id;
  const isCouple = members.length > 1;

  return (
    <motion.div
      className="group absolute select-none"
      style={{ touchAction: 'none' }}
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div
        className={`glass relative rounded-2xl border px-4 py-3.5 transition-colors duration-300 ${
          isCouple ? 'w-[210px]' : 'w-[190px]'
        } ${isEndpoint ? GLOW_STYLES[glow === 'none' ? 'emerald' : glow] : GLOW_STYLES.none} ${
          selected ? 'ring-2 ring-cyan-300/60' : ''
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(unitId);
        }}
      >
        <div className={isCouple ? 'space-y-2.5' : ''}>
          {members.map((person, i) => (
            <div key={person.id}>
              <MemberRow person={person} />
              {isCouple && i === 0 && <div className="my-2 border-t border-white/10" />}
            </div>
          ))}
        </div>

        {members[0].title && (
          <span className="mt-2 inline-block rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
            {members[0].title}
          </span>
        )}

        {collapsed && hiddenCount > 0 && (
          <span className="absolute -top-2.5 -right-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-400 px-1 text-[10px] font-semibold text-void shadow-[0_0_10px_rgba(232,121,249,0.7)]">
            {hiddenCount}
          </span>
        )}

        {hasChildren && (
          <button
            type="button"
            aria-label={collapsed ? 'Expand descendants' : 'Collapse descendants'}
            className="absolute -bottom-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-zinc-200 shadow-[0_0_12px_rgba(0,0,0,0.4)] transition-colors hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(unitId);
            }}
          >
            <motion.span animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={15} strokeWidth={2.5} />
            </motion.span>
          </button>
        )}

        <motion.button
          ref={magnet.ref as React.RefObject<HTMLButtonElement>}
          type="button"
          aria-label="Add relative"
          className="absolute -bottom-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-void shadow-[0_0_16px_rgba(34,211,238,0.7)] transition-shadow hover:shadow-[0_0_24px_rgba(34,211,238,0.95)]"
          style={{ x: magnet.x, y: magnet.y }}
          onMouseMove={(e) => magnet.onMouseMove(e)}
          onMouseLeave={magnet.onMouseLeave}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          whileTap={{ scale: 0.85 }}
        >
          <Plus size={15} strokeWidth={2.5} />
        </motion.button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <RadialAddMenu
            onClose={() => setMenuOpen(false)}
            onSelect={(kind) => {
              onRequestAdd(unitId, kind);
              setMenuOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
