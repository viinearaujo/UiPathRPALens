export function App() {
  return (
    <main className="picker">
      <h1>RPA comprehension canvas</h1>
      <p>Open a snapshot.json file. This page does not call Copilot or read XAML.</p>
      <input className="picker-input" data-testid="snapshot-input" type="file" accept=".json,application/json" aria-label="Open snapshot" />
    </main>
  );
}
