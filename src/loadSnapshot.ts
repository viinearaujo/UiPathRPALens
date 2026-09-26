import { canvasSnapshotSchema, type CanvasSnapshot } from "./schema";

export type LoadResult =
  | { ok: true; snapshot: CanvasSnapshot }
  | { ok: false; reason: string };

export function loadSnapshot(text: string): LoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: "The file is not JSON." };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: "The file is not JSON." };
  }
  const record = parsed as Record<string, unknown>;
  if (!Object.hasOwn(record, "schemaVersion") || record.schemaVersion !== 1) {
    return { ok: false, reason: "schemaVersion is missing or is not the number 1." };
  }
  for (const key of ["project", "nodes", "edges"] as const) {
    if (!Object.hasOwn(record, key)) {
      return { ok: false, reason: `${key} is missing.` };
    }
  }
  const result = canvasSnapshotSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, reason: result.error.issues.map((issue) => issue.message).join(" ") };
  }
  const seen = new Set<string>();
  for (const node of result.data.nodes) {
    if (seen.has(node.id)) {
      return { ok: false, reason: "Two nodes share an id." };
    }
    seen.add(node.id);
  }
  return { ok: true, snapshot: result.data };
}
