/**
 * Regression Test Suite
 */

import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import {
  launchApp,
  checkCriticalErrors,
  closeApp,
  resetConsoleErrors,
} from "./utils/test_helper";

test.describe("Regression Suite", () => {
  let electronApp: any;
  let window: any;

  // Use _temp directory for test artifacts
  const tempDir = path.join(__dirname, "_temp");
  const testFileName = `regression-test-${Date.now()}.md`;
  const testFilePath = path.join(tempDir, testFileName);

  test.beforeAll(async () => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    const content = `
# Regression Test Document

This is a [comment area] to test overlapping.

Start of the document.

This is the target text that we want to comment on. (First Instance)

Surrounding context is important here.

Middle of the document.

This is the target text that we want to comment on. (Second Instance)

End of the document.
`;
    fs.writeFileSync(testFilePath, content.trim());

    // Launch app ONCE
    const launched = await launchApp();
    electronApp = launched.app;
    window = launched.window;
  });

  test.afterAll(async () => {
    // Close app ONCE
    await closeApp(electronApp);

    // Cleanup: Remove the specific test file and its sidecars
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    const jsonl = testFilePath + ".jsonl";
    if (fs.existsSync(jsonl)) fs.unlinkSync(jsonl);
  });

  test.beforeEach(async () => {
    const jsonl = testFilePath + ".jsonl";
    if (fs.existsSync(jsonl)) fs.unlinkSync(jsonl);

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

    // Load file specific to this suite
    await window.evaluate(async (p: string) => {
      // @ts-ignore
      await window.api.openFileSpecific(p);
    }, testFilePath);
  });

  test.afterEach(async () => {
    await checkCriticalErrors(window);
  });

  // Old afterAll removed

  test("UI: Check Tab Name and Header Path", async () => {
    await window.evaluate(async (p: string) => {
      // @ts-ignore
      await window.api.openFileSpecific(p);
    }, testFilePath);

    const frame = window.frameLocator("#preview-frame");
    await frame.locator("body").waitFor({ state: "visible", timeout: 20000 });

    const tabRecent = window.locator("#tab-recent");
    await expect(tabRecent).toHaveText("FILES");

    const fileNameEl = window.locator("#file-name");
    const headerText = await fileNameEl.innerText();
    expect(headerText).toBe(testFilePath);
  });

  test("Anchoring: Selection Context (Duplicate Text)", async () => {
    await window.evaluate(async (p: string) => {
      // @ts-ignore
      await window.api.openFileSpecific(p);
    }, testFilePath);

    const frame = window.frameLocator("#preview-frame");
    await frame.locator("body").waitFor({ state: "visible", timeout: 20000 });

    const targetP = frame.locator("p", { hasText: "(Second Instance)" });
    await expect(targetP).toBeVisible();

    await targetP.click();
    await targetP.selectText();
    await new Promise((r) => setTimeout(r, 1000));

    await window.locator("#add-comment-btn").click();
    await expect(window.locator("#add-comment-overlay")).toBeVisible();

    await window.locator("#comment-input").fill("Context Test Comment");
    await window.locator("#save-comment-btn").click();

    const threads = await window.evaluate((p: string) => {
      // @ts-ignore
      return window.api.getThreads(p);
    }, testFilePath);

    const myThread = threads.find(
      (t: any) => t.comments[0].content === "Context Test Comment",
    );
    expect(myThread).toBeDefined();
    expect(myThread.anchor.offset).toBeGreaterThan(150);
  });

  test("External Links: System Browser Interception", async () => {
    await window.evaluate(async (p: string) => {
      // @ts-ignore
      await window.api.openFileSpecific(p);
    }, testFilePath);

    const frame = window.frameLocator("#preview-frame");
    await frame.locator("body").waitFor({ state: "visible", timeout: 20000 });

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

    const consolePromise = window.waitForEvent("console", {
      predicate: (msg: any) =>
        msg.text().includes("openExternal") &&
        msg.text().includes("example.com/regression"),
      timeout: 15000,
    });

    await frame.locator("#test-ext-link").click({ force: true });
    await consolePromise;
  });

  test("Anchoring: Overlapping Comments", async () => {
    test.setTimeout(60000);

    const content = fs.readFileSync(testFilePath, "utf-8");
    const targetText = "[comment area]";
    const offset = content.indexOf(targetText);

    await window.evaluate(async (p: string) => {
      // @ts-ignore
      await window.api.openFileSpecific(p);
    }, testFilePath);
    const frame = window.frameLocator("#preview-frame");
    await frame.locator("body").waitFor({ state: "visible", timeout: 20000 });

    // 1. Add first comment
    await window.evaluate(
      async ({ p, off }: any) => {
        // @ts-ignore
        await window.api.addComment({
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
        // @ts-ignore
        await window.api.addComment({
          filePath: p,
          offset: off + 1,
          length: 7,
          author: "User2",
          content: "Sub Range",
        });
      },
      { p: testFilePath, off: offset },
    );

    await new Promise((r) => setTimeout(r, 1000));

    const threads = await window.evaluate((p: string) => {
      // @ts-ignore
      return window.api.getThreads(p);
    }, testFilePath);

    expect(threads.length).toBeGreaterThanOrEqual(2);
  });
});
