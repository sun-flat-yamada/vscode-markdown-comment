import { _electron as electron } from "playwright";
import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs/promises";

test.describe("Comprehensive UI Interactions", () => {
  let electronApp: any;
  let window: any;
  const testFilePath = path.join(__dirname, "test_ui.md");

  test.beforeAll(async () => {
    await fs.writeFile(
      testFilePath,
      "# UI Test Doc\n\nTesting all interactions.",
    );
  });

  test.afterAll(async () => {
    try {
      await fs.unlink(testFilePath);
    } catch (e) {}
  });

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, "..")],
    });
    window = await electronApp.firstWindow();

    // Capture errors
    (window as any)._errors = [];
    window.on("pageerror", (err: any) =>
      (window as any)._errors.push(err.message),
    );
    window.on("console", (msg: any) => {
      console.log(`[TEST DEBUG] ${msg.type()}: ${msg.text()}`);
      if (msg.type() === "error") (window as any)._errors.push(msg.text());
    });
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await window.screenshot({
        path: path.join(
          __dirname,
          `failure-${testInfo.title.replace(/\s+/g, "_")}.png`,
        ),
      });
    }
    expect((window as any)._errors).toEqual([]);
    await electronApp.close();
  });

  test("Toolbar Actions: Open, AI, Refresh, Print, Theme Select", async () => {
    // Open Button
    await window.click("#open-btn");
    // (Note: we can't easily test the native file dialog, but we check if it doesn't crash)

    // AI Button
    await window.click("#ai-btn");
    await expect(window.locator("#ai-overlay")).toBeVisible();
    await window.click("#close-modal-btn");
    await expect(window.locator("#ai-overlay")).not.toBeVisible();

    // Refresh Button
    await window.click("#refresh-btn");

    // Print Button
    await expect(window.locator("#print-btn")).toBeVisible();

    // Theme Select
    const themeSelect = window.locator("#theme-select");
    await themeSelect.selectOption("dark");
    expect(
      await window.evaluate(() =>
        document.documentElement.classList.contains("dark-mode"),
      ),
    ).toBe(true);
    await themeSelect.selectOption("system");
    expect(
      await window.evaluate(() =>
        document.documentElement.classList.contains("theme-system"),
      ),
    ).toBe(true);
  });

  test("Sidebar Interactions: Tabs and Sections", async () => {
    // Initial state: Files tab active
    await expect(window.locator("#recent-files-section")).toBeVisible();
    await expect(window.locator("#comments-section")).not.toBeVisible();

    // Switch to Comments tab
    await window.click("#tab-comments");
    await expect(window.locator("#comments-section")).toBeVisible();
    await expect(window.locator("#recent-files-section")).not.toBeVisible();

    // Switch back to Files tab
    await window.click("#tab-recent");
    await expect(window.locator("#recent-files-section")).toBeVisible();
  });

  test("Bottom Panel: Visibility Toggle", async () => {
    const bottomPanel = window.locator("#bottom-panel");
    const toggleBtn = window.locator("#toggle-panel-btn");

    await expect(bottomPanel).toBeVisible();
    await expect(bottomPanel).not.toHaveClass(/collapsed/);

    await toggleBtn.click();
    await expect(bottomPanel).toHaveClass(/collapsed/);

    await toggleBtn.click();
    await expect(bottomPanel).not.toHaveClass(/collapsed/);
  });

  test("Comment Table: Basic Structure", async () => {
    await expect(window.locator("#comment-table")).toBeVisible();
    await expect(window.locator("th:has-text('Status')")).toBeVisible();
    await expect(window.locator("th:has-text('Author')")).toBeVisible();
    await expect(window.locator("th:has-text('Content')")).toBeVisible();
  });

  test("Resizer: Vertical Sidebar", async () => {
    const sidebar = window.locator("#sidebar");
    const initialBox = await sidebar.boundingBox();
    const resizer = window.locator("#resizer-v");

    const rBox = await resizer.boundingBox();
    await window.mouse.move(rBox.x + rBox.width / 2, rBox.y + rBox.height / 2);
    await window.mouse.down();
    await window.mouse.move(
      rBox.x + rBox.width / 2 + 50,
      rBox.y + rBox.height / 2,
    );
    await window.mouse.up();

    const finalBox = await sidebar.boundingBox();
    expect(finalBox.width).toBeGreaterThan(initialBox.width);
  });

  test("Comment Table: Actions (Reply, Tag, Delete)", async () => {
    // We need a comment to test actions
    await window.evaluate((path: string) => {
      (window as any).api.openFileSpecific(path);
    }, testFilePath);

    // Wait for preview toolbar to be visible (indicates file is loaded)
    await expect(window.locator("#preview-toolbar")).toBeVisible({
      timeout: 10000,
    });

    // Add a comment
    await window.click("#add-comment-btn");
    await window.fill("#comment-input", "Test Action Comment");
    await window.click("#save-comment-btn");

    // Wait for table to update
    await expect(window.locator("#table-body tr")).toBeVisible({
      timeout: 10000,
    });

    // Reply Action
    await window.click(".reply-btn");
    await expect(window.locator("#ai-overlay")).not.toBeVisible(); // Should be comment overlay
    await expect(window.locator("#add-comment-overlay")).toBeVisible();
    await expect(window.locator("#modal-title")).toHaveText("Reply to Comment");
    await window.click("#cancel-comment-btn");

    // Tag Action (uses QuickPick-style modal)
    await window.click(".tag-btn");
    await expect(window.locator("#edit-tags-overlay")).toBeVisible();
    // Create a new tag
    await window.fill("#tags-filter-input", "tag1");
    await window.press("#tags-filter-input", "Enter");
    // Wait for the tag to be added and checked
    await expect(window.locator(".tag-item input:checked")).toBeVisible();
    await window.click("#save-tags-btn");
    await expect(window.locator("#edit-tags-overlay")).not.toBeVisible();
    await expect(window.locator(".tag-cell")).toContainText("tag1");

    // Delete Action (handles confirm)
    window.once("dialog", async (dialog: any) => {
      expect(dialog.type()).toBe("confirm");
      await dialog.accept();
    });
    await window.click(".delete-btn");
    await expect(window.locator("#table-body tr")).not.toBeVisible();
  });

  test("Refresh Button", async () => {
    await window.click("#refresh-btn");
    // Check if it doesn't crash and console log shows load
    // (Already checked by afterEach error check)
  });
});
