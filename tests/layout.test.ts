import { describe, expect, it } from "vitest";
import { layoutConnected } from "../src/layout";

describe("layoutConnected", () => {
  it("places the entry to the left of its callee", async () => {
    const positions = await layoutConnected(
      [
        { id: "Main.xaml", entry: true },
        { id: "Child.xaml", entry: false },
      ],
      [{ source: "Main.xaml", target: "Child.xaml" }],
    );
    const main = positions.get("Main.xaml");
    const child = positions.get("Child.xaml");
    expect(main).toBeTruthy();
    expect(child).toBeTruthy();
    expect(main?.x).toBeLessThanOrEqual(child?.x ?? 0);
  });
});
