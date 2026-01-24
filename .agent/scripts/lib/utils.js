/**
 * Cross-platform utilities for Antigravity scripts
 * @module utils
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Get the project root directory
 * @returns {string} Absolute path to project root
 */
function getProjectRoot() {
  return path.resolve(__dirname, "..", "..", "..");
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to check
 * @returns {boolean}
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Read a file as UTF-8 string
 * @param {string} filePath - Path to file
 * @returns {string|null} File contents or null if error
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

/**
 * Get platform-specific newline character
 * @returns {string}
 */
function getNewline() {
  return os.platform() === "win32" ? "\r\n" : "\n";
}

/**
 * Normalize path separators for current platform
 * @param {string} inputPath - Path to normalize
 * @returns {string}
 */
function normalizePath(inputPath) {
  return path.normalize(inputPath);
}

module.exports = {
  getProjectRoot,
  fileExists,
  readFile,
  getNewline,
  normalizePath,
};
