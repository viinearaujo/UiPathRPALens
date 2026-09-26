import type { CanvasSnapshot, SnapshotEdge, SnapshotNode } from "./schema";

export type MapNode = {
  id: string;
  missing: boolean;
  unconnected: boolean;
  cycle: boolean;
  entry: boolean;
  additionalEntry: boolean;
  snapshot: SnapshotNode | null;
};

export type AnalyzedMap = {
  nodes: MapNode[];
  edges: SnapshotEdge[];
  entryId: string | null;
  layoutRoots: string[];
};

export function analyzeMap(snapshot: CanvasSnapshot): AnalyzedMap {
  const known = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const incident = new Set<string>();
  const missingIds: string[] = [];
  const seenMissing = new Set<string>();
  for (const edge of snapshot.edges) {
    for (const endpoint of [edge.sourceWorkflow, edge.targetWorkflow]) {
      if (known.has(endpoint)) {
        incident.add(endpoint);
      } else if (seenMissing.add(endpoint)) {
        missingIds.push(endpoint);
      }
    }
  }

  const resolved = snapshot.edges.filter(
    (edge) => edge.isResolved && known.has(edge.sourceWorkflow) && known.has(edge.targetWorkflow),
  );
  const cycles = cycleMembers(
    [...known.keys()],
    resolved.map((edge) => ({ source: edge.sourceWorkflow, target: edge.targetWorkflow })),
  );
  const entryId = snapshot.project.entryPoint !== null && known.has(snapshot.project.entryPoint)
    ? snapshot.project.entryPoint
    : null;
  const additional = new Set(snapshot.project.additionalEntryPoints.filter((id) => known.has(id)));
  const nodes: MapNode[] = [
    ...snapshot.nodes.map((node) => ({
      id: node.id,
      missing: false,
      unconnected: !incident.has(node.id),
      cycle: cycles.has(node.id),
      entry: node.id === entryId,
      additionalEntry: additional.has(node.id),
      snapshot: node,
    })),
    ...missingIds.map((id) => ({
      id,
      missing: true,
      unconnected: true,
      cycle: false,
      entry: false,
      additionalEntry: false,
      snapshot: null,
    })),
  ];
  const unconnected = new Set(nodes.filter((node) => node.unconnected).map((node) => node.id));
  const incoming = new Set(resolved.map((edge) => edge.targetWorkflow));
  const layoutRoots = entryId
    ? [entryId]
    : nodes
        .map((node) => node.id)
        .filter((id) => known.has(id) && !unconnected.has(id) && !incoming.has(id))
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  return { nodes, edges: snapshot.edges, entryId, layoutRoots };
}

function cycleMembers(nodeIds: string[], edges: { source: string; target: string }[]): Set<string> {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const members = new Set<string>();
  const adjacent = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
  const self = new Set<string>();
  for (const edge of edges) {
    if (!adjacent.has(edge.source) || !adjacent.has(edge.target)) {
      continue;
    }
    adjacent.get(edge.source)?.push(edge.target);
    if (edge.source === edge.target) {
      self.add(edge.source);
    }
  }
  let next = 0;

  function strong(vertex: string): void {
    index.set(vertex, next);
    low.set(vertex, next);
    next += 1;
    stack.push(vertex);
    onStack.add(vertex);
    for (const target of adjacent.get(vertex) ?? []) {
      if (!index.has(target)) {
        strong(target);
        low.set(vertex, Math.min(low.get(vertex) ?? 0, low.get(target) ?? 0));
      } else if (onStack.has(target)) {
        low.set(vertex, Math.min(low.get(vertex) ?? 0, index.get(target) ?? 0));
      }
    }
    if (low.get(vertex) === index.get(vertex)) {
      const component: string[] = [];
      let current = "";
      do {
        current = stack.pop() ?? "";
        onStack.delete(current);
        component.push(current);
      } while (current !== vertex);
      if (component.length > 1) {
        for (const id of component) {
          members.add(id);
        }
      }
    }
  }

  for (const id of nodeIds) {
    if (!index.has(id)) {
      strong(id);
    }
  }
  for (const id of self) {
    members.add(id);
  }
  return members;
}
