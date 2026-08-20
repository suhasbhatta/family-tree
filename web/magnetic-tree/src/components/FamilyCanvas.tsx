import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Magnet, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { Person } from '../types/family';
import type { RelativeKind } from './NodeCard';
import { NodeCard } from './NodeCard';
import { ConnectionLines } from './ConnectionLines';
import { useTreeLayout } from '../hooks/useTreeLayout';
import { useCamera } from '../hooks/useCamera';
import { useMagneticPull } from '../hooks/useMagneticPull';
import { buildChildrenMap, computeHiddenIds, countDescendants } from '../lib/collapse';

interface FamilyCanvasProps {
  people: Person[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRequestAdd: (personId: string, kind: RelativeKind) => void;
  activePath: string[];
  pathColor: 'cyan' | 'magenta' | 'emerald';
}

function DockButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Magnet;
  label: string;
  onClick: () => void;
}) {
  const magnet = useMagneticPull();
  return (
    <div className="group relative">
      <motion.button
        ref={magnet.ref as React.RefObject<HTMLButtonElement>}
        type="button"
        onMouseMove={magnet.onMouseMove}
        onMouseLeave={magnet.onMouseLeave}
        onClick={onClick}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-300 transition-colors hover:bg-white/5 hover:text-cyan-300"
        style={{ x: magnet.x, y: magnet.y }}
      >
        <Icon size={18} />
      </motion.button>
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[10px] text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}

export function FamilyCanvas({
  people,
  selectedId,
  onSelect,
  onRequestAdd,
  activePath,
  pathColor,
}: FamilyCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Collapsing/expanding operates on blood parent-child links between people
  // (a unit's children are the union of both members' children).
  const childrenOf = useMemo(() => buildChildrenMap(people), [people]);
  const hiddenIds = useMemo(
    () => computeHiddenIds(people, collapsedIds, childrenOf),
    [people, collapsedIds, childrenOf],
  );
  const visiblePeople = useMemo(() => people.filter((p) => !hiddenIds.has(p.id)), [people, hiddenIds]);

  const toggleCollapse = useCallback((unitId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  }, []);

  const { units, positions, bounds, links } = useTreeLayout(visiblePeople);
  const byId = useMemo(() => new Map(visiblePeople.map((p) => [p.id, p])), [visiblePeople]);
  const { camera, setCamera, onPanStart, onPanMove, onPanEnd, zoomAt, zoomBy } = useCamera();

  const attractTree = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { minX, maxX, minY, maxY } = bounds;
    const treeWidth = Math.max(maxX - minX, 1);
    const treeHeight = Math.max(maxY - minY, 1);
    const padding = 160;
    const scale = Math.min(
      1.1,
      Math.min((el.clientWidth - padding) / treeWidth, (el.clientHeight - padding) / treeHeight),
    );
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setCamera({ x: -centerX * scale, y: -centerY * scale, scale: Math.max(scale, 0.25) });
  }, [bounds, setCamera]);

  const didInitialFit = useRef(false);
  useEffect(() => {
    if (didInitialFit.current) return;
    didInitialFit.current = true;
    attractTree();
  }, [attractTree]);

  const isPanningBackground = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.target !== containerRef.current) return;
    isPanningBackground.current = true;
    onPanStart(e.clientX, e.clientY);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanningBackground.current) return;
    onPanMove(e.clientX, e.clientY);
  };
  const handlePointerUp = () => {
    if (!isPanningBackground.current) return;
    isPanningBackground.current = false;
    onPanEnd();
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [zoomAt]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
          transformOrigin: '0 0',
        }}
      >
        <ConnectionLines links={links} positions={positions} activePath={activePath} pathColor={pathColor} />
        {units.map((unit) => {
          const pos = positions.get(unit.id);
          if (!pos) return null;
          const members = unit.personIds.map((id) => byId.get(id)).filter((p): p is Person => !!p);
          if (members.length === 0) return null;

          const isEndpoint = unit.personIds.some((id) => activePath.includes(id));
          const hasChildren = unit.personIds.some((id) => (childrenOf.get(id)?.length ?? 0) > 0);
          const collapsed = collapsedIds.has(unit.id);
          const hiddenCount = collapsed
            ? unit.personIds.reduce((max, id) => Math.max(max, countDescendants(id, childrenOf)), 0)
            : 0;

          return (
            <motion.div
              key={unit.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              initial={{ left: pos.x, top: pos.y, opacity: 0, scale: 0.5 }}
              animate={{ left: pos.x, top: pos.y, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
            >
              <NodeCard
                members={members}
                selected={unit.personIds.includes(selectedId ?? '')}
                glow={pathColor}
                isEndpoint={isEndpoint}
                hasChildren={hasChildren}
                collapsed={collapsed}
                hiddenCount={hiddenCount}
                onSelect={onSelect}
                onToggleCollapse={toggleCollapse}
                onRequestAdd={onRequestAdd}
              />
            </motion.div>
          );
        })}
      </div>

      <div className="glass absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-2xl p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <DockButton icon={Magnet} label="Attract Tree" onClick={attractTree} />
        <DockButton icon={ZoomIn} label="Zoom In" onClick={() => zoomBy(1.2, window.innerWidth / 2, window.innerHeight / 2)} />
        <DockButton icon={ZoomOut} label="Zoom Out" onClick={() => zoomBy(1 / 1.2, window.innerWidth / 2, window.innerHeight / 2)} />
        <DockButton icon={RotateCcw} label="Reset Camera" onClick={attractTree} />
      </div>
    </div>
  );
}
