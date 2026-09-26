import { z } from "zod";

const argumentSchema = z.looseObject({
  name: z.string(),
  direction: z.string(),
  type: z.string(),
});

const nodeSchema = z.looseObject({
  id: z.string(),
  kind: z.enum(["xaml", "coded"]),
  sha256: z.string(),
  arguments: z.array(argumentSchema),
  hasExceptionHandler: z.boolean(),
  parseError: z.nullable(z.string()),
  explanation: z.string(),
  decisions: z.array(z.string()),
});

const mappingSchema = z.looseObject({
  direction: z.string(),
  targetArgument: z.string(),
  expression: z.string(),
});

const edgeSchema = z.looseObject({
  sourceWorkflow: z.string(),
  targetWorkflow: z.string(),
  displayName: z.string(),
  isResolved: z.boolean(),
  argumentMappings: z.array(mappingSchema),
});

export const canvasSnapshotSchema = z.looseObject({
  schemaVersion: z.literal(1),
  generatedAt: z.string(),
  generator: z.looseObject({ mcpVersion: z.string() }),
  project: z.looseObject({
    name: z.string(),
    entryPoint: z.nullable(z.string()),
    additionalEntryPoints: z.array(z.string()),
    overview: z.string(),
  }),
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

export type CanvasSnapshot = z.infer<typeof canvasSnapshotSchema>;
export type SnapshotNode = CanvasSnapshot["nodes"][number];
export type SnapshotEdge = CanvasSnapshot["edges"][number];
