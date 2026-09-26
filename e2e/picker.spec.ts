import { expect, test } from "@playwright/test";
import { parseCssColor, relativeLuminance } from "../src/luminance";

test("picker background is dark and has no theme toggle", async ({ page }) => {
  await page.goto("/");
  const css = await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor);
  const [r, g, b] = parseCssColor(css);
  expect(relativeLuminance(r, g, b)).toBeLessThan(0.25);
  await expect(page.getByLabel("Open snapshot")).toBeVisible();
  await expect(page.getByRole("button", { name: /theme/i })).toHaveCount(0);
});
