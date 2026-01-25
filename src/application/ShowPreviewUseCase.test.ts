import * as assert from "assert";
import { ShowPreviewUseCase } from "./ShowPreviewUseCase";
import { IDocumentRepository } from "../domain/IDocumentRepository";
import { IPreviewPresenter } from "./IPreviewPresenter";
import { CommentService } from "./CommentService";
import { CommentThread } from "../domain/Comment";
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
  async show(
    html: string,
    _title: string,
    _filePath: string,
    _column: "active" | "beside" | undefined,
  ): Promise<void> {
    this.lastHtml = html;
  }
  asWebviewUri(localPath: string): string {
    return `webview://${localPath}`;
  }
  getCspSource(): string {
    return "csp-source";
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
    // MarkdownDocument constructor: (filePath: string, content: string)
    docRepo.document = new MarkdownDocument(content, "test.md");

    const thread1 = new CommentThread("t1", "test.md", {
      offset: 0,
      length: 5,
    } as any);
    thread1.addComment("C1", "A");

    const thread2 = new CommentThread("t2", "test.md", {
      offset: 3,
      length: 5,
    } as any);
    thread2.addComment("C2", "A");

    commentService.threads = [thread1, thread2];

    await useCase.execute();
    const html = presenter.lastHtml;

    assert.ok(html.includes("t1"), "Should contain t1");
    assert.ok(html.includes("t2"), "Should contain t2");
  });

  test("should handle image tags correctly", async () => {
    const content = '![Logo](logo.png "Title")';
    docRepo.document = new MarkdownDocument(content, "test.md");

    const thread1 = new CommentThread("t1", "test.md", {
      offset: 0,
      length: content.length,
    } as any);
    thread1.addComment("C1", "A");

    commentService.threads = [thread1];

    await useCase.execute();
    const html = presenter.lastHtml;
    // console.log("DEBUG IMG HTML:", html);

    assert.ok(html.includes("<img"), "Should contain img tag");
  });
});
