const fs = require("fs");
const path = require("path");

const bundlePath = path.resolve(__dirname, "../dist/extension.js");
const allowedExternals = [
  "vscode",
  "path",
  "fs",
  "fs/promises",
  "util",
  "events",
  "crypto",
  "net",
  "tls",
  "http",
  "https",
  "child_process",
  "os",
  "stream",
  "assert",
  "url",
  "zlib",
  "buffer",
  "querystring",
  "tty",
  "string_decoder",
  "console",
  "constants",
  "dgram",
  "dns",
  "domain",
  "module",
  "punycode",
  "readline",
  "repl",
  "timers",
  "v8",
  "vm",
  "worker_threads",
  "@markdown-comment/core",
];

// Read bundle content
try {
  console.log(`Checking bundle at: ${bundlePath}`);
  const content = fs.readFileSync(bundlePath, "utf8");

  // Split content into lines for better context detection
  const lines = content.split("\n");

  // Regex to find CommonJS requires
  // Matches: require("...") or require('...')
  // Note: Webpack bundle usually has external "vscode" as: module.exports = require("vscode");
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

  let match;
  const errors = [];
  const foundExternals = new Set();

  while ((match = requireRegex.exec(content)) !== null) {
    const reqModule = match[1];

    // Skip if this require is inside a comment (JSDoc example or documentation)
    // Check preceding characters to detect if we're in a comment context
    const matchStart = match.index;
    const lineStart = content.lastIndexOf("\n", matchStart) + 1;
    const lineContent = content.substring(lineStart, matchStart);

    // Skip if line starts with * or // (comment indicators)
    if (/^\s*\*/.test(lineContent) || /^\s*\/\//.test(lineContent)) {
      continue;
    }

    // Skip relative paths (internal bundle modules require each other via ID or relative path in some modes, but usually webpack bundles everything in one file or uses webpack-specific require)
    // However, standard node require for packages never starts with . or /
    if (
      reqModule.startsWith(".") ||
      reqModule.startsWith("/") ||
      reqModule.startsWith("node:")
    ) {
      continue;
    }

    // normalize node: prefix if present (though we skipped it above, just in case)
    const pureModule = reqModule.replace(/^node:/, "");

    if (!allowedExternals.includes(pureModule)) {
      // Check if it's a allowed built-in match
      errors.push(reqModule);
      console.log(`❌ Unauthorized: ${reqModule}`);
    } else {
      console.log(`✅ Allowed: ${reqModule}`);
      foundExternals.add(pureModule);
    }
  }

  if (errors.length > 0) {
    console.error(
      "❌ Bundle verification failed! Found unauthorized external dependencies:",
    );
    errors.forEach((e) =>
      console.error(`   - "${e}" (normalized: "${e.replace(/^node:/, "")}")`),
    );
    console.error(
      "\nDependencies must be bundled or added to the allowedExternals list in scripts/verify-bundle.js",
    );
    process.exit(1);
  }

  console.log("✅ Bundle verification passed.");
  console.log(
    `   Verified externals: ${Array.from(foundExternals).join(", ")}`,
  );
} catch (err) {
  console.error(`Failed to verify bundle: ${err.message}`);
  process.exit(1);
}
