import { _electron as electron, ElectronApplication, Page } from "playwright";
import * as path from "path";

/**
 * Standard launch options for Electron app testing.
 * Includes --no-sandbox for CI environments.
 */
export async function launchApp(): Promise<{
  app: ElectronApplication;
  window: Page;
}> {
  /*
   * Resolve main entry point.
   * Assuming tests are running from packages/electron-app/tests
   * Main entry is usually ../dist/main.js
   * BUT some tests used ".." (package root) which leads to main defined in package.json.
   * We will standardize on ".." (package root) to let electron find package.json main.
   */
  const appPath = path.join(__dirname, "../..");

  const app = await electron.launch({
    args: [appPath, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const window = await app.firstWindow();
  setupConsoleCapture(window);

  // Wait for the main page to be loaded
  await window.waitForLoadState("domcontentloaded");

  // Wait for the specific RENDERER_READY signal from the renderer
  // We check the flag first in case it was already received
  const isReady = async () => {
    const anyWin = window as any;
    if (anyWin._rendererReady) return true;
    try {
      await window.waitForEvent("console", {
        predicate: (msg: any) => msg.text().includes("RENDERER_READY"),
        timeout: 15000,
      });
      return true;
    } catch (e) {
      return anyWin._rendererReady || false;
    }
  };

  if (!(await isReady())) {
    console.warn(
      "Warn: RENDERER_READY signal not received within 5s, proceeding anyway...",
    );
  }

  return { app, window };
}

/**
 * Sets up console log capturing for the playwright window.
 * Instead of throwing in listeners (which can hang Playwright),
 * we collect critical errors in an array for post-test checking.
 */
export function setupConsoleCapture(window: Page) {
  const anyWindow = window as any;
  anyWindow._criticalErrors = [];
  anyWindow._rendererReady = false;

  window.on("pageerror", (err) => {
    console.error(`[Browser PageError] ${err.message}`);
    anyWindow._criticalErrors.push(`PageError: ${err.message}`);
  });

  window.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    console.log(`[Browser Console] [${type}] ${text}`);

    if (text.includes("RENDERER_READY")) {
      anyWindow._rendererReady = true;
    }

    if (text.includes("Electron Security Warning")) {
      anyWindow._criticalErrors.push(`Security Warning: ${text}`);
    }

    if (
      text.includes("Refused to execute inline script") ||
      text.includes("Content Security Policy")
    ) {
      // CSP Violations are often expected in some configurations, but we log them as errors
      console.error(`[CSP Violation] ${text}`);
    }

    if (type === "error") {
      anyWindow._criticalErrors.push(`Console Error: ${text}`);
    }
  });
}

/**
 * Helper to check for critical errors captured during the test.
 * Should be called in afterEach.
 */
export function checkCriticalErrors(window: Page) {
  const anyWindow = window as any;
  if (anyWindow._criticalErrors && anyWindow._criticalErrors.length > 0) {
    throw new Error(
      `Critical browser errors detected:\n${anyWindow._criticalErrors.join("\n")}`,
    );
  }
}

/**
 * Resets the critical errors checks for a window.
 * Useful when reusing the same app instance across multiple tests.
 */
export function resetConsoleErrors(window: Page) {
  const anyWindow = window as any;
  anyWindow._criticalErrors = [];
}

import * as treeKill from "tree-kill";

/**
 * Robustly closes the Electron app.
 * In CI environments, electronApp.close() can hang.
 * This helper races the close promise against a timeout and force-kills the process tree if necessary.
 */
export async function closeApp(app: ElectronApplication) {
  if (!app) {
    console.log("[closeApp] App is null, skipping.");
    return;
  }

  const proc = app.process();
  const pid = proc ? proc.pid : undefined;
  console.log(`[closeApp] Attempting to close app. PID: ${pid}`);

  // Attempt to close gracefully with a timeout
  const closePromise = app
    .close()
    .then(() => "closed")
    .catch((e: any) => {
      console.log("Error closing app:", e);
      return "error";
    });

  const timeoutPromise = new Promise(
    (resolve) => setTimeout(() => resolve("timeout"), 2000), // Shorten timeout to fail fast
  );

  const result = await Promise.race([closePromise, timeoutPromise]);
  console.log(`[closeApp] Race result: ${result}`);

  if (result === "timeout") {
    console.warn(
      `[closeApp] Force closing electron app (PID: ${pid}) due to timeout`,
    );
    if (pid) {
      if (typeof treeKill === "function") {
        treeKill(pid, "SIGKILL", (err) => {
          if (err) console.error(`[closeApp] tree-kill failed:`, err);
          else console.log(`[closeApp] tree-kill success for PID: ${pid}`);
        });
      } else {
        // Fallback if treeKill isn't a function (e.g. import issue)
        console.warn(
          "[closeApp] treeKill is not a function, falling back to process.kill",
        );
        try {
          process.kill(pid, "SIGKILL");
        } catch (e) {
          console.error("[closeApp] process.kill failed", e);
        }
      }
    }
  } else {
    // Zombie check: Ensure process is actually gone
    if (pid) {
      try {
        process.kill(pid, 0); // Check if exists
        console.warn(
          `[closeApp] App closed but process (PID: ${pid}) still exists. Force killing tree...`,
        );
        treeKill(pid, "SIGKILL", (err) => {
          if (err) console.error(`[closeApp] zombie tree-kill failed:`, err);
          else console.log(`[closeApp] zombie tree-kill success`);
        });
      } catch (e) {
        console.log(`[closeApp] Process (PID: ${pid}) confirmed gone.`);
      }
    }
  }
}
