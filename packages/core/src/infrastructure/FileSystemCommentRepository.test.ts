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

  test("saves and loads threads in new .meta.json format", async () => {
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

    // Verify file exists with new extension
    const primaryPath = path.join(tempDir, "test.meta.json");
    const exists = await fs
      .stat(primaryPath)
      .then(() => true)
      .catch(() => false);
    assert.ok(exists, ".meta.json file should be created");

    // Verify content is Pretty Printed JSON
    const content = await fs.readFile(primaryPath, "utf-8");
    const data = JSON.parse(content);
    assert.strictEqual(data.version, "2.0");
    assert.ok(Array.isArray(data.threads));
    assert.strictEqual(data.threads.length, 1);
    assert.strictEqual(data.threads[0].id, "thread1");

    // Verify load (Round trip)
    const loadedThreads = await repo.findByFilePath(mdFilePath);
    assert.strictEqual(loadedThreads.length, 1);
    assert.strictEqual(loadedThreads[0].id, "thread1");
    assert.strictEqual(loadedThreads[0].comments[0].content, "Hello World");
  });

  test("reads legacy .meta.jsonl format for backward compatibility", async () => {
    // Create a legacy format file
    const legacyPath = path.join(tempDir, "test.meta.jsonl");
    const legacyContent = JSON.stringify({
      type: "comment_thread",
      id: "legacy-thread",
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
          author: "LegacyAuthor",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          status: "open",
          tags: [],
        },
      ],
    });
    await fs.writeFile(legacyPath, legacyContent, "utf-8");

    // Load should read legacy format
    const loadedThreads = await repo.findByFilePath(mdFilePath);
    assert.strictEqual(loadedThreads.length, 1);
    assert.strictEqual(loadedThreads[0].id, "legacy-thread");
    assert.strictEqual(loadedThreads[0].comments[0].content, "Legacy Comment");
  });

  test("saves tags in .meta.json format", async () => {
    const anchor: CommentAnchor = {
      text: "test",
      contextBefore: "",
      contextAfter: "",
      offset: 0,
      length: 4,
    };
    const thread = new CommentThread("thread-with-tags", mdFilePath, anchor);
    thread.addComment("Comment with tags", "Author");

    await repo.save(thread);
    await repo.saveTags(mdFilePath, ["todo", "review"]);

    // Verify tags are saved
    const content = await fs.readFile(
      path.join(tempDir, "test.meta.json"),
      "utf-8",
    );
    const data = JSON.parse(content);
    assert.deepStrictEqual(data.tags, ["todo", "review"]);

    // Verify tags can be loaded
    const loadedTags = await repo.getTags(mdFilePath);
    assert.deepStrictEqual(loadedTags, ["todo", "review"]);
  });
});
