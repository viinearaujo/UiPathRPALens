import type { CanvasSnapshot } from "./schema";

export function projectDirFromSnapshotPath(openedPath: string): string | null {
  const normalized = openedPath.replaceAll("\\", "/");
  const suffix = "/.canvas/snapshot.json";
  if (!normalized.toLowerCase().endsWith(suffix)) {
    return null;
  }
  return normalized.slice(0, -suffix.length);
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const hash = await crypto.subtle.digest("SHA-256", copy);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function staleNodeIds(
  snapshot: CanvasSnapshot,
  openedPath: string | null,
  readBytes: (absolutePath: string) => Promise<Uint8Array | null>,
): Promise<Set<string>> {
  if (!openedPath) {
    return new Set();
  }
  const project = projectDirFromSnapshotPath(openedPath);
  if (!project) {
    return new Set();
  }
  const stale = new Set<string>();
  for (const node of snapshot.nodes) {
    const relative = node.id.replaceAll("\\", "/").replace(/^\//, "");
    const bytes = await readBytes(`${project}/${relative}`);
    if (!bytes) {
      continue;
    }
    const digest = await sha256Hex(bytes);
    if (digest !== node.sha256.toLowerCase()) {
      stale.add(node.id);
    }
  }
  return stale;
}
