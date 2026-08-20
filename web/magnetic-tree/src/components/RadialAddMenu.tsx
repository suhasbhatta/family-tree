import { motion } from 'framer-motion';
import { Baby, Heart, Users, UserRound } from 'lucide-react';
import type { RelativeKind } from './NodeCard';

interface RadialAddMenuProps {
  onSelect: (kind: RelativeKind) => void;
  onClose: () => void;
}

const OPTIONS: { kind: RelativeKind; label: string; icon: typeof Heart; angle: number }[] = [
  { kind: 'spouse', label: 'Add Spouse', icon: Heart, angle: -135 },
  { kind: 'child', label: 'Add Child', icon: Baby, angle: -45 },
  { kind: 'parent', label: 'Add Parent', icon: UserRound, angle: 135 },
  { kind: 'sibling', label: 'Add Sibling', icon: Users, angle: 45 },
];

const RADIUS = 88;

export function RadialAddMenu({ onSelect, onClose }: RadialAddMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-50 h-0 w-0">
        {OPTIONS.map((opt, i) => {
          const rad = (opt.angle * Math.PI) / 180;
          const tx = Math.cos(rad) * RADIUS;
          const ty = Math.sin(rad) * RADIUS;
          const Icon = opt.icon;
          return (
            <motion.button
              key={opt.kind}
              type="button"
              className="pointer-events-auto glass absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-2xl border-cyan-300/25 px-3 py-2.5 text-[10px] font-medium text-zinc-200 shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:border-cyan-300/50 hover:shadow-[0_0_28px_rgba(34,211,238,0.35)]"
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              animate={{ x: tx, y: ty, opacity: 1, scale: 1 }}
              exit={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20, delay: i * 0.035 }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(opt.kind);
              }}
            >
              <Icon size={16} className="text-cyan-300" />
              <span className="whitespace-nowrap">{opt.label}</span>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}
