import { expect, test } from "@playwright/test";
import { parseCssColor, relativeLuminance } from "../src/luminance";

async function luminance(page: import("@playwright/test").Page, selector: string): Promise<number> {
  const css = await page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor);
  const [r, g, b] = parseCssColor(css);
  return relativeLuminance(r, g, b);
}

test("loaded snapshot shows the map, panels, filter, and dark surfaces", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("snapshot-input").setInputFiles("tests/fixtures/valid.json");
  await expect(page.getByTestId("project-name")).toHaveText("Dispatch");
  await expect(page.getByTestId("entry-point")).toHaveText("Main.xaml");
  await expect(page.getByTestId("generated-at")).toHaveText("2026-09-26T16:00:00Z");
  await expect(page.getByTestId("overview")).toHaveText("Reads the queue and dispatches work.");
  await expect(page.getByTestId("node-Main.xaml")).toContainText("Entry");
  await expect(page.getByTestId("node-CycleA.xaml")).toContainText("Cycle");
  await expect(page.getByTestId("node-Orphan.xaml")).toHaveAttribute("data-unconnected", "true");
  await expect(page.getByTestId("node-Helper.cs")).toHaveAttribute("data-unconnected", "true");
  await expect(page.getByTestId("node-Missing.xaml")).toContainText("Missing");
  await expect(page.getByText("Unconnected")).toBeVisible();
  expect(await luminance(page, "body")).toBeLessThan(0.25);
  expect(await luminance(page, ".react-flow")).toBeLessThan(0.25);
  expect(await luminance(page, ".side-panel")).toBeLessThan(0.25);
  await expect(page.getByRole("button", { name: /theme/i })).toHaveCount(0);

  await page.getByTestId("node-Child.xaml").click();
  await expect(page.getByTestId("node-panel")).toContainText("Explanation was not written.");
  await page.getByRole("button", { name: "caller Main.xaml" }).click();
  await expect(page.getByTestId("node-panel")).toContainText("Starts the process.");
  await expect(page.getByTestId("node-panel")).toContainText("in_Config");
  await expect(page.getByTestId("node-panel")).toContainText("Exception handler: yes");
  await expect(page.getByTestId("node-panel")).toContainText("Route by status");

  await page.getByText("Run grand").click();
  await expect(page.getByTestId("edge-panel")).toContainText("In");
  await expect(page.getByTestId("edge-panel")).toContainText("in_Config");
  await expect(page.getByTestId("edge-panel")).toContainText("[Config]");

  await page.getByTestId("node-Grand.xaml").click();
  await expect(page.getByTestId("node-panel")).toContainText("Invalid XML at line 5.");

  await page.getByTestId("file-filter").fill("Orphan");
  await expect(page.getByTestId("node-Orphan.xaml")).toHaveCSS("opacity", "1");
  await expect(page.getByTestId("node-Main.xaml")).toHaveCSS("opacity", "0.25");

  await page.locator("[data-testid='snapshot-input']").dispatchEvent("change");
  await expect(page.getByTestId("project-name")).toHaveText("Dispatch");

  await page.reload();
  await expect(page.getByLabel("Open snapshot")).toBeVisible();
  await expect(page.getByTestId("project-name")).toHaveCount(0);
});
