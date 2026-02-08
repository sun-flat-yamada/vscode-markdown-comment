---
name: test_runner
description: Proficiency in executing and troubleshooting tests for the Markdown Comment extension and Electron app.
---

# Test Runner Skill

This skill provides instructions for running and maintaining tests across the Markdown Comment monorepo.

## Project Structure & Test Commands

The project uses a monorepo structure with the following packages:

| Package | Purpose | Test Command |
| :--- | :--- | :--- |
| `packages/core` | Core business logic | `npm test -w packages/core` |
| `packages/vscode-extension` | VS Code Extension adapter | `npm test -w packages/vscode-extension` |
| `packages/electron-app` | Standalone Electron application | `npm run build -w packages/electron-app` (UI verify) |

### Global Commands

- Run all tests: `npm test`
- Build all packages: `npm run build:all`

## Test Types in `vscode-extension`

1. **Unit Tests**:
   - Location: `packages/vscode-extension/tests/**/*.test.ts`
   - Command: `npm run test:unit -w packages/vscode-extension`
   - Focus: Business logic and infrastructure adapters without VS Code API.

2. **Integration Tests**:
   - Location: `packages/vscode-extension/tests/suite/**/*.ts`
   - Command: `npm run test:integration -w packages/vscode-extension`
   - Focus: Features requiring the VS Code internal API and UI.

## Troubleshooting

- **Build Failures**: Ensure `npm run build:all` is run if changes are made to `packages/core`.
- **Integration Test Hangs**: Check for hung VS Code instances. Kill them if necessary.
- **Path Issues**: On Windows, ensure file paths are handled consistently with the normalization logic (lowercase `C:`).

## AI Agent Guidelines: Output Directory

> [!IMPORTANT]
> **MANDATORY**: For any temporary files, failure logs, or debug artifacts generated during development or testing, AI agents **MUST** use the centralized `.dev_output/` directory in the project root.

- **Standard Path**: `.dev_output/`
- **Structure**:
  - Organize files into subdirectories by package or context: `.dev_output/vscode-extension/` or `.dev_output/electron-app/`.
- **Naming Convention (Strict)**:
  - `YYYYMMDD_[context]_[description].[ext]`
- **Usage Example**:
  - `npm test > .dev_output/vscode-extension/20260208_unit_test.log`
- **Cleanup**: Do not leave transient files in the project root or package roots.

## Automation Hook

This skill is intended to be triggered automatically by `hooks.json` whenever `.ts` or `.js` files are modified in the `src` directories.
