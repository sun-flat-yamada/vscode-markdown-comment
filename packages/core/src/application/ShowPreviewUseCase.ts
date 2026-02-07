import { IDocumentRepository } from "../domain/IDocumentRepository";
import { IPreviewPresenter } from "./IPreviewPresenter";
import { MarkdownEngine } from "./MarkdownEngine";
import * as path from "path";
import { CommentService } from "./CommentService";
import { STATUS_ICONS } from "../domain/Comment";
import { ViewBuilder } from "./ViewBuilder";
import { AnnotationService } from "../domain/AnnotationService";

export class ShowPreviewUseCase {
  private readonly markdownEngine: MarkdownEngine;

  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly previewPresenter: IPreviewPresenter,
    private readonly commentService: CommentService,
    private readonly viewBuilder: ViewBuilder,
    private readonly annotationService: AnnotationService,
  ) {
    this.markdownEngine = new MarkdownEngine(this.previewPresenter);
  }

  private getNonce() {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  public async execute(
    _column: "active" | "beside" = "beside",
    filePath?: string,
  ): Promise<void> {
    const column: "active" | "beside" = _column;
    let document: any = null;
    if (filePath) {
      document = await this.documentRepository.getDocumentByPath(filePath);
    } else {
      document = await this.documentRepository.getCurrentDocument();
    }

    if (!document) {
      return;
    }

    const threads = await this.commentService.getThreadsForFile(
      document.filePath,
      document.content,
    );

    // Use AnnotationService to inject placeholders with detailed calculations
    const { htmlContent: htmlContentWithPlaceholders } =
      this.annotationService.injectPlaceholders(
        document.content,
        threads as any[],
      );

    const title = `Preview ${document.filePath.split(/[\\/]/).pop()}`;

    // Ensure the panel is ready before rendering content (for asWebviewUri and CSP)
    await this.previewPresenter.ensurePanel(document.filePath, title, column);

    const renderedHtml = this.markdownEngine.render(
      htmlContentWithPlaceholders,
      document.filePath,
    );

    let finalHtml = renderedHtml;

    // Replace placeholders with actual HTML tags
    const highlightEnd = await this.viewBuilder.buildFragment(
      "preview",
      "highlight_end",
      {},
    );

    // Global replacement for highlight end tags (common for all)
    // We use a regex for all MCEND\d+MC to replace with </mark>
    finalHtml = finalHtml.replace(/MCEND\d+MC/g, highlightEnd);

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      const pF = `MCFIRST${i}MC`;
      const pS = `MCSTART${i}MC`;

      const escapedComment = (thread.comments[0]?.content || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

      const highlightStart = await this.viewBuilder.buildFragment(
        "preview",
        "highlight_start",
        {
          VALUE: thread.id,
          IS_FIRST_CLASS: "",
          THREAD_ID: thread.id,
          ESCAPED_COMMENT: escapedComment,
        },
      );
      const highlightStartFirst = await this.viewBuilder.buildFragment(
        "preview",
        "highlight_start",
        {
          VALUE: thread.id,
          IS_FIRST_CLASS: "is-first",
          THREAD_ID: thread.id,
          ESCAPED_COMMENT: escapedComment,
        },
      );

      finalHtml = finalHtml.split(pF).join(highlightStartFirst);
      finalHtml = finalHtml.split(pS).join(highlightStart);
    }

    const sidebarThreads = [...threads].sort(
      (a, b) =>
        (a.anchor?.offset || 0) - (b.anchor?.offset || 0) ||
        a.id.localeCompare(b.id),
    );

    const initialData = {
      threads: sidebarThreads.map((t) => ({
        id: t.id,
        anchor: t.anchor,
        comments: t.comments.map((c) => ({
          id: c.id,
          content: c.content,
          author: c.author,
          createdAt: c.createdAt,
          status: c.status,
          tags: c.tags,
        })),
      })),
      statusIcons: STATUS_ICONS,
    };

    const cspSource = this.previewPresenter.getCspSource();
    const nonce = this.getNonce();
    const csp = `default-src 'none'; img-src ${cspSource} https: data:; script-src ${cspSource} 'nonce-${nonce}'; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource};`;

    const variables = {
      TITLE: title,
      CSP: csp,
      NONCE: nonce,
      BODY_CLASS: this.previewPresenter.isSidebarVisible(document.filePath)
        ? "sidebar-open"
        : "",
      SIDEBAR_CLASS: this.previewPresenter.isSidebarVisible(document.filePath)
        ? "visible"
        : "",
      CONTENT: finalHtml,
      INITIAL_DATA: JSON.stringify(initialData),
    };

    const fullHtml = await this.viewBuilder.build("preview/preview", variables);

    await this.previewPresenter.show(
      fullHtml,
      title,
      document.filePath,
      column,
      initialData.threads,
    );
  }
}
