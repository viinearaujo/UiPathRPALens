import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeMap } from "../src/graph";
import { loadSnapshot } from "../src/loadSnapshot";

function load(name: string) {
  const text = readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
  const result = loadSnapshot(text);
  if (!result.ok) {
    throw new Error(result.reason);
  }
  return result.snapshot;
}

describe("analyzeMap", () => {
  it("marks the entry, the cycle, the orphan, the coded file, and the missing endpoint", () => {
    const map = analyzeMap(load("valid.json"));
    const byId = new Map(map.nodes.map((node) => [node.id, node]));
    expect(map.entryId).toBe("Main.xaml");
    expect(map.layoutRoots).toEqual(["Main.xaml"]);
    expect(byId.get("Main.xaml")).toMatchObject({ entry: true, unconnected: false, cycle: false, missing: false });
    expect(byId.get("CycleA.xaml")?.cycle).toBe(true);
    expect(byId.get("CycleB.xaml")?.cycle).toBe(true);
    expect(byId.get("Orphan.xaml")).toMatchObject({ unconnected: true, missing: false });
    expect(byId.get("Helper.cs")).toMatchObject({ unconnected: true, missing: false });
    expect(byId.get("Missing.xaml")).toMatchObject({ unconnected: true, missing: true, snapshot: null });
    expect(byId.get("Child.xaml")?.unconnected).toBe(false);
  });

  it("has no entry mark when entryPoint is null and badges the additional entry", () => {
    const map = analyzeMap(load("null-entry.json"));
    expect(map.entryId).toBeNull();
    expect(map.layoutRoots).toEqual([]);
    expect(map.nodes).toEqual([
      expect.objectContaining({ id: "Entry.cs", entry: false, additionalEntry: true, unconnected: true }),
    ]);
  });

  it("adds one synthetic node when multiple edges reference the same missing target", () => {
    const snapshot = structuredClone(load("valid.json"));
    snapshot.edges.push({
      sourceWorkflow: "Child.xaml",
      targetWorkflow: "Missing.xaml",
      displayName: "Also missing",
      isResolved: false,
      argumentMappings: [],
    });
    const map = analyzeMap(snapshot);
    const missing = map.nodes.filter((node) => node.id === "Missing.xaml" && node.missing);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toMatchObject({ id: "Missing.xaml", missing: true, snapshot: null });
  });

  it("marks a self-loop as a cycle member", () => {
    const loaded = loadSnapshot(JSON.stringify({
      schemaVersion: 1,
      generatedAt: "2026-09-26T16:00:00Z",
      generator: { mcpVersion: "9.9.9" },
      project: { name: "Loop", entryPoint: null, additionalEntryPoints: [], overview: "" },
      nodes: [{
        id: "Loop.xaml",
        kind: "xaml",
        sha256: "aa",
        arguments: [],
        hasExceptionHandler: false,
        parseError: null,
        explanation: "",
        decisions: [],
      }],
      edges: [{
        sourceWorkflow: "Loop.xaml",
        targetWorkflow: "Loop.xaml",
        displayName: "Again",
        isResolved: true,
        argumentMappings: [],
      }],
    }));
    if (!loaded.ok) {
      throw new Error(loaded.reason);
    }
    const map = analyzeMap(loaded.snapshot);
    expect(map.nodes[0]).toMatchObject({ id: "Loop.xaml", cycle: true, unconnected: false });
  });
});
