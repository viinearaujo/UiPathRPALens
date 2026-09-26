import { describe, expect, it } from "vitest";
import { projectDirFromSnapshotPath, sha256Hex, staleNodeIds } from "../src/freshness";
import type { CanvasSnapshot } from "../src/schema";

const hello = new TextEncoder().encode("hello");
const helloSha = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";

function snapshot(sha: string): CanvasSnapshot {
  return {
    schemaVersion: 1,
    generatedAt: "2026-09-26T16:00:00Z",
    generator: { mcpVersion: "9.9.9" },
    project: { name: "Dispatch", entryPoint: "Main.xaml", additionalEntryPoints: [], overview: "" },
    nodes: [{
      id: "Main.xaml",
      kind: "xaml",
      sha256: sha,
      arguments: [],
      hasExceptionHandler: false,
      parseError: null,
      explanation: "",
      decisions: [],
    }],
    edges: [],
  };
}

describe("freshness", () => {
  it("hashes hello to the known SHA-256 hex", async () => {
    expect(await sha256Hex(hello)).toBe(helloSha);
  });

  it("accepts a Windows snapshot path", () => {
    expect(projectDirFromSnapshotPath("C:\\proj\\.canvas\\snapshot.json")).toBe("C:/proj");
    expect(projectDirFromSnapshotPath("C:/proj/copy.json")).toBeNull();
  });

  it("marks a readable mismatch and ignores copies and missing files", async () => {
    const files = new Map<string, Uint8Array>([["C:/proj/Main.xaml", hello]]);
    const readBytes = async (path: string) => files.get(path) ?? null;
    expect(await staleNodeIds(snapshot(helloSha), null, readBytes)).toEqual(new Set());
    expect(await staleNodeIds(snapshot(helloSha), "C:/proj/copy.json", readBytes)).toEqual(new Set());
    expect(await staleNodeIds(snapshot(helloSha), "C:/proj/.canvas/snapshot.json", readBytes)).toEqual(new Set());
    expect(await staleNodeIds(snapshot("ab"), "C:/proj/.canvas/snapshot.json", readBytes)).toEqual(new Set(["Main.xaml"]));
    expect(await staleNodeIds(snapshot("ab"), "C:/other/.canvas/snapshot.json", readBytes)).toEqual(new Set());
  });
});
