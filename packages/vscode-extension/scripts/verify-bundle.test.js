/**
 * Unit tests for verify-bundle.js
 * Run with: node scripts/verify-bundle.test.js
 */

const assert = require("assert");

// Test helper to simulate the detection logic
function shouldSkipRequire(content, matchIndex) {
  const lineStart = content.lastIndexOf("\n", matchIndex) + 1;
  const lineContent = content.substring(lineStart, matchIndex);

  // Skip if line starts with * or // (comment indicators)
  if (/^\s*\*/.test(lineContent) || /^\s*\/\//.test(lineContent)) {
    return true;
  }
  return false;
}

// Test cases
const tests = [
  {
    name: "Should skip JSDoc comment example",
    content: `/**
 * Example usage:
 * var md = require('markdown-it')();
 */`,
    requireIndex: 38, // Position of require in the comment
    expected: true,
  },
  {
    name: "Should skip single-line comment",
    content: `// var md = require('markdown-it')();`,
    requireIndex: 14,
    expected: true,
  },
  {
    name: "Should NOT skip actual require statement",
    content: `const md = require('markdown-it')();`,
    requireIndex: 11,
    expected: false,
  },
  {
    name: "Should NOT skip module.exports require",
    content: `module.exports = require("vscode");`,
    requireIndex: 17,
    expected: false,
  },
  {
    name: "Should skip asterisk comment line",
    content: `   * const x = require('foo');`,
    requireIndex: 15,
    expected: true,
  },
];

// Run tests
let passed = 0;
let failed = 0;

console.log("Running verify-bundle.js unit tests...\n");

for (const test of tests) {
  const result = shouldSkipRequire(test.content, test.requireIndex);
  if (result === test.expected) {
    console.log(`✅ ${test.name}`);
    passed++;
  } else {
    console.log(`❌ ${test.name}`);
    console.log(`   Expected: ${test.expected}, Got: ${result}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
