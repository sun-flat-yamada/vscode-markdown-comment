# Release Process

This document outlines the steps to prepare and execute a new release of the extension.

## Prerequisites

- Ensure all changes for the release are merged into the main development branch.
- Ensure all tests pass.


## 1. Prepare Release

Use the provided automation scripts to create a release branch and bump the version.

### Windows

Run the batch script from the project root:

```cmd
.\scripts\prepare_release.bat
```

Or provide the version directly:

```cmd
.\scripts\prepare_release.bat 1.2.3
```

### Linux / macOS

Run the shell script:

```bash
./scripts/prepare_release.sh
```

Or via npm (requires bash environment):

```bash
npm run release:prepare -- 1.2.3
```

**What the script does:**
1. Creates a new branch `release/v<version>`.
2. Updates `version` in `package.json`.
3. Commits the change.

## 2. Verify and Push

1. correct any additional files if necessary (e.g. `CHANGELOG.md`).
2. Push the release branch:
   ```bash
   git push origin release/v<version>
   ```

## 3. Finalize Release

Open a Pull Request from `release/v<version>` to your main branch (e.g. `main` or `master`).
Once merged, the standard release workflow (tagged release) should be followed as described in `release_workflow.md`.
