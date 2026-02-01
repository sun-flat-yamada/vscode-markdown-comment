import { IDocumentRepository } from "../domain/IDocumentRepository";
import { IPreviewPresenter } from "./IPreviewPresenter";
import { MarkdownEngine } from "./MarkdownEngine";
import * as path from "path";
import { CommentService } from "./CommentService";
import { STATUS_ICONS } from "../domain/Comment";
import { ViewBuilder } from "./ViewBuilder";

export class ShowPreviewUseCase {
  private readonly markdownEngine: MarkdownEngine;

  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly previewPresenter: IPreviewPresenter,
    private readonly commentService: CommentService,
    private readonly viewBuilder: ViewBuilder,
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

    const points: {
      offset: number;
      type: "start" | "end";
      threadId: string;
      threadIndex: number;
    }[] = [];

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      points.push({
        offset: thread.anchor.offset,
        type: "start",
        threadId: thread.id,
        threadIndex: i,
      });
      points.push({
        offset: thread.anchor.offset + thread.anchor.length,
        type: "end",
        threadId: thread.id,
        threadIndex: i,
      });
    }

    // Adjust points to snap to protection boundaries if they fall inside a tag or Markdown syntax
    // This ensure that anchors (MCFIRST/MCSTART) are placed outside, making them visible and protecting syntax.
    for (const point of points) {
      // 1. Strict protection (HTML, links, images) - snap outward
      const protectionRange = this.getProtectionRange(
        document.content,
        point.offset,
      );
      if (protectionRange) {
        if (point.type === "start") {
          point.offset = protectionRange.start;
        } else {
          point.offset = protectionRange.end;
        }
      }

      // 2. Header protection - snap to END of prefix to preserve block syntax
      // We must not place markers inside "# " or at the start of it, otherwise markdown-it fails to parse the header.
      const headerPrefix = this.getMarkdownHeaderRange(
        document.content,
        point.offset,
      );
      if (headerPrefix) {
        // Snap to the end of the prefix (e.g. after "# ")
        if (point.offset < headerPrefix.end) {
          point.offset = headerPrefix.end;
        }
      }
    }

    points.sort((a, b) => {
      if (a.offset !== b.offset) {
        return a.offset - b.offset;
      }
      if (a.type !== b.type) {
        return a.type === "end" ? -1 : 1;
      }
      return a.threadIndex - b.threadIndex;
    });

    let htmlContentWithPlaceholders = "";
    let lastOffset = 0;
    const activeThreadIndices = new Set<number>();
    const iconDisplayed = new Set<number>();

    for (const point of points) {
      if (point.offset > lastOffset) {
        let segment = document.content.substring(lastOffset, point.offset);

        // We no longer need isInsideTag check here because points are already snapped
        // to tag boundaries or kept outside. This simplifies the loop.
        const sortedActive = Array.from(activeThreadIndices).sort(
          (a, b) => a - b,
        );
        for (const idx of sortedActive) {
          const isFirst = !iconDisplayed.has(idx);
          if (isFirst) {
            segment = `MCFIRST${idx}MC` + segment + `MCEND${idx}MC`;
            iconDisplayed.add(idx);
          } else {
            segment = `MCSTART${idx}MC` + segment + `MCEND${idx}MC`;
          }
        }
        htmlContentWithPlaceholders += segment;
      } else if (point.offset === lastOffset && point.type === "start") {
        // [Fix] Handle zero-length comments (point comments)
        const thread = threads[point.threadIndex];
        if (thread.anchor.length === 0) {
          if (!iconDisplayed.has(point.threadIndex)) {
            htmlContentWithPlaceholders += `MCFIRST${point.threadIndex}MCMCEND${point.threadIndex}MC`;
            iconDisplayed.add(point.threadIndex);
          }
        }
      }

      if (point.type === "start") {
        activeThreadIndices.add(point.threadIndex);
      } else {
        activeThreadIndices.delete(point.threadIndex);
      }
      lastOffset = point.offset;
    }

    // [Fix] Restore missing remaining document content after the last comment point
    if (lastOffset < document.content.length) {
      htmlContentWithPlaceholders += document.content.substring(lastOffset);
    }

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
    const csp = `default-src 'none'; img-src ${cspSource} https: data:; script-src '${cspSource}' 'nonce-${nonce}' 'unsafe-eval'; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource};`;

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

  /**
   * Identifies if an offset is inside a "protected" range that should not be split by placeholders.
   * This includes HTML tags (<...>) and Markdown image/link syntax (![...]() / [...]()).
   */
  private getProtectionRange(
    content: string,
    offset: number,
  ): { start: number; end: number } | null {
    // 1. Check for HTML tag <...>
    const htmlRange = this.getHtmlTagRange(content, offset);
    if (htmlRange) return htmlRange;

    // 2. Check for Markdown image/link syntax: ![...](...) or [...]()
    const mdRange = this.getMarkdownSyntaxRange(content, offset);
    if (mdRange) return mdRange;

    // Note: Headers are handled separately in the adjustments loop because they need different snap behavior (snap to end)

    return null;
  }

  private getHtmlTagRange(
    content: string,
    offset: number,
  ): { start: number; end: number } | null {
    const before = content.lastIndexOf("<", offset);
    if (before === -1) return null;

    const charAfterLT = content[before + 1];
    if (charAfterLT && /\s/.test(charAfterLT)) return null;

    const after = content.indexOf(">", before);
    if (after === -1) return null;

    if (before < offset && offset <= after) {
      const newline = content.substring(before, after).includes("\n");
      if (newline) return null;
      return { start: before, end: after + 1 };
    }
    return null;
  }

  private getMarkdownSyntaxRange(
    content: string,
    offset: number,
  ): { start: number; end: number } | null {
    // Look for potential start [ or ![
    // We search backwards from offset to find the nearest '['
    let searchStart = offset;
    while (searchStart >= 0) {
      const openBracket = content.lastIndexOf("[", searchStart);
      if (openBracket === -1) break;

      // Check for '!' before '['
      const isImage = openBracket > 0 && content[openBracket - 1] === "!";
      const syntaxStart = isImage ? openBracket - 1 : openBracket;

      // Find matching ']'
      const closeBracket = content.indexOf("]", openBracket);
      if (
        closeBracket === -1 ||
        (closeBracket + 1 < content.length &&
          closeBracket < offset &&
          content[closeBracket + 1] !== "(" &&
          content[closeBracket + 1] !== "[")
      ) {
        searchStart = openBracket - 1;
        continue;
      }

      // Check for '(' after ']' for inline link/image, or '[' for reference link
      let syntaxEnd = closeBracket + 1;
      if (content[closeBracket + 1] === "(") {
        const closeParen = content.indexOf(")", closeBracket + 1);
        if (closeParen !== -1) {
          syntaxEnd = closeParen + 1;
        }
      } else if (content[closeBracket + 1] === "[") {
        const closeRef = content.indexOf("]", closeBracket + 1);
        if (closeRef !== -1) {
          syntaxEnd = closeRef + 1;
        }
      }

      // If offset is inside this construct
      if (syntaxStart < offset && offset < syntaxEnd) {
        // Simple sanity check: markdown syntax usually doesn't span many lines
        const segment = content.substring(syntaxStart, syntaxEnd);
        if (segment.split("\n").length > 5) {
          searchStart = openBracket - 1;
          continue;
        }
        return { start: syntaxStart, end: syntaxEnd };
      }

      searchStart = openBracket - 1;
    }

    return null;
  }

  private getMarkdownHeaderRange(
    content: string,
    offset: number,
  ): { start: number; end: number } | null {
    // Find the start of the line containing offset
    const lineStart = content.lastIndexOf("\n", offset - 1) + 1;
    if (content[lineStart] === "#") {
      // Find the end of the header prefix (### )
      let i = lineStart;
      while (i < content.length && content[i] === "#") {
        i++;
      }
      // Usually followed by a space
      if (i < content.length && content[i] === " ") {
        i++;
      }
      if (offset >= lineStart && offset < i) {
        return { start: lineStart, end: i };
      }
    }
    return null;
  }
}
