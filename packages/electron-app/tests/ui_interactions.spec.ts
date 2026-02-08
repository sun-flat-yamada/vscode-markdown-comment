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

test.describe("Comprehensive UI Interactions", () => {
  let electronApp: any;
  let window: any;
  const outputDir = getPackageOutputDir("electron-app");
  const testFilePath = path.join(
    outputDir,
    `${new Date().toISOString().split("T")[0].replace(/-/g, "")}_test_ui.md`,
  );

  test.beforeAll(async () => {
    // Create test file
    await fs.writeFile(
      testFilePath,
      "# UI Interaction Test\n\nTesting various parts of the UI.",
    );

    // Launch app ONCE for the whole suite
    const launched = await launchApp();
    electronApp = launched.app;
    window = launched.window;
  });

  test.afterAll(async () => {
    // Close app ONCE at end
    await closeApp(electronApp);

    // Cleanup files
    try {
      await fs.unlink(testFilePath);
      await fs.unlink(testFilePath + ".jsonl");
    } catch (e) {}
  });

  test.beforeEach(async () => {
    // Reset error tracking for this test
    resetConsoleErrors(window);

    // Full reload to reset UI state (faster than relaunching app)
    await window.reload();

    // Wait for the renderer to be ready again
    try {
      await window.waitForEvent("console", {
        predicate: (msg: any) => msg.text().includes("RENDERER_READY"),
        timeout: 5000,
      });
    } catch (e) {
      console.warn("Reload: RENDERER_READY not received, proceeding...");
    }

    // Open the test file
    await window.evaluate(async (path: string) => {
      await (window as any).api.openFileSpecific(path);
    }, testFilePath);

    // Wait for preview ready
    const previewFrame = window.frameLocator("#preview-frame");
    await previewFrame
      .locator("body")
      .waitFor({ state: "visible", timeout: 20000 });
  });

  test.afterEach(async () => {
    // Check errors for this specific test
    await checkCriticalErrors(window);
  });

  test("Toolbar Actions: Open, AI, Refresh, Print, Theme Select", async () => {
    // Check buttons existence and basic visibility
    await expect(window.locator("#open-btn")).toBeVisible();
    await expect(window.locator("#ai-btn")).toBeVisible();
    await expect(window.locator("#refresh-btn")).toBeVisible();
    await expect(window.locator("#print-btn")).toBeVisible();
    await expect(window.locator("#theme-select")).toBeVisible();

    // AI Prompt - already tested in markdown.spec but check overlay triggers
    await window.click("#ai-btn");
    await expect(window.locator("#ai-overlay")).toBeVisible();
    await window.click("#close-modal-btn");
    await expect(window.locator("#ai-overlay")).not.toBeVisible();
  });

  test("Sidebar Interactions: Tabs and Sections", async () => {
    const tabRecent = window.locator("#tab-recent");
    const tabComments = window.locator("#tab-comments");
    const recentSection = window.locator("#recent-files-section");
    const commentsSection = window.locator("#comments-section");

    await expect(tabRecent).toHaveClass(/active/);
    await expect(recentSection).toBeVisible();
    await expect(commentsSection).toBeHidden();

    await tabComments.click();
    await expect(tabComments).toHaveClass(/active/);
    await expect(tabRecent).not.toHaveClass(/active/);
    await expect(commentsSection).toBeVisible();
    await expect(recentSection).toBeHidden();
  });

  test("Bottom Panel: Visibility Toggle", async () => {
    const panel = window.locator("#bottom-panel");
    const toggleBtn = window.locator("#toggle-panel-btn");

    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box!.height).toBeGreaterThan(0);

    await toggleBtn.click();
    await expect(panel).toBeHidden();
  });

  test("Comment Table: Basic Structure", async () => {
    // Ensure panel is visible (might have been toggled off by previous test)
    const panel = window.locator("#bottom-panel");
    if (!(await panel.isVisible())) {
      await window.locator("#toggle-panel-btn").click();
    }

    const table = window.locator("#comment-table");
    await expect(table).toBeVisible();
    await expect(table.locator("thead")).toBeVisible();
    await expect(table.locator("tbody")).toBeAttached();
  });

  test("Refresh Button", async () => {
    // Click refresh and ensure it doesn't crash
    await window.click("#refresh-btn");
    // It should trigger handleUpdatePreview
    const previewFrame = window.frameLocator("#preview-frame");
    await expect(previewFrame.locator("body")).toBeVisible();
  });
});
