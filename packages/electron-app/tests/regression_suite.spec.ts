/**
 * Regression Test Suite
 *
 * Purpose:
 * This comprehensive test suite validates core functionalities and known regression points
 * for the Electron application. It covers:
 * 1. UI Elements: Verifying static tab names and header paths.
 * 2. Comment Anchoring:
 *    - Overlapping comments logic.
 *    - Selection anchoring using contextual matching (duplicate text handling).
 * 3. External Links: Ensuring external links open in the system browser.
 *
 * Mechanism:
 * - Creates a temporary test environment in `tests/_temp`.
 * - Generates a markdown file with specific patterns for testing anchors.
 * - Uses Playwright Electron to interact with the application.
 * - Captures text selections and IPC interactions.
 * - Cleans up all artifacts after execution.
 */

import { _electron as electron } from "playwright";
import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

test.describe("Regression Suite", () => {
  let electronApp: any;
  let window: any;

  // Use _temp directory for test artifacts
  const tempDir = path.join(__dirname, "_temp");
  const testFileName = `regression-test-${Date.now()}.md`;
  const testFilePath = path.join(tempDir, testFileName);

  test.beforeAll(async () => {
    // Ensure _temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // Prepare Test File Content
    // Contains:
    // 1. [comment area] for Overlapping check
    // 2. Duplicate text ("This is the target text...") for Context Anchor check
    const content = `
# Regression Test Document

This is a [comment area] to test overlapping.

Start of the document.

This is the target text that we want to comment on. (First Instance)
Surrounding context is important here.

Middle of the document.

This is the target text that we want to comment on. (Second Instance)
Different context ensures we can distinguish them.

End of the document.
`;
    fs.writeFileSync(testFilePath, content.trim());

    electronApp = await electron.launch({
      args: [path.join(__dirname, "../dist/main.js")],
    });
    window = await electronApp.firstWindow();

    // Capture console logs from the renderer process for debugging
    window.on("console", (msg: any) => {
      console.log(`[Renderer Console] ${msg.text()}`);
    });

    await window.waitForLoadState("domcontentloaded");
  });

  test.beforeEach(async () => {
    // Reset test file and comment data before each test to prevent state interference
    const jsonl = testFilePath + ".jsonl";
    if (fs.existsSync(jsonl)) fs.unlinkSync(jsonl);

    // Regenerate test file to ensure clean state
    const content = `
# Regression Test Document

This is a [comment area] to test overlapping.

Start of the document.

This is the target text that we want to comment on. (First Instance)
Surrounding context is important here.

Middle of the document.

This is the target text that we want to comment on. (Second Instance)
Different context ensures we can distinguish them.

End of the document.
`;
    fs.writeFileSync(testFilePath, content.trim());
  });

  test.afterAll(async () => {
    await electronApp.close();
    // Cleanup: Remove the specific test file and its sidecars
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    const jsonl = testFilePath + ".jsonl";
    if (fs.existsSync(jsonl)) fs.unlinkSync(jsonl);

    // Attempt to remove temp dir if empty, but better to leave dir just in case parallel tests use it?
    // User requested "Organize to _temp", so presence of _temp is fine.
  });

  test("UI: Check Tab Name and Header Path", async () => {
    // Open the test file
    await window.evaluate((p: string) => {
      // @ts-ignore
      window.api.openFileSpecific(p);
    }, testFilePath);

    // Wait for render
    const frame = window.frameLocator("#preview-frame");
    await expect(frame.locator("body")).toBeVisible();
    await new Promise((r) => setTimeout(r, 1000));

    // 1. Check tab name is "FILES"
    const tabRecent = window.locator("#tab-recent");
    await expect(tabRecent).toHaveText("FILES");

    // 2. Check header has full path and tooltip
    const fileNameEl = window.locator("#file-name");
    const headerText = await fileNameEl.innerText();
    expect(headerText).toBe(testFilePath);
    const tooltip = await fileNameEl.getAttribute("title");
    expect(tooltip).toBe(testFilePath);
  });

  test("Anchoring: Selection Context (Duplicate Text)", async () => {
    // Open file (already open, but good to ensure focus/state)
    await window.evaluate((p: string) => {
      // @ts-ignore
      window.api.openFileSpecific(p);
    }, testFilePath);

    const frame = window.frameLocator("#preview-frame");
    await expect(frame.locator("body")).toBeVisible();
    await new Promise((r) => setTimeout(r, 1000));

    // Target the SECOND instance of "target text"
    // In our content:
    // P1: Header
    // P2: [comment area]
    // P3: Start of doc
    // P4: This is the target text... (Instance 1)
    // P5: Surrounding...
    // P6: Middle...
    // P7: This is the target text... (Instance 2)

    // We target the P with text containing "(Second Instance)"
    const targetP = frame.locator("p", { hasText: "(Second Instance)" });
    await expect(targetP).toBeVisible();

    // Ensure focus
    await targetP.click();
    await new Promise((r) => setTimeout(r, 200));
    // Select text in that P
    await targetP.selectText();

    // Wait for selection event
    await new Promise((r) => setTimeout(r, 1000));

    // Trigger "Add Comment" UI
    await window.locator("#add-comment-btn").click();
    await expect(window.locator("#add-comment-overlay")).toBeVisible();

    await window.locator("#comment-input").fill("Context Test Comment");
    await window.locator("#save-comment-btn").click();

    // Check results
    const threads = await window.evaluate((p: string) => {
      // @ts-ignore
      return window.api.getThreads(p);
    }, testFilePath);

    // Find the thread with our content
    const myThread = threads.find(
      (t: any) => t.comments[0].content === "Context Test Comment",
    );
    expect(myThread).toBeDefined();

    const anchor = myThread.anchor;
    console.log("Context Test Anchor:", JSON.stringify(anchor, null, 2));

    const fileContent = fs.readFileSync(testFilePath, "utf-8");
    const targetStr = "This is the target text that we want to comment on.";
    const firstIndex = fileContent.indexOf(targetStr);
    const secondIndex = fileContent.lastIndexOf(targetStr);

    expect(firstIndex).not.toBe(secondIndex);

    // The anchor offset should be closer to the second index
    expect(Math.abs(anchor.offset - secondIndex)).toBeLessThan(10);
    expect(Math.abs(anchor.offset - firstIndex)).toBeGreaterThan(20);
  });

  test("External Links: System Browser Interception", async () => {
    // Ensure file is open and preview is loaded
    await window.evaluate((p: string) => {
      // @ts-ignore
      window.api.openFileSpecific(p);
    }, testFilePath);

    const frame = window.frameLocator("#preview-frame");
    await expect(frame.locator("body")).toBeVisible();
    await new Promise((r) => setTimeout(r, 1000));

    // Wait for main-content to be available
    await expect(frame.locator("#main-content")).toBeVisible();

    // Inject a link into main-content
    const linkInjected = await window.evaluate(() => {
      const frame = document.getElementById(
        "preview-frame",
      ) as HTMLIFrameElement;
      const doc = frame.contentDocument || frame.contentWindow!.document;
      const main = doc.getElementById("main-content");
      if (main) {
        const link = doc.createElement("a");
        link.id = "test-ext-link";
        link.href = "https://example.com/regression";
        link.innerText = "Regression External Link";
        main.appendChild(link);
        return true;
      }
      return false;
    });

    expect(linkInjected).toBe(true);
    console.log("Link injected. Clicking...");

    // Listen for console logs indicating external open
    const consolePromise = window.waitForEvent("console", {
      predicate: (msg: any) =>
        msg.text().includes("Opening external URL") &&
        msg.text().includes("example.com/regression"),
      timeout: 15000,
    });

    await frame.locator("#test-ext-link").click({ force: true });

    const consoleMsg = await consolePromise;
    expect(consoleMsg.text()).toContain("https://example.com/regression");
  });

  // NOTE: This test adds comments that persist in app cache, so it runs last
  test("Anchoring: Overlapping Comments", async () => {
    const content = fs.readFileSync(testFilePath, "utf-8");
    const targetText = "[comment area]";
    const offset = content.indexOf(targetText);
    const subTarget = "comment";
    const subOffset = content.indexOf(subTarget);

    expect(offset).toBeGreaterThan(-1);
    expect(subOffset).toBeGreaterThan(-1);

    console.log(`Overlapping Offsets: Main=${offset}, Sub=${subOffset}`);

    // 1. Add first comment
    await window.evaluate(
      ({ p, off }: any) => {
        // @ts-ignore
        window.api.addComment({
          filePath: p,
          offset: off,
          length: 14,
          author: "User1",
          content: "Main Range",
        });
      },
      { p: testFilePath, off: offset },
    );

    await new Promise((r) => setTimeout(r, 500));

    // 2. Add second comment (overlapping)
    await window.evaluate(
      ({ p, off }: any) => {
        // @ts-ignore
        window.api.addComment({
          filePath: p,
          offset: off,
          length: 7,
          author: "User2",
          content: "Sub Range",
        });
      },
      { p: testFilePath, off: subOffset },
    );

    await new Promise((r) => setTimeout(r, 500));

    // 3. Verify threads
    const threads = await window.evaluate((p: string) => {
      // @ts-ignore
      return window.api.getThreads(p);
    }, testFilePath);

    expect(threads.length).toBeGreaterThanOrEqual(2);
    const offsets = threads.map((t: any) => t.anchor.offset);
    expect(offsets).toContain(offset);
    expect(offsets).toContain(subOffset);
  });
});
