/**
 * @file E2E Comprehensive Suite
 * @description This suite combines UI interaction tests and core functionality regressions.
 * It ensures that basic UI elements are visible and functional, and that critical
 * logic like anchoring and link interception remains stable across changes.
 *
 * Mechanism:
 * - Uses Playwright to launch a single Electron application instance for the suite.
 * - Reloads the window and re-opens a test file before each test to ensure a clean state.
 * - Tracks critical browser/renderer errors via `test_helper.ts`.
 */

import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs/promises";
import {
  launchApp,
  checkCriticalErrors,
  closeApp,
  resetConsoleErrors,
  getPackageOutputDir,
} from "./utils/test_helper";

test.describe("E2E Comprehensive Suite", () => {
  let electronApp: any;
  let window: any;
  const outputDir = getPackageOutputDir("electron-app");
  const testFileName = `e2e-test-${Date.now()}.md`;
  const testFilePath = path.join(outputDir, testFileName);

  test.beforeAll(async () => {
    // Create a rich test document that covers multiple cases
    const content = `
# E2E Test Document

This is a [comment area] to test overlapping.

Start of the document.

This is the target text that we want to comment on. (First Instance)

Surrounding context is important here.

Middle of the document.

This is the target text that we want to comment on. (Second Instance)

End of the document.

[Link to nowhere](https://example.com/e2e-test)
`;
    await fs.writeFile(testFilePath, content.trim());

    // Launch app ONCE for the whole suite
    const launched = await launchApp();
    electronApp = launched.app;
    window = launched.window;
  });

  test.afterAll(async () => {
    await closeApp(electronApp);

    // Cleanup files
    try {
      await fs.unlink(testFilePath);
      await fs.unlink(testFilePath + ".jsonl");
    } catch (e) {}
  });

  test.beforeEach(async () => {
    resetConsoleErrors(window);
    await window.reload();

    // Wait for the renderer to be ready
    try {
      await window.waitForEvent("console", {
        predicate: (msg: any) => msg.text().includes("RENDERER_READY"),
        timeout: 10000,
      });
    } catch (e) {
      console.warn("Reload: RENDERER_READY not received, proceeding...");
    }

    // Open the test file
    await window.evaluate(async (path: string) => {
      await (window as any).api.openFileSpecific(path);
    }, testFilePath);

    // Wait for preview frame
    const previewFrame = window.frameLocator("#preview-frame");
    await previewFrame
      .locator("body")
      .waitFor({ state: "visible", timeout: 20000 });
  });

  test.afterEach(async () => {
    await checkCriticalErrors(window);
  });

  test("UI: Toolbar and Sidebar Elements Visibility", async () => {
    await expect(window.locator("#open-btn")).toBeVisible();
    await expect(window.locator("#ai-btn")).toBeVisible();
    await expect(window.locator("#refresh-btn")).toBeVisible();
    await expect(window.locator("#print-btn")).toBeVisible();

    const tabRecent = window.locator("#tab-recent");
    await expect(tabRecent).toHaveClass(/active/);
    await expect(window.locator("#recent-files-section")).toBeVisible();
  });

  test("UI: Bottom Panel Toggle", async () => {
    const panel = window.locator("#bottom-panel");
    const toggleBtn = window.locator("#toggle-panel-btn");

    await expect(panel).toBeVisible();
    await toggleBtn.waitFor({ state: "visible" });
    await toggleBtn.click({ force: true });
    await expect(panel).toBeHidden();
    await toggleBtn.click({ force: true });
    await expect(panel).toBeVisible();
  });

  test("Anchoring: Selection Context (Duplicate Text Discovery)", async () => {
    const frame = window.frameLocator("#preview-frame");
    const targetP = frame.locator("p", { hasText: "(Second Instance)" });

    await targetP.click();
    await targetP.selectText();
    await new Promise((r) => setTimeout(r, 1000));

    await window.locator("#add-comment-btn").click();
    await window.locator("#comment-input").fill("Duplicate Text Test");
    await window.locator("#save-comment-btn").click();

    const threads = await window.evaluate((p: string) => {
      return (window as any).api.getThreads(p);
    }, testFilePath);

    const myThread = threads.find(
      (t: any) => t.comments[0].content === "Duplicate Text Test",
    );
    expect(myThread).toBeDefined();
    // Verify it's not the first instance (offset should be large)
    expect(myThread.anchor.offset).toBeGreaterThan(150);
  });

  test("External Links: System Browser Interception", async () => {
    const frame = window.frameLocator("#preview-frame");
    const link = frame.locator("a", { hasText: "Link to nowhere" });

    const consolePromise = window.waitForEvent("console", {
      predicate: (msg: any) =>
        msg.text().includes("openExternal") &&
        msg.text().includes("example.com/e2e-test"),
      timeout: 15000,
    });

    await link.click({ force: true });
    await consolePromise;
  });

  test("Anchoring: Overlapping Comments Management", async () => {
    const content = await fs.readFile(testFilePath, "utf-8");
    const targetText = "[comment area]";
    const offset = content.indexOf(targetText);

    // 1. Add first comment
    await window.evaluate(
      async ({ p, off }: any) => {
        await (window as any).api.addComment({
          filePath: p,
          offset: off,
          length: 14,
          author: "User1",
          content: "Main Range",
        });
      },
      { p: testFilePath, off: offset },
    );

    await new Promise((r) => setTimeout(r, 1000));

    // 2. Add second comment (overlapping)
    await window.evaluate(
      async ({ p, off }: any) => {
        await (window as any).api.addComment({
          filePath: p,
          offset: off + 1,
          length: 7,
          author: "User2",
          content: "Sub Range",
        });
      },
      { p: testFilePath, off: offset },
    );

    const threads = await window.evaluate((p: string) => {
      return (window as any).api.getThreads(p);
    }, testFilePath);

    expect(threads.length).toBeGreaterThanOrEqual(2);
  });
});
