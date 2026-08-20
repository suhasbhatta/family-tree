import type { Edge, Node } from '@xyflow/react';
import type { FamilyTreeData, Person } from '../types/family';

export interface FamilyNodeData extends Record<string, unknown> {
  people: Person[];
  root: boolean;
  highlighted: boolean;
  selectedPersonId: string | null;
  onSelect: (id: string) => void;
}
export type FamilyNode = Node<FamilyNodeData, 'family'>;

export function buildTreeGraph(tree: FamilyTreeData, selectedPersonId: string | null, highlightedPath: string[], onSelect: (id: string) => void): { nodes: FamilyNode[]; edges: Edge[]; personNode: Map<string, string> } {
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
  const connections: Array<[string, string, string]> = []; const connectionKeys = new Set<string>();
  for (const unit of tree.familyUnits) for (const childId of unit.childrenIds) {
    const source = `unit:${unit.id}`; const target = personNode.get(childId); const key = `${source}|${target}`;
    if (target && target !== source && !connectionKeys.has(key)) { connectionKeys.add(key); connections.push([source, target, `${unit.id}:${childId}`]); }
  }
  const incoming = new Map<string, number>(); for (const [, target] of connections) incoming.set(target, (incoming.get(target) ?? 0) + 1);
  const rootNode = tree.selectedRootFamilyUnitId ? `unit:${tree.selectedRootFamilyUnitId}` : null;
  const nameOf = (id: string) => membersByNode.get(id)?.[0]?.name ?? '';
  const roots = [...membersByNode.keys()].filter((id) => !incoming.has(id)).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  if (rootNode && roots.includes(rootNode)) { roots.splice(roots.indexOf(rootNode), 1); roots.unshift(rootNode); }
  const highlighted = new Set(highlightedPath.map((id) => personNode.get(id)));
  const childrenByNode = new Map<string, string[]>();
  for (const [source, target] of connections) childrenByNode.set(source, [...(childrenByNode.get(source) ?? []), target]);
  for (const children of childrenByNode.values()) children.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));

  const nodeWidth = 350; const siblingGap = 70; const rootGap = 150; const levelGap = 250;
  const widthMemo = new Map<string, number>();
  const subtreeWidth = (id: string, ancestors = new Set<string>()): number => {
    const cached = widthMemo.get(id); if (cached !== undefined) return cached;
    if (ancestors.has(id)) return nodeWidth;
    const nextAncestors = new Set(ancestors); nextAncestors.add(id);
    const childWidths = (childrenByNode.get(id) ?? []).map((child) => subtreeWidth(child, nextAncestors));
    const width = Math.max(nodeWidth, childWidths.reduce((sum, childWidth) => sum + childWidth, 0) + Math.max(0, childWidths.length - 1) * siblingGap);
    widthMemo.set(id, width); return width;
  };
  const nodes: FamilyNode[] = []; const placed = new Set<string>();
  const placeSubtree = (id: string, left: number, level: number, ancestors = new Set<string>()) => {
    if (placed.has(id) || ancestors.has(id)) return;
    const width = subtreeWidth(id); const nextAncestors = new Set(ancestors); nextAncestors.add(id); placed.add(id);
    nodes.push({ id, type: 'family', position: { x: left + width / 2 - nodeWidth / 2, y: level * levelGap }, draggable: false, selectable: false, data: { people: membersByNode.get(id) ?? [], root: id === rootNode, highlighted: highlighted.has(id), selectedPersonId, onSelect } });
    const children = (childrenByNode.get(id) ?? []).filter((child) => !placed.has(child)); const childWidths = children.map((child) => subtreeWidth(child));
    const childSpan = childWidths.reduce((sum, childWidth) => sum + childWidth, 0) + Math.max(0, childWidths.length - 1) * siblingGap;
    let childLeft = left + (width - childSpan) / 2;
    children.forEach((child, index) => { placeSubtree(child, childLeft, level + 1, nextAncestors); childLeft += childWidths[index] + siblingGap; });
  };
  let cursor = 0;
  for (const root of roots) { placeSubtree(root, cursor, 0); cursor += subtreeWidth(root) + rootGap; }
  for (const id of [...membersByNode.keys()].sort((a, b) => nameOf(a).localeCompare(nameOf(b)))) if (!placed.has(id)) { placeSubtree(id, cursor, 0); cursor += subtreeWidth(id) + rootGap; }
  const totalWidth = Math.max(0, cursor - rootGap); for (const node of nodes) node.position.x -= totalWidth / 2;
  const activePairs = new Set<string>(); for (let index = 0; index < highlightedPath.length - 1; index += 1) activePairs.add(`${personNode.get(highlightedPath[index])}|${personNode.get(highlightedPath[index + 1])}`);
  const edges = connections.map(([source, target, id]) => ({ id, source, target, type: 'smoothstep', animated: activePairs.has(`${source}|${target}`) || activePairs.has(`${target}|${source}`), className: activePairs.has(`${source}|${target}`) || activePairs.has(`${target}|${source}`) ? 'relationship-edge' : '', style: { strokeWidth: 2 } }));
  return { nodes, edges, personNode };
}
