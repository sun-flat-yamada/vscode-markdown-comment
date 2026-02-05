import * as assert from "assert";
import { ShowPreviewUseCase } from "./ShowPreviewUseCase";
import { IDocumentRepository } from "../domain/IDocumentRepository";
import { IPreviewPresenter } from "./IPreviewPresenter";
import { CommentService } from "./CommentService";
import {
  CommentThread,
  Comment,
  CommentStatus,
  MARKDOWN_EXTENSION,
} from "../index";
import { MarkdownDocument } from "../domain/MarkdownDocument";
import { AnnotationService } from "../domain/AnnotationService";

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
  async ensurePanel(
    _filePath: string,
    _title: string,
    _column?: "active" | "beside",
  ): Promise<void> {}
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
      {
        build: async (_viewName: string, variables: any) => variables.CONTENT,
        buildFragment: async (
          _viewName: string,
          _fragName: string,
          variables: any,
        ) => variables.VALUE || "",
      } as any,
      new AnnotationService(),
    );
  });

  test("should handle overlapping ranges correctly", async () => {
    const content = "Hello world";
    // MarkdownDocument constructor: (filePath: string, content: string)
    docRepo.document = new MarkdownDocument(
      content,
      "test" + MARKDOWN_EXTENSION,
    );

    const thread1 = new CommentThread("t1", "test" + MARKDOWN_EXTENSION, {
      offset: 0,
      length: 5,
    } as any);
    thread1.addComment("C1", "A");

    const thread2 = new CommentThread("t2", "test" + MARKDOWN_EXTENSION, {
      offset: 3,
      length: 5,
    } as any);
    thread2.addComment("C2", "A");

    commentService.threads = [thread1, thread2];

    await useCase.execute();
    const html = presenter.lastHtml;
    // console.log("DEBUG OVERLAP HTML:", html);

    assert.ok(html.includes("t1"), "Should contain t1 in highlight start");
    assert.ok(html.includes("t2"), "Should contain t2 in highlight start");
  });

  test("should handle image tags correctly", async () => {
    const content = '![Logo](logo.png "Title")';
    docRepo.document = new MarkdownDocument(
      content,
      "test" + MARKDOWN_EXTENSION,
    );

    const thread1 = new CommentThread("t1", "test" + MARKDOWN_EXTENSION, {
      offset: 0,
      length: content.length,
    } as any);
    thread1.addComment("C1", "A");

    commentService.threads = [thread1];

    await useCase.execute();
    const html = presenter.lastHtml;
    // console.log("DEBUG IMG HTML:", html);

    assert.ok(html.includes("<img"), "Should contain img tag");
    const expectedPathPart = "logo.png";
    assert.ok(
      html.includes(expectedPathPart),
      `Should resolve relative image path. Expected to include: ${expectedPathPart}`,
    );
  });
  test("should handle HTML img tags correctly", async () => {
    const content = '<img src="logo.png" alt="Logo">';
    docRepo.document = new MarkdownDocument(
      content,
      "test" + MARKDOWN_EXTENSION,
    );

    const thread1 = new CommentThread("t1", "test" + MARKDOWN_EXTENSION, {
      offset: 0,
      length: content.length,
    } as any);
    thread1.addComment("C1", "A");

    commentService.threads = [thread1];

    await useCase.execute();
    const html = presenter.lastHtml;

    assert.ok(html.includes("<img"), "Should contain img tag");
    assert.ok(
      html.includes("webview://"),
      "Should resolve relative path in HTML img tag",
    );
    assert.ok(
      html.includes("logo.png"),
      "Should preserve filename in resolved path",
    );
  });

  test("should NOT mangle HTML attributes when placeholders are inside", async () => {
    // This simulates the issue where a comment is placed on text within an HTML tag (unlikely but possible via raw edits)
    // or when offsets somehow land inside.
    const content =
      '<img src="logo.png" alt="Markdown Comment Logo" width="128" />';
    docRepo.document = new MarkdownDocument(
      content,
      "test" + MARKDOWN_EXTENSION,
    );

    // Comment specifically on "Markdown Comment Logo"
    // Offset is approx 25, length 21.
    // We'll just put a thread that overlaps significantly.
    const thread1 = new CommentThread("t1", "test" + MARKDOWN_EXTENSION, {
      offset: 20,
      length: 10,
    } as any);
    thread1.addComment("C1", "A");

    commentService.threads = [thread1];

    await useCase.execute();
    const html = presenter.lastHtml;

    // Verify the HTML is still valid and doesn't contain <mark> tags inside attributes
    assert.ok(
      html.includes('<img src="'),
      "HTML should still be valid img tag",
    );
    assert.ok(
      !html.includes('alt="<mark'),
      "Should NOT contain <mark> inside alt attribute",
    );
    assert.ok(
      html.includes('alt="Markdown Comment Logo"'),
      "Should preserve alt text without mangling",
    );
  });

  test("should NOT mangle Markdown image syntax when placeholders are inside", async () => {
    const imageName = "logo.png";
    const content = `![Markdown Image](${imageName})`;
    docRepo.document = new MarkdownDocument(
      content,
      "test" + MARKDOWN_EXTENSION,
    );

    // Comment specifically on "Markdown" part of the alt text
    const thread1 = new CommentThread("t1", "test" + MARKDOWN_EXTENSION, {
      offset: 2, // Inside ![
      length: 8, // Over "Markdown"
    } as any);
    thread1.addComment("C1", "A");

    commentService.threads = [thread1];

    await useCase.execute();
    const html = presenter.lastHtml;

    // Verify the HTML is still a valid img tag and correctly resolved
    assert.ok(html.includes("<img"), "Should still render as img tag");
    assert.ok(
      html.includes(imageName),
      "Should still contain the image filename",
    );
    // MCFIRST/MCEND should be outside the <img> tag
    assert.ok(
      html.indexOf("MCFIRST0MC") < html.indexOf("<img"),
      "Anchor should be before the image",
    );
  });
});
