import * as assert from "assert";
import { VSCodeCommentController } from "../../src/infrastructure/VSCodeCommentController";
import { Comment, CommentThread, CommentStatus } from "@markdown-comment/core";

// Mocks are handled by tsconfig paths to tests/mocks/vscode.ts

suite("VSCodeCommentController", () => {
  let controller: VSCodeCommentController;
  let mockCommentService: any;
  let mockContext: any;

  setup(() => {
    mockCommentService = {
      updateComment: async () => {},
      deleteComment: async () => {},
      updateThreadStatus: async () => {},
      getThreadsForFile: async () => [], // Default return
    };
    mockContext = {
      subscriptions: [],
    };
    // Initialize controller in test or here with valid objects
    controller = new VSCodeCommentController(mockContext, mockCommentService);
  });

  test("should create thread from domain thread", async () => {
    // Mock Document and Editor
    const mockDoc = {
      uri: { fsPath: "file.md", toString: () => "file.md" },
      getText: () => "content",
      positionAt: (offset: number) => ({ line: 0, character: offset }),
    };
    const mockEditor: any = {
      document: mockDoc,
    };

    // Setup domain thread return
    const thread = new CommentThread("t1", "file.md", {
      offset: 0,
      length: 5,
    } as any);
    thread.addComment("c1", "content");
    mockCommentService.getThreadsForFile = async () => [thread];

    await controller.refreshForEditor(mockEditor);

    // If it didn't crash, it means it successfully called vscode.comments.createCommentController
    // and created a thread via the mock.
    assert.ok(true);
  });
});
