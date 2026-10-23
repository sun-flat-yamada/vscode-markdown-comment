import * as os from "os";
import * as path from "path";

import { runTests } from "@vscode/test-electron";

// Centralized output directory for all tests
const TEST_OUTPUT_DIR =
  process.env.TEST_OUTPUT_DIR ||
  path.resolve(__dirname, "../../../../.dev_output");

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");

    // Standardize .vscode-test to .dev_output directory
    process.env.VSCODE_TEST_BASE_DIR = path.join(
      TEST_OUTPUT_DIR,
      "vscode-extension",
      ".vscode-test",
    );

    // Download VS Code, unzip it and run the integration test
    // Keep the user data dir short: macOS rejects IPC socket paths over 103 chars
    const userDataDir = path.join(os.tmpdir(), "mc-vscode-test");

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ["--user-data-dir", userDataDir],
    });
  } catch (err) {
    console.error("Failed to run tests", err);
    process.exit(1);
  }
}

main();
