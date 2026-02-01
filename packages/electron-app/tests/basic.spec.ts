import { _electron as electron } from "playwright";
import { test, expect } from "@playwright/test";
import * as path from "path";

test("launch app", async () => {
  const electronApp = await electron.launch({
    args: [path.join(__dirname, "../dist/main.js")],
  });

  const window = await electronApp.firstWindow();
  expect(await window.title()).toBe("Markdown Comment Desktop");

  await electronApp.close();
});

test("sidebar tabs", async () => {
  const electronApp = await electron.launch({
    args: [path.join(__dirname, "../dist/main.js")],
  });

  const window = await electronApp.firstWindow();

  // Check initial state
  await expect(window.locator("#recent-files-section")).toBeVisible();
  await expect(window.locator("#comments-section")).not.toBeVisible();

  // Click Comments tab
  await window.click("#tab-comments");
  await expect(window.locator("#comments-section")).toBeVisible();
  await expect(window.locator("#recent-files-section")).not.toBeVisible();

  await electronApp.close();
});
