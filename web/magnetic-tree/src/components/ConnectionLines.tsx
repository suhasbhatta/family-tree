import { motion } from 'framer-motion';
import type { Vec2 } from '../lib/layoutConstants';
import { COUPLE_CARD_HEIGHT } from '../lib/layoutConstants';
import type { ParentChildLink } from '../hooks/useTreeLayout';

interface ConnectionLinesProps {
  links: ParentChildLink[];
  positions: Map<string, Vec2>;
  activePath: string[];
  pathColor: 'cyan' | 'magenta' | 'emerald';
}

const PATH_COLOR_HEX: Record<string, string> = {
  cyan: '#22d3ee',
  magenta: '#e879f9',
  emerald: '#34d399',
};

const HALF_H = COUPLE_CARD_HEIGHT / 2;

export function ConnectionLines({ links, positions, activePath, pathColor }: ConnectionLinesProps) {
  const activeEdges = new Set<string>();
  for (let i = 0; i < activePath.length - 1; i++) {
    activeEdges.add(`${activePath[i]}|${activePath[i + 1]}`);
    activeEdges.add(`${activePath[i + 1]}|${activePath[i]}`);
  }

  return (
    <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1}>
      <defs>
        <filter id="glow-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {links.map((link) => {
        const parent = positions.get(link.parentUnitId);
        const child = positions.get(link.childUnitId);
        if (!parent || !child) return null;

        const originX = parent.x;
        const originY = parent.y + HALF_H;
        const childX = child.x;
        const childY = child.y - HALF_H;

        const isActive = activeEdges.has(`${link.parentUnitId}|${link.childUnitId}`);
        const midY = (originY + childY) / 2;
        const d = `M ${originX} ${originY} C ${originX} ${midY}, ${childX} ${midY}, ${childX} ${childY}`;
        const key = `${link.parentUnitId}-${link.childUnitId}`;

        return (
          <g key={key}>
            <path
              d={d}
              stroke="rgba(226,232,240,0.5)"
              strokeWidth={2}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
            {isActive && (
              <>
                <motion.path
                  d={d}
                  stroke={PATH_COLOR_HEX[pathColor]}
                  strokeWidth={3}
                  fill="none"
                  filter="url(#glow-blur)"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.9 }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                />
                <motion.path
                  d={d}
                  stroke={PATH_COLOR_HEX[pathColor]}
                  strokeWidth={1.5}
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
