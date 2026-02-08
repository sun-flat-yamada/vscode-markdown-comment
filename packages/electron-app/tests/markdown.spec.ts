import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs/promises";
import {
  launchApp,
  checkCriticalErrors,
  closeApp,
  resetConsoleErrors,
  TEST_OUTPUT_DIR,
  getPackageOutputDir,
} from "./utils/test_helper";

test.describe("Markdown Operations", () => {
  let electronApp: any;
  let window: any;
  const outputDir = getPackageOutputDir("electron-app");
  const testFilePath = path.join(
    outputDir,
    `${new Date().toISOString().split("T")[0].replace(/-/g, "")}_test.md`,
  );

  test.beforeAll(async () => {
    await fs.writeFile(
      testFilePath,
      "# Test Document\n\nThis is a test markdown file.",
    );

    // Launch app ONCE
    const launched = await launchApp();
    electronApp = launched.app;
    window = launched.window;
  });

  test.afterAll(async () => {
    // Close app ONCE
    await closeApp(electronApp);

    try {
      await fs.unlink(testFilePath);
    } catch (e) {}
  });

  test.beforeEach(async () => {
    resetConsoleErrors(window);
    await window.reload();

    try {
      await window.waitForEvent("console", {
        predicate: (msg: any) => msg.text().includes("RENDERER_READY"),
        timeout: 5000,
      });
    } catch (e) {
      console.warn("Reload: RENDERER_READY not received, proceeding...");
    }

    // Load file after reload
    await window.evaluate(async (path: string) => {
      await (window as any).api.openFileSpecific(path);
    }, testFilePath);
  });

  test.afterEach(async () => {
    await checkCriticalErrors(window);
  });

  test("render markdown and add comment", async () => {
    await window.evaluate(async (path: string) => {
      await (window as any).api.openFileSpecific(path);
    }, testFilePath);

    // Check preview content
    const previewFrame = window.frameLocator("#preview-frame");
    // Wait for the h1 within the frame - increased timeout for CI
    const h1 = previewFrame.locator("h1");
    await h1.waitFor({ state: "visible", timeout: 30000 });
    await expect(h1).toHaveText("Test Document");

    // Ensure the toolbar is also ready
    await window
      .locator("#preview-toolbar")
      .waitFor({ state: "visible", timeout: 10000 });

    // Add comment
    await window.click("#add-comment-btn");
    await expect(window.locator("#add-comment-overlay")).toBeVisible();

    await window.fill("#comment-input", "This is a test comment");
    await window.click("#save-comment-btn");

    // Check if comment appears in sidebar
    await window.click("#tab-comments");
    await expect(window.locator("#comments-list")).toContainText(
      "This is a test comment",
    );

    // Check if comment appears in table
    await expect(window.locator("#comment-table")).toContainText(
      "This is a test comment",
    );
  });

  test("generate AI prompt", async () => {
    await window.evaluate(async (path: string) => {
      await (window as any).api.openFileSpecific(path);
    }, testFilePath);

    // Wait for render before clicking buttons
    const previewFrame = window.frameLocator("#preview-frame");
    await previewFrame
      .locator("body")
      .waitFor({ state: "visible", timeout: 30000 });

    // Wait for UI toolbar
    await window
      .locator("#preview-toolbar")
      .waitFor({ state: "visible", timeout: 10000 });

    // Add a comment first
    await window.click("#add-comment-btn");
    await window.fill("#comment-input", "Improve this title");
    await window.click("#save-comment-btn");

    // Click AI Prompt button
    await window.click("#ai-btn");
    await expect(window.locator("#ai-overlay")).toBeVisible();

    const promptText = await window.inputValue("#prompt-output");
    expect(promptText).toContain("Improve this title");
    expect(promptText).toContain("# Test Document");
  });
});
