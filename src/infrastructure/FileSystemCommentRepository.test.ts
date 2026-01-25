import * as assert from "assert";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { FileSystemCommentRepository } from "./FileSystemCommentRepository";
import { CommentThread, CommentAnchor } from "../domain/Comment";

suite("FileSystemCommentRepository", () => {
  let repo: FileSystemCommentRepository;
  let tempDir: string;
  let mdFilePath: string;

  setup(async () => {
    repo = new FileSystemCommentRepository();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "vscode-comments-test-"));
    mdFilePath = path.join(tempDir, "test.md");
    await fs.writeFile(mdFilePath, "# Test Document", "utf-8");
  });

  teardown(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("saves and loads threads in .jsonl format", async () => {
    const anchor: CommentAnchor = {
      text: "test",
      contextBefore: "",
      contextAfter: "",
      offset: 0,
      length: 4,
    };
    const thread = new CommentThread("thread1", mdFilePath, anchor);
    thread.addComment("Hello World", "Author");

    await repo.save(thread);

    // Verify file exists
    // New rule: test.md -> test.meta.jsonl
    const primaryPath = path.join(tempDir, "test.meta.jsonl");
    const exists = await fs
      .stat(primaryPath)
      .then(() => true)
      .catch(() => false);
    assert.ok(exists, ".meta.jsonl file should be created");

    // Verify content
    const content = await fs.readFile(primaryPath, "utf-8");
    const lines = content.trim().split("\n");
    assert.strictEqual(lines.length, 1);

    const savedThread = JSON.parse(lines[0]);
    assert.strictEqual(savedThread.type, "comment_thread");
    assert.strictEqual(savedThread.id, "thread1");

    // Verify load (Round trip)
    const loadedThreads = await repo.findByFilePath(mdFilePath);
    assert.strictEqual(loadedThreads.length, 1);
    assert.strictEqual(loadedThreads[0].id, "thread1");
    assert.strictEqual(loadedThreads[0].comments[0].content, "Hello World");
  });
});
