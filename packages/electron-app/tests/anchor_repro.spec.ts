import { _electron as electron } from "playwright";
import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs/promises";

/**
 * Reproduction tests for anchor positioning issues.
 *
 * These tests verify that when the user selects text in the Preview
 * and adds a comment, the anchor is correctly placed in the Markdown source,
 * even when there are duplicate text occurrences or Markdown formatting.
 */
test.describe("Anchor Reproduction Tests", () => {
  let electronApp: any;
  let window: any;
  const testFilePath = path.join(__dirname, "test_anchor_repro.md");
  const metaFilePath = path.join(__dirname, "test_anchor_repro.meta.json");

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
    try {
      await fs.unlink(testFilePath);
    } catch (e) {}
    try {
      await fs.unlink(metaFilePath);
    } catch (e) {}
  });

  /**
   * Test 1: Duplicate text scenario.
   * When the same text appears twice, selecting the second occurrence
   * should anchor to the second occurrence.
   */
  test("Duplicate text: selecting second occurrence anchors correctly", async () => {
    // Prepare test file with duplicate text
    const content = `# Section One

Hello world.

# Section Two

Hello world.
`;
    await fs.writeFile(testFilePath, content);

    electronApp = await electron.launch({
      args: [path.join(__dirname, "../dist/main.js")],
    });
    window = await electronApp.firstWindow();
    window.on("console", (msg: any) => console.log(`[Browser] ${msg.text()}`));
    await window.waitForLoadState("domcontentloaded");

    // Open test file
    await window.evaluate((p: string) => {
      (window as any).api.openFileSpecific(p);
    }, testFilePath);
    await window.waitForTimeout(1000);

    // Find and select the second "Hello world" in the preview
    const previewFrame = window.frameLocator("#preview-frame");
    const helloTexts = previewFrame.getByText("Hello world.");
    await expect(helloTexts.nth(1)).toBeVisible({ timeout: 10000 });

    // Click to focus and select the second occurrence
    await helloTexts.nth(1).click();
    await helloTexts.nth(1).selectText();

    // Add a comment
    await window.click("#add-comment-btn");
    await window.fill("#comment-input", "Comment on second Hello");
    await window.click("#save-comment-btn");
    await window.waitForTimeout(1500);

    // Check the meta file
    const metaContent = await fs.readFile(metaFilePath, "utf-8");
    const metaFile = JSON.parse(metaContent);

    const thread = metaFile.threads.find(
      (t: any) => t.comments[0].content === "Comment on second Hello",
    );
    expect(thread).toBeDefined();

    // The second "Hello world." starts after "# Section Two\n\n"
    // Full content: "# Section One\n\nHello world.\n\n# Section Two\n\nHello world.\n"
    // Index of first "Hello world." = 15
    // Index of second "Hello world." = 45
    const firstIndex = content.indexOf("Hello world.");
    const secondIndex = content.indexOf("Hello world.", firstIndex + 1);

    console.log("Expected offset (second occurrence):", secondIndex);
    console.log("Actual offset:", thread.anchor.offset);

    expect(thread.anchor.offset).toBe(secondIndex);
  });

  /**
   * Test 2: Formatted text scenario.
   * When text has Markdown formatting (bold), the context matching
   * should still work correctly.
   */
  test("Formatted text: bold text anchors correctly", async () => {
    const content = `# Formatting Test

This is **important text** to test.
`;
    await fs.writeFile(testFilePath, content);

    electronApp = await electron.launch({
      args: [path.join(__dirname, "../dist/main.js")],
    });
    window = await electronApp.firstWindow();
    window.on("console", (msg: any) => console.log(`[Browser] ${msg.text()}`));
    await window.waitForLoadState("domcontentloaded");

    await window.evaluate((p: string) => {
      (window as any).api.openFileSpecific(p);
    }, testFilePath);
    await window.waitForTimeout(1000);

    const previewFrame = window.frameLocator("#preview-frame");
    // In the rendered HTML, "important text" is inside <strong>
    const boldText = previewFrame.locator("strong");
    await expect(boldText).toBeVisible({ timeout: 10000 });
    await boldText.selectText();

    await window.click("#add-comment-btn");
    await window.fill("#comment-input", "Comment on bold");
    await window.click("#save-comment-btn");
    await window.waitForTimeout(1500);

    const metaContent = await fs.readFile(metaFilePath, "utf-8");
    const metaFile = JSON.parse(metaContent);

    const thread = metaFile.threads.find(
      (t: any) => t.comments[0].content === "Comment on bold",
    );
    expect(thread).toBeDefined();

    // "**important text**" starts at index of "**important" in content
    const expectedOffset = content.indexOf("**important text**");
    console.log("Expected offset (bold):", expectedOffset);
    console.log("Actual offset:", thread.anchor.offset);

    // The anchor should point to the raw Markdown "**important text**"
    // Or at least to "important text" within it.
    // Current behavior might anchor to the plain text position.
    // This test will help us understand the current behavior.
    expect(thread.anchor.offset).toBeGreaterThanOrEqual(expectedOffset);
    expect(thread.anchor.offset).toBeLessThanOrEqual(
      expectedOffset + "**".length,
    );
  });
});
