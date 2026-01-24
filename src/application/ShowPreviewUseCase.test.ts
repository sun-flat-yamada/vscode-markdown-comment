import * as assert from "assert";
import { ShowPreviewUseCase } from "./ShowPreviewUseCase";
import { IDocumentRepository } from "../domain/IDocumentRepository";
import { IPreviewPresenter } from "./IPreviewPresenter";
import { CommentService } from "./CommentService";
import { CommentThread, CommentAnchor } from "../domain/Comment";
import { MarkdownDocument } from "../domain/MarkdownDocument";

class MockDocumentRepository implements IDocumentRepository {
  public document: MarkdownDocument | null = null;
  async getCurrentDocument(): Promise<MarkdownDocument | null> {
    return this.document;
  }
  async getDocumentByPath(_filePath: string): Promise<MarkdownDocument | null> {
    return this.document;
  }
}

class MockPreviewPresenter implements IPreviewPresenter {
  public lastHtml: string = "";
  async show(html: string, _title: string, _filePath: string): Promise<void> {
    this.lastHtml = html;
  }
  getSelectedText(): string {
    return "";
  }
  onDidClickComment(_callback: (threadId: string) => void): void {}
  onUpdateStatus(
    _callback: (threadId: string, commentId: string, status: string) => void,
  ): void {}
  isSidebarVisible(_filePath: string): boolean {
    return false;
  }
  onDidToggleSidebar(
    _callback: (filePath: string, visible: boolean) => void,
  ): void {}
  getCurrentFilePath(): string | undefined {
    return "";
  }
}

class MockCommentService {
  public threads: CommentThread[] = [];
  async getThreadsForFile(
    _filePath: string,
    _content: string,
  ): Promise<CommentThread[]> {
    return this.threads;
  }
}

suite("ShowPreviewUseCase", () => {
  let docRepo: MockDocumentRepository;
  let presenter: MockPreviewPresenter;
  let commentService: MockCommentService;
  let useCase: ShowPreviewUseCase;

  setup(() => {
    docRepo = new MockDocumentRepository();
    presenter = new MockPreviewPresenter();
    commentService = new MockCommentService();
    useCase = new ShowPreviewUseCase(
      docRepo as any,
      presenter as any,
      commentService as any,
    );
  });

  test("should handle overlapping ranges correctly", async () => {
    const content = "Hello world";
    docRepo.document = new MarkdownDocument(content, "test.md");

    // Thread 1: "Hello" (0-5)
    const thread1 = new CommentThread("t1", "test.md", {
      offset: 0,
      length: 5,
    } as any);
    thread1.addComment("Comment 1", "author");

    // Thread 2: "lo wo" (3-8)
    const thread2 = new CommentThread("t2", "test.md", {
      offset: 3,
      length: 5,
    } as any);
    thread2.addComment("Comment 2", "author");

    commentService.threads = [thread1, thread2];

    await useCase.execute();
    const html = presenter.lastHtml;

    // Verify presence of thread markers
    assert.ok(html.includes('data-thread-id="t1"'), "Should contain thread 1");
    assert.ok(html.includes('data-thread-id="t2"'), "Should contain thread 2");

    // "Hel" should be only T1 and it's the first segment for T1
    assert.ok(
      /<mark[^>]*class="[^"]*is-first[^"]*"[^>]*data-thread-id="t1"[^>]*>Hel<\/mark>/i.test(
        html,
      ),
      "Hel should be in T1 with is-first",
    );

    // "lo" should be both T1 and T2 (nested)
    // T1 is NOT first here, T2 IS first here
    const hasT1T2 =
      /<mark[^>]*data-thread-id="t1"(?!.*is-first)[^>]*>\s*<mark[^>]*is-first[^>]*data-thread-id="t2"[^>]*>lo<\/mark>\s*<\/mark>/i.test(
        html,
      );
    const hasT2T1 =
      /<mark[^>]*is-first[^>]*data-thread-id="t2"[^>]*>\s*<mark[^>]*data-thread-id="t1"(?!.*is-first)[^>]*>lo<\/mark>\s*<\/mark>/i.test(
        html,
      );
    assert.ok(
      hasT1T2 || hasT2T1,
      "lo should be wrapped by both T1 (not first) and T2 (is first)",
    );

    // " wo" should be only T2 and it's NOT the first segment for T2
    assert.ok(
      /<mark[^>]*data-thread-id="t2"(?!.*is-first)[^>]*> wo<\/mark>/i.test(
        html,
      ),
      " ' wo' should be in T2 without is-first",
    );
  });

  test("should handle non-overlapping ranges correctly", async () => {
    const content = "Hello world";
    docRepo.document = new MarkdownDocument(content, "test.md");

    const thread1 = new CommentThread("t1", "test.md", {
      offset: 0,
      length: 5,
    } as any);
    thread1.addComment("C1", "A");

    const thread2 = new CommentThread("t2", "test.md", {
      offset: 6,
      length: 5,
    } as any);
    thread2.addComment("C2", "A");

    commentService.threads = [thread1, thread2];

    await useCase.execute();
    const html = presenter.lastHtml;

    assert.ok(
      /<mark[^>]*is-first[^>]*data-thread-id="t1"[^>]*>Hello<\/mark>/i.test(
        html,
      ),
      "Hello should be in t1 with is-first",
    );
    assert.ok(
      /<mark[^>]*is-first[^>]*data-thread-id="t2"[^>]*>world<\/mark>/i.test(
        html,
      ),
      "world should be in t2 with is-first",
    );
  });
});
