import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { CanvasView } from "./CanvasView";
import { loadSnapshot } from "./loadSnapshot";
import type { CanvasSnapshot } from "./schema";

type Screen =
  | { kind: "picker" }
  | { kind: "refusal"; reason: string; fileName: string }
  | { kind: "canvas"; snapshot: CanvasSnapshot };

export function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [screen, setScreen] = useState<Screen>({ kind: "picker" });
  const readBytes = useCallback(async () => null, []);

  async function openFile(file: File) {
    const loaded = loadSnapshot(await file.text());
    if (!loaded.ok) {
      setScreen({ kind: "refusal", reason: loaded.reason, fileName: file.name });
      return;
    }
    setScreen({ kind: "canvas", snapshot: loaded.snapshot });
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    void openFile(file);
  }

  return (
    <>
      <input
        ref={inputRef}
        className={screen.kind === "picker" ? "picker-input" : "visually-hidden"}
        data-testid="snapshot-input"
        type="file"
        accept=".json,application/json"
        aria-label="Open snapshot"
        onChange={onPick}
      />
      {screen.kind === "picker" ? (
        <main className="picker">
          <h1>RPA comprehension canvas</h1>
          <p>Open a snapshot.json file. This page does not call Copilot or read XAML.</p>
        </main>
      ) : null}
      {screen.kind === "refusal" ? (
        <main className="picker">
          <h1>Cannot open {screen.fileName}</h1>
          <p data-testid="refusal">{screen.reason}</p>
          <button type="button" onClick={() => inputRef.current?.click()}>Open another snapshot</button>
        </main>
      ) : null}
      {screen.kind === "canvas" ? (
        <CanvasView
          snapshot={screen.snapshot}
          openedPath={null}
          readBytes={readBytes}
          onOpenAnother={() => inputRef.current?.click()}
        />
      ) : null}
    </>
  );
}
