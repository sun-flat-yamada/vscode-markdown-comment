const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

/**
 * ワークツリーを管理するスクリプト
 * Usage: node manage_worktree.js <conversation-id>
 */

const convId = process.argv[2];
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
  if (!fs.existsSync(worktreesDir)) {
    console.log(`Creating worktrees directory: ${worktreesDir}`);
    fs.mkdirSync(worktreesDir, { recursive: true });
  }

  // 4. ワークツリーの確認と作成
  console.log(`Checking/Creating worktree...`);
  console.log(`- Base Repo: ${baseRepo}`);
  console.log(`- Target Path: ${targetPath}`);
  console.log(`- Branch: ${branchName}`);

  // git worktree list で既に存在するかチェック
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
} catch (err) {
  console.error("Error managing worktree:", err.message);
  process.exit(1);
}
