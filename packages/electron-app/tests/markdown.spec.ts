import { _electron as electron } from "playwright";
import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs/promises";

test.describe("Markdown Operations", () => {
  let electronApp: any;
  let window: any;
  const testFilePath = path.join(__dirname, "test.md");

  test.beforeAll(async () => {
    await fs.writeFile(
      testFilePath,
      "# Test Document\n\nThis is a test markdown file.",
    );
  });

  test.afterAll(async () => {
    try {
      await fs.unlink(testFilePath);
    } catch (e) {}
  });

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, "../dist/main.js")],
    });
    window = await electronApp.firstWindow();
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test("render markdown and add comment", async () => {
    // Open the test file via IPC mock or direct UI interaction if possible
    // Since we don't want to trigger native dialog, we'll use a hidden way or mock
    // For now, let's use openFileSpecific via console since it's exposed in preload
    await window.evaluate((path: string) => {
      (window as any).api.openFileSpecific(path);
    }, testFilePath);

    // Check preview content
    const previewFrame = window.frameLocator("#preview-frame");
    await expect(previewFrame.locator("h1")).toHaveText("Test Document");

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
    await window.evaluate((path: string) => {
      (window as any).api.openFileSpecific(path);
    }, testFilePath);

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
