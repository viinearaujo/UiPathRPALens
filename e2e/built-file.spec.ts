import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { expect, test } from "@playwright/test";

const BUILT_URL = "http://127.0.0.1:4179";
let serve: ChildProcess | undefined;

test.describe("built single-file smoke", () => {
  test.use({ baseURL: BUILT_URL });

  test.beforeAll(async () => {
    const indexHtml = path.join(process.cwd(), "dist", "index.html");
    if (!fs.existsSync(indexHtml)) {
      throw new Error("dist/index.html is missing; run npm run build first");
    }
    serve = spawn(process.execPath, ["scripts/serve-dist.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: "4179" },
      stdio: "ignore",
    });
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        const response = await fetch(BUILT_URL);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        // server not listening yet
      }
      await setTimeout(100);
    }
    if (!ready) {
      serve.kill();
      throw new Error("dist static server did not become ready on 4179");
    }
  });

  test.afterAll(() => {
    serve?.kill();
  });

  test("loads dist/index.html and shows Main.xaml", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("snapshot-input").setInputFiles("tests/fixtures/valid.json");
    await expect(page.getByTestId("node-Main.xaml")).toBeVisible();
  });
});
