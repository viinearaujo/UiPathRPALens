# RPA Comprehension Canvas

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![RPA](https://img.shields.io/badge/RPA-UiPath-FA4616)

A local **React 19** page that draws a UiPath project's invoke map from a `snapshot.json` file. The build is **one HTML file**. You open it, pick the snapshot, and read the graph.

This is the **viewer (v1)** milestone. The page reads schema version `1` only. It has no Copilot client and no XAML parser.

**What you can do tonight**

- 🗺️ **Open a snapshot** — project name, entry point, generated time, and overview on one dark canvas
- 🔍 **Read a workflow** — explanation, arguments, decisions, exception handler, and parse error
- 🔗 **Follow the invoke map** — callers and callees, argument mappings, cycles, missing targets, and files nothing invokes

**Contents**

- [🏡 What this is](#what-this-is)
- [⚡ Quick start](#quick-start)
- [🧰 Prerequisites](#prerequisites)
- [📂 Open a snapshot](#open-a-snapshot)
- [🗺️ The map](#the-map)
- [📄 Snapshot file](#snapshot-file)
- [📦 Single-file build](#single-file-build)
- [🧪 Tests](#tests)
- [📁 Project layout](#project-layout)
- [📌 Notes and limits](#notes-and-limits)

---

## 🏡 What this is

A comprehension canvas for one UiPath project, drawn from a snapshot someone already wrote. The page title is **RPA Comprehension Canvas**.

- File picker on a dark page. Reload returns to the picker. Nothing is stored
- Connected workflows lay out left to right. Files with no invoke sit in an **Unconnected** group
- A side panel opens when you select a node or an edge
- `schemaVersion` must be the number `1`. Anything else is refused by name, and no graph is drawn

## ⚡ Quick start

```powershell
npm install
npm run dev
```

Vite prints a local URL (`http://127.0.0.1:5173` when that port is free). Open it and choose a snapshot. A sample the tests already load is `tests/fixtures/valid.json`.

```powershell
npm test
npm run build
npm run check:singlefile
```

> 💡 **Tip:** `npm run dev` is the live page. `dist/index.html` after `npm run build` is the file you can open or hand to someone. Both read the same snapshot.

## 🧰 Prerequisites

- [Node.js](https://nodejs.org/) `^20.19.0` or `>=22.12.0` (what Vite 8 requires)
- npm
- A current browser
- Playwright's Chromium, only for the end-to-end tests

Check your toolchain:

```powershell
node --version
npm --version
```

Install the browser once before `npm run test:e2e`:

```powershell
npx playwright install chromium
```

## 📂 Open a snapshot

The picker accepts `.json`. `loadSnapshot` refuses the file, names the reason, and draws no graph when:

- the text is not a JSON object
- `schemaVersion` is missing or is not the number `1`
- `project`, `nodes`, or `edges` is missing
- the body fails the Zod schema (the message includes the first path and a count of any further issues)
- two nodes share an `id`

A good file shows the project name, the main entry point (or **No main entry point**), `generatedAt`, and the overview. An empty overview reads **Overview was not written.**

**Open another snapshot** stays on the loaded page. Canceling the dialog leaves the current map in place.

## 🗺️ The map

ELK lays out connected nodes in layers, left to right. The main entry is pinned to the first layer. The **Unconnected** group sits to the right of that map.

| What you see | Meaning |
| --- | --- |
| **Entry** | `project.entryPoint`, and that id is a node |
| **Additional entry** | id listed in `project.additionalEntryPoints` |
| **Cycle** | member of a cycle on **resolved** edges between known nodes, including a self-loop |
| **Missing** | an edge names this id, and no node has it |
| Dashed edge | `isResolved` is false |
| Dimmed node | the file-name filter is set and this id does not contain it |

The filter is a case-insensitive substring of the node id. Matches stay at full opacity. Other nodes drop to 25%.

Select a node for kind (`xaml` or `coded`), explanation, arguments (`name`, `direction`, `type`), decisions, exception handler, and parse error. An empty explanation reads **Explanation was not written.** Caller and callee buttons jump to that node and fit it in view.

Select an edge label for `displayName` and argument mappings (`direction`, `targetArgument`, `expression`). Several edges between the same pair stack their labels.

> ✅ **Green path:** open `tests/fixtures/valid.json`. You should see **Dispatch**, entry **Main.xaml**, a **Cycle** badge on `CycleA.xaml` and `CycleB.xaml`, **Missing** on `Missing.xaml`, and `Orphan.xaml` plus `Helper.cs` inside **Unconnected**.

## 📄 Snapshot file

Contract: [`schema/canvas-snapshot.schema.json`](schema/canvas-snapshot.schema.json) and the Zod schema in `src/schema.ts`. Extra properties are kept. Required shape:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-09-26T16:00:00Z",
  "generator": { "mcpVersion": "9.9.9" },
  "project": {
    "name": "Dispatch",
    "entryPoint": "Main.xaml",
    "additionalEntryPoints": [],
    "overview": "Reads the queue and dispatches work."
  },
  "nodes": [
    {
      "id": "Main.xaml",
      "kind": "xaml",
      "sha256": "17ab370c8c4acebf3ac18de004d3d50e5b40e4b6b415193f90a77a7174d6ce25",
      "arguments": [{ "name": "in_Config", "direction": "In", "type": "Dictionary<String,Object>" }],
      "hasExceptionHandler": true,
      "parseError": null,
      "explanation": "Starts the process.",
      "decisions": ["Route by status"]
    }
  ],
  "edges": [
    {
      "sourceWorkflow": "Main.xaml",
      "targetWorkflow": "Child.xaml",
      "displayName": "Run child",
      "isResolved": true,
      "argumentMappings": []
    }
  ]
}
```

`kind` is `xaml` or `coded`. `entryPoint` may be `null`. `parseError` is a string or `null`. Node `id` values are project-relative paths such as `Main.xaml` or `Helper.cs`.

The freshness check expects the snapshot at `<project>/.canvas/snapshot.json`. See [Notes and limits](#notes-and-limits).

## 📦 Single-file build

```powershell
npm run build
npm run check:singlefile
```

`vite-plugin-singlefile` inlines the script and CSS into `dist/index.html` (`base` is `./`). `check:singlefile` fails if that HTML references an external `.js` file, or if `dist/assets` still contains `.js` or `.css`.

Serve the built file the way the smoke test does:

```powershell
node scripts/serve-dist.mjs
```

That listens on `http://127.0.0.1:4179`. Set `PORT` to use another port. You can also open `dist/index.html` directly.

## 🧪 Tests

```powershell
npm test
npm run test:e2e
```

`npm test` is Vitest. `npm run test:e2e` is Playwright against `npm run dev` on `http://127.0.0.1:4178`. The built-file smoke starts `scripts/serve-dist.mjs` on port `4179` and needs `dist/index.html` first (`npm run build`).

| Project | Covers |
| --- | --- |
| `tests/loadSnapshot.test.ts` | Valid and null-entry snapshots, non-JSON, wrong `schemaVersion`, missing `nodes`, duplicate ids, schema error text, published `schemaVersion` const `1`. |
| `tests/graph.test.ts` | Entry, cycle, orphan, coded file, missing endpoint, null entry with an additional entry, one synthetic node for a repeated missing target, self-loop as a cycle. |
| `tests/layout.test.ts` | Entry placed to the left of its callee. |
| `tests/freshness.test.ts` | SHA-256 of `hello`, Windows snapshot path, stale only when the path ends in `/.canvas/snapshot.json` and the bytes differ. |
| `e2e/` | Dark picker, loaded map, panels, filter, null entry, named refusals, built single-file smoke. |

## 📁 Project layout

```
src/
  App.tsx            # picker, refusal, canvas
  CanvasView.tsx     # React Flow map, filter, side panel
  nodes.tsx          # workflow node and Unconnected group
  graph.ts           # entry, cycle, missing, unconnected
  layout.ts          # ELK layered layout
  schema.ts          # Zod snapshot (schema version 1)
  loadSnapshot.ts    # parse and refuse
  freshness.ts       # SHA-256 compare for .canvas/snapshot.json
schema/
  canvas-snapshot.schema.json
tests/               # Vitest and snapshot fixtures
e2e/                 # Playwright
scripts/             # single-file check and dist server
```

## 📌 Notes and limits

**Snapshot only.** The page reads the JSON you pick. It has no Copilot client, no XAML parser, and no project write. Reload shows the picker again.

**Refusals.** A bad file stays on the refusal screen with the reason in view. The map is absent until a snapshot parses.

**Unconnected.** A node with no edge touching it goes in the **Unconnected** group. That includes orphans and coded files nothing invokes. A missing endpoint is a synthetic node, badged **Missing**, and unconnected.

**Cycles and dashed edges.** Cycle membership uses resolved edges whose source and target are both real nodes. An unresolved edge is drawn dashed and does not create a cycle.

**Layout.** Connected nodes use ELK `layered`, direction `RIGHT`. The main entry is forced into the first layer. With no entry, roots are known connected nodes that have no incoming resolved edge, sorted by id. Nodes are not draggable.

**Filter.** The box matches the node id. It does not hide nodes, and it does not search explanations.

**Freshness.** `staleNodeIds` hashes each workflow file and compares it to `sha256` only when the opened path ends with `/.canvas/snapshot.json` (Windows `\` paths count). A missing file is left alone. A copy saved somewhere else is left alone. The file picker supplies no path and no file bytes, so the shipped page does not show **Stale file**.

**Single file.** Hand people `dist/index.html` after `npm run build` and `npm run check:singlefile`. Dev mode still uses Vite's module server.

**Not in this page.** Generating the snapshot, editing workflows, and talking to UiPath CLI or Orchestrator belong to the tool that writes `snapshot.json`.
