import { memo, useEffect, useMemo } from 'react';
import { Background, BackgroundVariant, Controls, Handle, MiniMap, Panel, Position, ReactFlow, useReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import { Crown, Heart, MapPin, Search, Sparkles } from 'lucide-react';
import type { FamilyTreeData, Person } from '../types/family';

interface FamilyNodeData extends Record<string, unknown> {
  people: Person[];
  root: boolean;
  highlighted: boolean;
  selectedPersonId: string | null;
  onSelect: (id: string) => void;
}
type FamilyNode = Node<FamilyNodeData, 'family'>;

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

function graph(tree: FamilyTreeData, selectedPersonId: string | null, highlightedPath: string[], onSelect: (id: string) => void): { nodes: FamilyNode[]; edges: Edge[]; personNode: Map<string, string> } {
  const personNode = new Map<string, string>();
  const peopleById = new Map(tree.people.map((person) => [person.id, person]));
  const membersByNode = new Map<string, Person[]>();
  for (const unit of tree.familyUnits) {
    const nodeId = `unit:${unit.id}`;
    const members = [unit.husbandId, unit.wifeId].map((id) => id ? peopleById.get(id) : null).filter((person): person is Person => Boolean(person));
    if (members.length) membersByNode.set(nodeId, members);
    for (const person of members) if (!personNode.has(person.id)) personNode.set(person.id, nodeId);
  }
  for (const person of tree.people) if (!personNode.has(person.id)) personNode.set(person.id, `person:${person.id}`);
  for (const person of tree.people) if (personNode.get(person.id)?.startsWith('person:')) membersByNode.set(`person:${person.id}`, [person]);
  const connections: Array<[string, string, string]> = [];
  for (const unit of tree.familyUnits) {
    const source = `unit:${unit.id}`;
    for (const childId of unit.childrenIds) { const target = personNode.get(childId); if (target && target !== source) connections.push([source, target, `${unit.id}:${childId}`]); }
  }
  const incoming = new Map<string, number>();
  for (const [, target] of connections) incoming.set(target, (incoming.get(target) ?? 0) + 1);
  const rootNode = tree.selectedRootFamilyUnitId ? `unit:${tree.selectedRootFamilyUnitId}` : null;
  const roots = [...membersByNode.keys()].filter((id) => !incoming.has(id));
  if (rootNode && roots.includes(rootNode)) {
    roots.splice(roots.indexOf(rootNode), 1);
    roots.unshift(rootNode);
  }
  const depth = new Map<string, number>(); const queue = roots.map((id) => ({ id, depth: 0 }));
  while (queue.length) { const current = queue.shift()!; if ((depth.get(current.id) ?? Infinity) <= current.depth) continue; depth.set(current.id, current.depth); for (const [source, target] of connections) if (source === current.id) queue.push({ id: target, depth: current.depth + 1 }); }
  for (const id of membersByNode.keys()) if (!depth.has(id)) depth.set(id, 0);
  const rows = new Map<number, string[]>(); for (const [id, level] of depth) rows.set(level, [...(rows.get(level) ?? []), id]);
  const highlighted = new Set(highlightedPath.map((id) => personNode.get(id)));
  const nodes: FamilyNode[] = [];
  for (const [level, ids] of [...rows.entries()].sort(([a], [b]) => a - b)) {
    ids.sort((a, b) => (membersByNode.get(a)?.[0]?.name ?? '').localeCompare(membersByNode.get(b)?.[0]?.name ?? ''));
    const width = (ids.length - 1) * 410;
    ids.forEach((id, index) => nodes.push({ id, type: 'family', position: { x: index * 410 - width / 2, y: level * 250 }, draggable: false, selectable: false, data: { people: membersByNode.get(id) ?? [], root: id === rootNode, highlighted: highlighted.has(id), selectedPersonId, onSelect } }));
  }
  const activePairs = new Set<string>(); for (let index = 0; index < highlightedPath.length - 1; index += 1) activePairs.add(`${personNode.get(highlightedPath[index])}|${personNode.get(highlightedPath[index + 1])}`);
  const edges = connections.map(([source, target, id]) => ({ id, source, target, type: 'smoothstep', animated: activePairs.has(`${source}|${target}`) || activePairs.has(`${target}|${source}`), className: activePairs.has(`${source}|${target}`) || activePairs.has(`${target}|${source}`) ? 'relationship-edge' : '', style: { strokeWidth: 2 } }));
  return { nodes, edges, personNode };
}

interface Props { tree: FamilyTreeData; selectedPersonId: string | null; focusPersonId: string | null; highlightedPath: string[]; onSelect: (id: string) => void; onOpenSearch: () => void }

export function TreeCanvas({ tree, selectedPersonId, focusPersonId, highlightedPath, onSelect, onOpenSearch }: Props) {
  const built = useMemo(() => graph(tree, selectedPersonId, highlightedPath, onSelect), [tree, selectedPersonId, highlightedPath, onSelect]);
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
