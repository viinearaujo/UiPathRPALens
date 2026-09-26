import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs/lib/elk-api";

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 72;

const elk = new ELK();

export async function layoutConnected(
  nodes: { id: string; entry: boolean }[],
  edges: { source: string; target: string }[],
): Promise<Map<string, { x: number; y: number }>> {
  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "48",
      "elk.layered.spacing.nodeNodeBetweenLayers": "64",
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      layoutOptions: node.entry ? { "elk.layered.layering.layerConstraint": "FIRST" } : undefined,
    })),
    edges: edges.map((edge, index) => ({
      id: `e${index}`,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };
  const laid = await elk.layout(graph);
  const positions = new Map<string, { x: number; y: number }>();
  for (const child of laid.children ?? []) {
    positions.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }
  return positions;
}
