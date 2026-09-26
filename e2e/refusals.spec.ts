import { expect, test } from "@playwright/test";

test("null entry point badges the additional entry and leaves the overview empty", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("snapshot-input").setInputFiles("tests/fixtures/null-entry.json");
  await expect(page.getByTestId("project-name")).toHaveText("CodedFirst");
  await expect(page.getByTestId("entry-point")).toHaveText("No main entry point");
  await expect(page.getByTestId("overview")).toHaveText("Overview was not written.");
  await expect(page.getByTestId("node-Entry.cs")).toContainText("Additional entry");
  await expect(page.getByText("Entry", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("node-Entry.cs")).toHaveAttribute("data-unconnected", "true");
});

test("refusals name the reason and draw no graph", async ({ page }) => {
  const cases = [
    ["tests/fixtures/invalid.txt", "The file is not JSON."],
    ["tests/fixtures/wrong-version.json", "schemaVersion is missing or is not the number 1."],
    ["tests/fixtures/duplicate-id.json", "Two nodes share an id."],
    ["tests/fixtures/missing-nodes.json", "nodes is missing."],
  ] as const;
  for (const [file, reason] of cases) {
    await page.goto("/");
    await page.getByTestId("snapshot-input").setInputFiles(file);
    await expect(page.getByTestId("refusal")).toHaveText(reason);
    await expect(page.locator(".react-flow")).toHaveCount(0);
  }
});
