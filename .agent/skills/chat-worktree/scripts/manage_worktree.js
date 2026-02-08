const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

/**
 * ワークツリーを管理するスクリプト
 * Usage:
 *   Create:  node manage_worktree.js <conversation-id>
 *   Cleanup: node manage_worktree.js cleanup <conversation-id>
 */

const mode = process.argv[2] === "cleanup" ? "cleanup" : "create";
const convId = mode === "cleanup" ? process.argv[3] : process.argv[2];

if (!convId) {
  console.error("Error: Conversation ID is required.");
  process.exit(1);
}

try {
  // 1. ベースリポジトリのルートを取得
  const baseRepo = execSync("git rev-parse --show-toplevel", {
    encoding: "utf8",
  }).trim();
  const repoName = path.basename(baseRepo);

  // 2. ワークツリーの親ディレクトリを決定（ベースの隣）
  const parentDir = path.dirname(baseRepo);
  const worktreesDir = path.join(parentDir, `${repoName}-worktrees`);
  const targetPath = path.join(worktreesDir, convId);
  const branchName = `chat-${convId}`;

  // 3. 親ディレクトリの作成
  if (mode === "create") {
    if (!fs.existsSync(worktreesDir)) {
      fs.mkdirSync(worktreesDir, { recursive: true });
    }

    // 4. ワークツリーの確認と作成
    const existing = execSync("git worktree list", {
      cwd: baseRepo,
      encoding: "utf8",
    });
    if (existing.includes(targetPath)) {
      console.log("Success: Worktree already exists.");
    } else {
      // 新規作成
      execSync(`git worktree add -b "${branchName}" "${targetPath}"`, {
        cwd: baseRepo,
        stdio: "inherit",
      });
      console.log("Success: Worktree created successfully.");
    }

    console.log(`WORKTREE_PATH=${targetPath}`);
  } else {
    // Cleanup mode
    console.log(`Cleaning up worktree for ${convId}...`);

    // 1. Remove worktree
    try {
      execSync(`git worktree remove "${targetPath}"`, {
        cwd: baseRepo,
        stdio: "inherit",
      });
      console.log(`- Removed worktree at ${targetPath}`);
    } catch (e) {
      console.log(`- Worktree at ${targetPath} not found or already removed.`);
    }

    // 2. Delete branch
    try {
      execSync(`git branch -D "${branchName}"`, {
        cwd: baseRepo,
        stdio: "inherit",
      });
      console.log(`- Deleted branch ${branchName}`);
    } catch (e) {
      console.log(`- Branch ${branchName} not found.`);
    }

    console.log("Success: Cleanup complete.");
  }
} catch (err) {
  console.error("Error managing worktree:", err.message);
  process.exit(1);
}
