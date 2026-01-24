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

    // Check that 'type' is the first property
    assert.ok(
      lines[0].startsWith('{"type":"comment_thread"'),
      "JSON should start with type field",
    );

    const savedThread = JSON.parse(lines[0]);
    assert.strictEqual(savedThread.type, "comment_thread");
    assert.strictEqual(savedThread.id, "thread1");

    // Verify load
    const loadedThreads = await repo.findByFilePath(mdFilePath);
    assert.strictEqual(loadedThreads.length, 1);
    assert.strictEqual(loadedThreads[0].id, "thread1");
    assert.strictEqual(loadedThreads[0].comments[0].content, "Hello World");
  });

  test("falls back to .meta.md (legacy) if new primary does not exist", async () => {
    // Legacy mapping: sample.md -> sample.meta.md
    const legacyPath = path.join(tempDir, "test.meta.md");
    const legacyData = {
      threads: [
        {
          id: "legacy1",
          anchor: {
            text: "legacy",
            contextBefore: "",
            contextAfter: "",
            offset: 0,
            length: 6,
          },
          comments: [
            {
              id: "c1",
              content: "Legacy Comment",
              author: "OldAuthor",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              status: "open",
              tags: [],
            },
          ],
        },
      ],
    };

    const metaContent = "```json\n" + JSON.stringify(legacyData) + "\n```";
    await fs.writeFile(legacyPath, metaContent, "utf-8");

    const loadedThreads = await repo.findByFilePath(mdFilePath);
    assert.strictEqual(loadedThreads.length, 1);
    assert.strictEqual(loadedThreads[0].id, "legacy1");
  });

  test("migrates legacy .jsonl to .meta.jsonl on save", async () => {
    // Setup legacy file (sample.md.jsonl)
    const legacyPath = path.join(tempDir, "test.md.jsonl");
    const legacyThread = {
      id: "legacy_jsonl",
      anchor: {
        text: "legacy",
        contextBefore: "",
        contextAfter: "",
        offset: 0,
        length: 6,
      },
      comments: [
        {
          id: "c1",
          content: "Legacy JSONL",
          author: "JsonlAuthor",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "open",
          tags: [],
        },
      ],
    };
    await fs.writeFile(legacyPath, JSON.stringify(legacyThread), "utf-8");

    // Load
    const loadedThreads = await repo.findByFilePath(mdFilePath);
    assert.strictEqual(loadedThreads.length, 1);
    const thread = loadedThreads[0];
    assert.strictEqual(thread.id, "legacy_jsonl");

    // Save
    thread.addComment("New Reply", "NewAuthor");
    await repo.save(thread);

    // Verify
    const primaryPath = path.join(tempDir, "test.meta.jsonl");
    const exists = await fs
      .stat(primaryPath)
      .then(() => true)
      .catch(() => false);
    assert.ok(exists, "New .meta.jsonl should be created after save");

    const content = await fs.readFile(primaryPath, "utf-8");
    const savedThread = JSON.parse(content.trim());
    assert.strictEqual(savedThread.id, "legacy_jsonl");
    assert.strictEqual(savedThread.comments.length, 2);
  });
});
