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
    const issues = result.error.issues;
    const first = issues[0];
    const path = first.path.map(String).join(".");
    const head = path.length > 0 ? `${path}: ${first.message}` : first.message;
    const extra = issues.length - 1;
    return {
      ok: false,
      reason: extra > 0 ? `${head} (and ${extra} more)` : head,
    };
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
