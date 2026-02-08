const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

/**
 * ワークツリーを管理するスクリプト
 * Usage:
 *   Create:  node manage_worktree.js <conversation-id> [issue-summary]
 *   Cleanup: node manage_worktree.js cleanup <conversation-id> [issue-summary]
 */

const mode = process.argv[2] === "cleanup" ? "cleanup" : "create";
const convId = mode === "cleanup" ? process.argv[3] : process.argv[2];
const summary = mode === "cleanup" ? process.argv[4] : process.argv[3];

if (!convId) {
  console.error("Error: Conversation ID is required.");
  process.exit(1);
}

const worktreeName = summary ? `${convId}_${summary}` : convId;

try {
  // 1. ベースリポジトリのルートを取得
  const baseRepo = execSync("git rev-parse --show-toplevel", {
    encoding: "utf8",
  }).trim();
  const repoName = path.basename(baseRepo);

  // 2. ワークツリーのディレクトリを決定（リポジトリルート内の .worktrees）
  const worktreesDir = path.join(baseRepo, ".worktrees");
  const targetPath = path.join(worktreesDir, worktreeName);
  const branchName = `chat-${worktreeName}`;

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
