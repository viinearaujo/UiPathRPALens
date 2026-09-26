import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadSnapshot } from "../src/loadSnapshot";

function read(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

describe("loadSnapshot", () => {
  it("accepts the valid snapshot and the null-entry snapshot", () => {
    const valid = loadSnapshot(read("valid.json"));
    const coded = loadSnapshot(read("null-entry.json"));
    expect(valid.ok).toBe(true);
    expect(coded.ok).toBe(true);
    if (valid.ok && coded.ok) {
      expect(valid.snapshot.project.name).toBe("Dispatch");
      expect(valid.snapshot.project.entryPoint).toBe("Main.xaml");
      expect(coded.snapshot.project.entryPoint).toBeNull();
      expect(coded.snapshot.project.additionalEntryPoints).toEqual(["Entry.cs"]);
    }
  });

  it("refuses invalid JSON", () => {
    const result = loadSnapshot(read("invalid.txt"));
    expect(result).toEqual({ ok: false, reason: "The file is not JSON." });
  });

  it("refuses a schemaVersion that is not the number 1", () => {
    const result = loadSnapshot(read("wrong-version.json"));
    expect(result).toEqual({ ok: false, reason: "schemaVersion is missing or is not the number 1." });
  });

  it("refuses a missing nodes array", () => {
    const result = loadSnapshot(read("missing-nodes.json"));
    expect(result).toEqual({ ok: false, reason: "nodes is missing." });
  });

  it("refuses duplicate node ids", () => {
    const result = loadSnapshot(read("duplicate-id.json"));
    expect(result).toEqual({ ok: false, reason: "Two nodes share an id." });
  });

  it("formats other schema failures with path and remaining count", () => {
    const bad = JSON.parse(read("valid.json")) as { nodes: Array<{ kind: string }> };
    bad.nodes[0].kind = "workflow";
    const result = loadSnapshot(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/^nodes\.0\.kind: /);
      expect(result.reason).not.toBe("The file is not JSON.");
      expect(result.reason).not.toBe("schemaVersion is missing or is not the number 1.");
      expect(result.reason).not.toBe("project is missing.");
      expect(result.reason).not.toBe("nodes is missing.");
      expect(result.reason).not.toBe("edges is missing.");
      expect(result.reason).not.toBe("Two nodes share an id.");
    }
  });

  it("publishes schemaVersion const 1", () => {
    const schema = JSON.parse(readFileSync(new URL("../schema/canvas-snapshot.schema.json", import.meta.url), "utf8"));
    expect(schema.properties.schemaVersion.const).toBe(1);
    expect(schema.required).toEqual(["schemaVersion", "generatedAt", "generator", "project", "nodes", "edges"]);
  });
});
