import { useEffect, useMemo, useState } from "react";
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  getBezierPath,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { analyzeMap, type MapNode } from "./graph";
import { staleNodeIds } from "./freshness";
import { NODE_HEIGHT, NODE_WIDTH, layoutConnected } from "./layout";
import { UnconnectedGroupView, WorkflowNodeView, type WorkflowNodeData } from "./nodes";
import type { CanvasSnapshot, SnapshotEdge } from "./schema";

const nodeTypes = { workflow: WorkflowNodeView, unconnected: UnconnectedGroupView };

const edgeLabelSelect = { current: null as ((id: string) => void) | null };

function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="edge-label nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            onClick={(event) => {
              event.stopPropagation();
              edgeLabelSelect.current?.(id);
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const edgeTypes = { labeled: LabeledEdge };

type Selection = { kind: "none" } | { kind: "node"; id: string } | { kind: "edge"; id: string };

export function CanvasView(props: {
  snapshot: CanvasSnapshot;
  openedPath: string | null;
  readBytes: (absolutePath: string) => Promise<Uint8Array | null>;
  onOpenAnother: () => void;
}) {
  return (
    <ReactFlowProvider>
      <CanvasBody {...props} />
    </ReactFlowProvider>
  );
}

function CanvasBody({
  snapshot,
  openedPath,
  readBytes,
  onOpenAnother,
}: {
  snapshot: CanvasSnapshot;
  openedPath: string | null;
  readBytes: (absolutePath: string) => Promise<Uint8Array | null>;
  onOpenAnother: () => void;
}) {
  const map = useMemo(() => analyzeMap(snapshot), [snapshot]);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [stale, setStale] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [selection, setSelection] = useState<Selection>({ kind: "none" });
  const flow = useReactFlow();
  edgeLabelSelect.current = (id) => setSelection({ kind: "edge", id });

  useEffect(() => {
    let cancelled = false;
    const connected = map.nodes.filter((node) => !node.unconnected);
    const connectedIds = new Set(connected.map((node) => node.id));
    const layoutEdges = map.edges
      .filter((edge) => connectedIds.has(edge.sourceWorkflow) && connectedIds.has(edge.targetWorkflow))
      .map((edge) => ({ source: edge.sourceWorkflow, target: edge.targetWorkflow }));
    void layoutConnected(
      connected.map((node) => ({ id: node.id, entry: node.id === map.entryId })),
      layoutEdges,
    ).then((next) => {
      if (!cancelled) {
        setPositions(next);
      }
    });
    void staleNodeIds(snapshot, openedPath, readBytes).then((next) => {
      if (!cancelled) {
        setStale(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [map, openedPath, readBytes, snapshot]);

  const query = filter.trim().toLowerCase();
  const dimmed = (id: string) => query.length > 0 && !id.toLowerCase().includes(query);
  const unconnected = map.nodes.filter((node) => node.unconnected);
  const connected = map.nodes.filter((node) => !node.unconnected);
  let maxX = 0;
  for (const position of positions.values()) {
    maxX = Math.max(maxX, position.x);
  }
  const groupX = connected.length === 0 ? 0 : maxX + NODE_WIDTH + 80;
  const groupHeight = 48 + unconnected.length * (NODE_HEIGHT + 16);
  const flowNodes: Node[] = [];
  if (unconnected.length > 0) {
    flowNodes.push({
      id: "unconnected-group",
      type: "unconnected",
      position: { x: groupX, y: 0 },
      data: {},
      style: { width: 240, height: groupHeight, background: "#12161d" },
      width: 240,
      height: groupHeight,
      selectable: false,
      draggable: false,
    });
    unconnected.forEach((node, index) => {
      flowNodes.push(toFlowNode(node, { x: 20, y: 40 + index * (NODE_HEIGHT + 16) }, dimmed(node.id), "unconnected-group"));
    });
  }
  for (const node of connected) {
    flowNodes.push(toFlowNode(node, positions.get(node.id) ?? { x: 0, y: 0 }, dimmed(node.id)));
  }
  const flowEdges: Edge[] = map.edges.map((edge, index) => ({
    id: edgeId(edge, index),
    type: "labeled",
    source: edge.sourceWorkflow,
    target: edge.targetWorkflow,
    label: edge.displayName,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#8b93a7" },
    style: { stroke: "#8b93a7", strokeDasharray: edge.isResolved ? undefined : "6 4" },
    data: edge,
  }));

  function selectNode(id: string) {
    setSelection({ kind: "node", id });
    void flow.fitView({ nodes: [{ id }], duration: 200, padding: 0.4 });
  }

  const selectedNode = selection.kind === "node" ? map.nodes.find((node) => node.id === selection.id) ?? null : null;
  const selectedEdge = selection.kind === "edge"
    ? map.edges.find((edge, index) => edgeId(edge, index) === selection.id) ?? null
    : null;
  const overview = snapshot.project.overview.trim().length > 0
    ? snapshot.project.overview
    : "Overview was not written.";

  return (
    <main className="loaded">
      <header>
        <h1 data-testid="project-name">{snapshot.project.name}</h1>
        <p data-testid="entry-point">{snapshot.project.entryPoint ?? "No main entry point"}</p>
        <p data-testid="generated-at">{snapshot.generatedAt}</p>
        <button type="button" onClick={onOpenAnother}>Open another snapshot</button>
      </header>
      <section className="overview" data-testid="overview">{overview}</section>
      <div className="toolbar">
        <label>
          Filter by file name
          <input data-testid="file-filter" value={filter} onChange={(event) => setFilter(event.target.value)} />
        </label>
      </div>
      <div className="canvas-body">
        <div className="map-wrap">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            colorMode="dark"
            style={{ background: "#12161d", width: "100%", height: 520 }}
            onNodeClick={(_, node) => {
              if (node.id !== "unconnected-group") {
                selectNode(node.id);
              }
            }}
            onEdgeClick={(_, edge) => setSelection({ kind: "edge", id: edge.id })}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        <aside className="side-panel">
          {selectedNode ? (
            <NodePanel node={selectedNode} stale={stale.has(selectedNode.id)} edges={map.edges} onSelect={selectNode} />
          ) : null}
          {selectedEdge ? <EdgePanel edge={selectedEdge} /> : null}
          {!selectedNode && !selectedEdge ? <p>Select a node or edge.</p> : null}
        </aside>
      </div>
    </main>
  );
}

function toFlowNode(node: MapNode, position: { x: number; y: number }, dimmed: boolean, parentId?: string): Node<WorkflowNodeData> {
  return {
    id: node.id,
    type: "workflow",
    position,
    parentId,
    extent: parentId ? "parent" : undefined,
    data: {
      title: node.id,
      badges: badges(node),
      dimmed,
      unconnected: node.unconnected,
    },
    draggable: false,
  };
}

function badges(node: MapNode): string[] {
  const list: string[] = [];
  if (node.entry) {
    list.push("Entry");
  }
  if (node.additionalEntry) {
    list.push("Additional entry");
  }
  if (node.cycle) {
    list.push("Cycle");
  }
  if (node.missing) {
    list.push("Missing");
  }
  return list;
}

function edgeId(edge: SnapshotEdge, index: number): string {
  return `${edge.sourceWorkflow}->${edge.targetWorkflow}#${index}`;
}

function NodePanel({
  node,
  stale,
  edges,
  onSelect,
}: {
  node: MapNode;
  stale: boolean;
  edges: SnapshotEdge[];
  onSelect: (id: string) => void;
}) {
  const snapshot = node.snapshot;
  const callers = edges.filter((edge) => edge.targetWorkflow === node.id).map((edge) => edge.sourceWorkflow);
  const callees = edges.filter((edge) => edge.sourceWorkflow === node.id).map((edge) => edge.targetWorkflow);
  const explanation = snapshot && snapshot.explanation.trim().length > 0
    ? snapshot.explanation
    : "Explanation was not written.";
  return (
    <div data-testid="node-panel">
      <h2>{node.id}</h2>
      {snapshot ? <p>Kind: {snapshot.kind}</p> : <p>Missing</p>}
      <p>{explanation}</p>
      {snapshot ? (
        <>
          <p>Arguments: {snapshot.arguments.length === 0 ? "none" : snapshot.arguments.map((argument) => `${argument.name} ${argument.direction} ${argument.type}`).join(", ")}</p>
          <p>Decisions: {snapshot.decisions.length === 0 ? "none" : snapshot.decisions.join(", ")}</p>
          <p>Exception handler: {snapshot.hasExceptionHandler ? "yes" : "no"}</p>
          {snapshot.parseError ? <p>Parse error: {snapshot.parseError}</p> : null}
        </>
      ) : null}
      {node.additionalEntry ? <p>Additional entry</p> : null}
      {stale ? <p>Stale file</p> : null}
      <div>
        {callers.map((id) => (
          <button key={`caller-${id}`} type="button" onClick={() => onSelect(id)}>caller {id}</button>
        ))}
        {callees.map((id) => (
          <button key={`callee-${id}`} type="button" onClick={() => onSelect(id)}>callee {id}</button>
        ))}
      </div>
    </div>
  );
}

function EdgePanel({ edge }: { edge: SnapshotEdge }) {
  return (
    <div data-testid="edge-panel">
      <h2>{edge.displayName}</h2>
      {edge.argumentMappings.length === 0 ? <p>No argument mappings.</p> : null}
      <ul>
        {edge.argumentMappings.map((mapping) => (
          <li key={`${mapping.direction}-${mapping.targetArgument}-${mapping.expression}`}>
            {mapping.direction} {mapping.targetArgument} {mapping.expression}
          </li>
        ))}
      </ul>
    </div>
  );
}
