import { memo, useEffect, useMemo } from 'react';
import { Background, BackgroundVariant, Controls, Handle, MiniMap, Panel, Position, ReactFlow, useReactFlow, type NodeProps } from '@xyflow/react';
import { Crown, Heart, MapPin, Search, Sparkles } from 'lucide-react';
import type { FamilyTreeData } from '../types/family';
import { buildTreeGraph, type FamilyNode } from '../lib/treeGraph';

const FamilyCard = memo(({ data }: NodeProps<FamilyNode>) => (
  <article className={`family-node ${data.root ? 'is-root' : ''} ${data.highlighted ? 'is-highlighted' : ''}`}>
    <Handle className="tree-handle" type="target" position={Position.Top} isConnectable={false} />
    {data.root && <span className="root-chip"><Crown size={11} /> Root family</span>}
    <div className="family-members">
      {data.people.map((person, index) => (
        <div key={person.id} className="member-wrap">
          {index > 0 && <div className="spouse-mark" aria-label="Married"><Heart size={12} fill="currentColor" /></div>}
          <button type="button" className={`person-tile ${data.selectedPersonId === person.id ? 'selected' : ''}`} onClick={() => data.onSelect(person.id)}>
            <span className={`avatar avatar-${person.gender}`}>{person.name.slice(0, 1).toLocaleUpperCase()}</span>
            <span className="person-copy">
              <strong>{person.name}</strong>
              <small>{person.dateOfBirth ? `Born ${person.dateOfBirth.slice(0, 4)}` : person.isAlive ? 'Living' : 'In memory'}</small>
              {person.currentPlaceOfResidence && <span className="place"><MapPin size={10} />{person.currentPlaceOfResidence}</span>}
            </span>
          </button>
        </div>
      ))}
    </div>
    <Handle className="tree-handle" type="source" position={Position.Bottom} isConnectable={false} />
  </article>
));
FamilyCard.displayName = 'FamilyCard';

const nodeTypes = { family: FamilyCard };

function AutoFocus({ focusId, graphKey }: { focusId: string | null; graphKey: string }) {
  const { fitView, setCenter, getNode } = useReactFlow();
  useEffect(() => { window.setTimeout(() => void fitView({ padding: 0.18, duration: 650, maxZoom: 1 }), 50); }, [fitView, graphKey]);
  useEffect(() => { if (!focusId) return; const node = getNode(focusId); if (node) void setCenter(node.position.x + 170, node.position.y + 70, { zoom: 1.1, duration: 550 }); }, [focusId, getNode, setCenter]);
  return null;
}

interface Props { tree: FamilyTreeData; selectedPersonId: string | null; focusPersonId: string | null; highlightedPath: string[]; onSelect: (id: string) => void; onOpenSearch: () => void }

export function TreeCanvas({ tree, selectedPersonId, focusPersonId, highlightedPath, onSelect, onOpenSearch }: Props) {
  const built = useMemo(() => buildTreeGraph(tree, selectedPersonId, highlightedPath, onSelect), [tree, selectedPersonId, highlightedPath, onSelect]);
  const focusNode = focusPersonId ? built.personNode.get(focusPersonId) ?? null : null;
  const graphKey = `${built.nodes.map((node) => node.id).join('|')}:${tree.selectedRootFamilyUnitId ?? ''}`;
  return (
    <div className="tree-canvas">
      {built.nodes.length === 0 ? <div className="empty-tree"><span><Sparkles size={24} /></span><h2>Start your family story</h2><p>Add people and connect them into a family unit. The tree will arrange itself here.</p></div> :
      <ReactFlow nodes={built.nodes} edges={built.edges} nodeTypes={nodeTypes} fitView minZoom={0.15} maxZoom={1.6} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnScroll zoomOnPinch zoomOnDoubleClick>
        <AutoFocus focusId={focusNode} graphKey={graphKey} />
        <Background variant={BackgroundVariant.Dots} gap={26} size={1.2} color="rgba(148,163,184,.22)" />
        <MiniMap className="family-minimap" pannable zoomable nodeColor={(node) => node.id === `unit:${tree.selectedRootFamilyUnitId}` ? '#f5b94c' : '#576079'} maskColor="rgba(7,10,18,.78)" />
        <Controls showInteractive={false} position="bottom-right" />
        <Panel position="top-left"><button type="button" className="canvas-search" onClick={onOpenSearch}><Search size={16} /> Find a family member <kbd>⌘ K</kbd></button></Panel>
      </ReactFlow>}
    </div>
  );
}
