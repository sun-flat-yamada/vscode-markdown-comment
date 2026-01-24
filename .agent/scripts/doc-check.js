#!/usr/bin/env node
/**
 * Documentation consistency checker
 * Verifies that documentation is in sync with code changes
 */

const { getProjectRoot, fileExists, readFile } = require("./lib/utils");
const path = require("path");

const DOCS_TO_CHECK = ["README.md", "GEMINI.md"];

function checkDocumentation() {
  const projectRoot = getProjectRoot();
  const results = [];

  for (const doc of DOCS_TO_CHECK) {
    const docPath = path.join(projectRoot, doc);

    if (!fileExists(docPath)) {
      results.push({
        file: doc,
        status: "missing",
        message: `Documentation file ${doc} not found`,
      });
      continue;
    }

    const content = readFile(docPath);
    if (!content) {
      results.push({
        file: doc,
        status: "error",
        message: `Could not read ${doc}`,
      });
      continue;
    }

    // Basic checks
    const checks = [];

    // Check for TODO markers
    if (content.includes("TODO") || content.includes("FIXME")) {
      checks.push("Contains TODO/FIXME markers");
    }

    // Check for placeholder text
    if (content.includes("[TBD]") || content.includes("[placeholder]")) {
      checks.push("Contains placeholder text");
    }

    results.push({
      file: doc,
      status: checks.length > 0 ? "warning" : "ok",
      message: checks.length > 0 ? checks.join(", ") : "OK",
    });
  }

  return results;
}

function main() {
  console.log("Checking documentation consistency...\n");

  const results = checkDocumentation();

  for (const result of results) {
    const icon =
      result.status === "ok" ? "✓" : result.status === "warning" ? "⚠" : "✗";
    console.log(`${icon} ${result.file}: ${result.message}`);
  }

  const hasIssues = results.some((r) => r.status !== "ok");
  if (hasIssues) {
    console.log("\n⚠ Some documentation needs attention.");
    process.exit(1);
  } else {
    console.log("\n✓ All documentation checks passed.");
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkDocumentation };
