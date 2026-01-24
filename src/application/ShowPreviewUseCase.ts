import { IDocumentRepository } from "../domain/IDocumentRepository";
import { IPreviewPresenter } from "./IPreviewPresenter";
import * as MarkdownIt from "markdown-it";
import { CommentService } from "./CommentService";
import { STATUS_ICONS } from "../domain/Comment";

export class ShowPreviewUseCase {
  private readonly md: MarkdownIt;

  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly previewPresenter: IPreviewPresenter,
    private readonly commentService: CommentService,
  ) {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });
  }

  public async execute(
    column: "active" | "beside" = "beside",
    filePath?: string,
  ): Promise<void> {
    let document = null;
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
      index: number;
    }[] = [];

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];

      points.push({
        offset: thread.anchor.offset,
        type: "start",
        threadId: thread.id,
        index: i,
      });
      points.push({
        offset: thread.anchor.offset + thread.anchor.length,
        type: "end",
        threadId: thread.id,
        index: i,
      });
    }

    // Add a dummy end point to ensure the last segment is processed
    if (!points.some((p) => p.offset === document.content.length)) {
      points.push({
        offset: document.content.length,
        type: "end",
        threadId: "dummy",
        index: -1,
      });
    }
    points.sort((a, b) => {
      if (a.offset !== b.offset) {
        return a.offset - b.offset;
      }
      if (a.type !== b.type) {
        return a.type === "end" ? -1 : 1;
      }
      return a.index - b.index;
    });

    let htmlContentWithPlaceholders = "";
    let lastOffset = 0;
    const activeThreadIndices = new Set<number>();
    const iconDisplayed = new Set<number>();

    for (const point of points) {
      if (point.offset > lastOffset) {
        let segment = document.content.substring(lastOffset, point.offset);
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
      }

      if (point.type === "start") {
        if (point.index !== -1) activeThreadIndices.add(point.index);
      } else {
        if (point.index !== -1) activeThreadIndices.delete(point.index);
      }
      lastOffset = point.offset;
    }

    const htmlContent = this.md.render(htmlContentWithPlaceholders);
    let finalHtml = htmlContent;

    // Replace placeholders with actual HTML tags
    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      const pS = `MCSTART${i}MC`;
      const pF = `MCFIRST${i}MC`;
      const pE = `MCEND${i}MC`;

      const escapedComment = (thread.comments[0]?.content || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

      const tagStart = `<mark class="comment-highlight" data-thread-id="${thread.id}" title="${escapedComment}">`;
      const tagStartFirst = `<mark class="comment-highlight is-first" data-thread-id="${thread.id}" title="${escapedComment}">`;
      const tagEnd = `</mark>`;

      finalHtml = finalHtml.split(pF).join(tagStartFirst);
      finalHtml = finalHtml.split(pS).join(tagStart);
      finalHtml = finalHtml.split(pE).join(tagEnd);
    }
    const title = `Preview ${document.filePath.split(/[\\/]/).pop()}`;

    // Sort threads for sidebar display
    const sidebarThreads = [...threads].sort(
      (a, b) =>
        (a.anchor?.offset || 0) - (b.anchor?.offset || 0) ||
        a.id.localeCompare(b.id),
    );

    const threadsJson = JSON.stringify(
      sidebarThreads.map((t) => ({
        id: t.id,
        anchor: t.anchor,
        comments: t.comments.map((c) => ({
          id: c.id,
          content: c.content,
          author: c.author,
          createdAt: c.createdAt,
          status: c.status,
        })),
      })),
    );

    const statusIconsJson = JSON.stringify(STATUS_ICONS);

    const isSidebarVisible = this.previewPresenter.isSidebarVisible(
      document.filePath,
    );

    // プレビュー用にボイラープレートHTMLで包む
    const fullHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        height: 100vh;
                        display: flex;
                        overflow: hidden;
                        color: var(--vscode-editor-foreground);
                        background-color: var(--vscode-editor-background);
                    }
                    #main-content {
                        flex: 1;
                        padding: 20px;
                        overflow-y: auto;
                        line-height: 1.6;
                    }
                    #sidebar {
                        width: 300px;
                        background-color: var(--vscode-sideBar-background);
                        border-left: 1px solid var(--vscode-sideBarSectionHeader-border);
                        overflow-y: auto;
                        display: none;
                        flex-direction: column;
                    }
                    #sidebar.visible {
                        display: flex;
                    }
                    .sidebar-header {
                        padding: 10px;
                        font-weight: bold;
                        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
                        background-color: var(--vscode-sideBarSectionHeader-background);
                        color: var(--vscode-sideBarSectionHeader-foreground);
                    }
                    .comment-thread-item {
                        padding: 10px;
                        border-bottom: 1px solid var(--vscode-list-invalidItemForeground);
                        cursor: pointer;
                    }
                    .comment-thread-item:hover {
                        background-color: var(--vscode-list-hoverBackground);
                    }
                    .comment-meta {
                        font-size: 0.8em;
                        color: var(--vscode-descriptionForeground);
                        margin-bottom: 4px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .comment-body {
                        font-size: 0.9em;
                        white-space: pre-wrap;
                    }
                    .status-badge, .status-select {
                        padding: 1px 4px;
                        border-radius: 3px;
                        font-size: 0.75em;
                        text-transform: uppercase;
                    }
                    .status-select {
                        background: transparent;
                        color: inherit;
                        border: 1px solid transparent;
                        cursor: pointer;
                    }
                    .status-select:hover {
                        border-color: var(--vscode-focusBorder);
                    }
                    .status-open { background-color: var(--vscode-charts-blue); color: white; }
                    .status-resolved { background-color: var(--vscode-charts-green); color: white; }
                    .status-closed { background-color: var(--vscode-charts-gray); color: white; }

                    img {
                        max-width: 100%;
                    }
                    .comment-highlight {
                        background-color: var(--vscode-editor-selectionHighlightBackground, rgba(255, 255, 0, 0.2));
                        border-bottom: 1px solid var(--vscode-editor-selectionHighlightBorder, orange);
                        cursor: pointer;
                        border-radius: 2px;
                        position: relative;
                        transition: background-color 0.2s;
                    }
                    /* Ensure nested highlights are visible */
                    .comment-highlight .comment-highlight {
                        border-bottom-width: 2px;
                    }
                    .comment-highlight.is-first::before {
                        content: '💬';
                        font-size: 0.8em;
                        vertical-align: super;
                        margin-right: 0.5px;
                        opacity: 0.9;
                        display: inline-block;
                        /* Prevent selection issues */
                        user-select: none;
                    }
                    /* If multiple are first in same segment, space them */
                    .comment-highlight.is-first > .comment-highlight.is-first::before {
                        margin-left: 4px;
                    }
                    .comment-highlight:hover {
                        background-color: var(--vscode-editor-hoverHighlightBackground, rgba(255, 255, 0, 0.4));
                        z-index: 10;
                    }

                    #toggle-btn {
                        position: fixed;
                        top: 10px;
                        right: 20px;
                        z-index: 1000;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 6px 10px;
                        border-radius: 4px;
                        cursor: pointer;
                        opacity: 0.8;
                    }
                    #toggle-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                        opacity: 1;
                    }
                    /* Adjust toggle button position when sidebar is visible */
                    body.sidebar-open #toggle-btn {
                        right: 320px; /* 300px sidebar + 20px */
                    }
                </style>
                <title>${title}</title>
            </head>
            <body class="${isSidebarVisible ? "sidebar-open" : ""}">
                <button id="toggle-btn">${isSidebarVisible ? "Hide Comments" : "💬 Comments"}</button>
                <div id="main-content">
                    ${finalHtml}
                </div>
                <div id="sidebar" class="${isSidebarVisible ? "visible" : ""}">
                    <div class="sidebar-header">Comments</div>
                    <div id="comments-list"></div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const threads = ${threadsJson};
                    const statusIcons = ${statusIconsJson};

                    // Toggle Logic
                    const toggleBtn = document.getElementById('toggle-btn');
                    const sidebar = document.getElementById('sidebar');
                    const body = document.body;

                    toggleBtn.addEventListener('click', () => {
                        const isVisible = sidebar.classList.toggle('visible');
                        body.classList.toggle('sidebar-open');
                        toggleBtn.textContent = isVisible ? 'Hide Comments' : '💬 Comments';

                        // Inform VS Code side to persist state
                        vscode.postMessage({
                            type: 'toggleSidebar',
                            visible: isVisible
                        });
                    });

                    // Render Comments in Sidebar
                    const listContainer = document.getElementById('comments-list');

                    const getStatusIcon = (status) => {
                        return statusIcons[status] || '';
                    };

                    threads.forEach(thread => {
                        const div = document.createElement('div');
                        div.className = 'comment-thread-item';
                        div.dataset.threadId = thread.id;

                        const firstComment = thread.comments[0];
                        if (!firstComment) return;

                        // Only root comments have status
                        const statusOptions = ['open', 'resolved', 'closed'];
                        const optionsHtml = statusOptions.map(s =>
                            \`<option value="\${s}" \${firstComment.status === s ? 'selected' : ''}>\${getStatusIcon(s)} \${s.toUpperCase()}</option>\`
                        ).join('');

                        const statusSelectHtml = \`
                            <select class="status-select status-\${firstComment.status}"
                                    onchange="updateStatus(this, '\${thread.id}', '\${firstComment.id}')">
                                \${optionsHtml}
                            </select>
                        \`;

                        div.innerHTML = \`
                            <div class="comment-meta">
                                <span>\${firstComment.author}</span>
                                \${statusSelectHtml}
                            </div>
                            <div class="comment-body">\${firstComment.content}</div>
                        \`;

                        div.addEventListener('click', (e) => {
                            // Don't scroll if clicking select
                            if (e.target.tagName === 'SELECT') return;

                            // Scroll to highlight
                            const mark = document.querySelector(\`.comment-highlight[data-thread-id="\${thread.id}"]\`);
                            if (mark) {
                                mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                mark.style.outline = '2px solid red'; // Temporary highlight
                                setTimeout(() => mark.style.outline = '', 2000);
                            }
                            // Also reveal in VS Code side
                            vscode.postMessage({
                                type: 'revealComment',
                                threadId: thread.id
                            });
                        });

                        listContainer.appendChild(div);
                    });

                    window.updateStatus = (select, threadId, commentId) => {
                        vscode.postMessage({
                            type: 'updateStatus',
                            threadId: threadId,
                            commentId: commentId,
                            status: select.value
                        });
                        // Update color immediately
                        select.className = 'status-select status-' + select.value;
                    };

                    document.addEventListener('selectionchange', () => {
                        const selection = window.getSelection();
                        const selectedText = selection ? selection.toString() : '';
                        vscode.postMessage({
                            type: 'selection',
                            text: selectedText
                        });
                    });

                    document.addEventListener('click', (e) => {
                        const target = e.target;
                        if (target && target.classList.contains('comment-highlight')) {
                            const threadId = target.getAttribute('data-thread-id');
                            if (threadId) {
                                // Highlight in sidebar if visible
                                if (sidebar.classList.contains('visible')) {
                                    const item = document.querySelector(\`.comment-thread-item[data-thread-id="\${threadId}"]\`);
                                    if (item) {
                                        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        item.style.backgroundColor = 'var(--vscode-list-activeSelectionBackground)';
                                        setTimeout(() => item.style.backgroundColor = '', 2000);
                                    }
                                }

                                vscode.postMessage({
                                    type: 'revealComment',
                                    threadId: threadId
                                });
                            }
                        }
                    });
                </script>
            </body>
            </html>
        `;

    await this.previewPresenter.show(
      fullHtml,
      title,
      document.filePath,
      column,
    );
  }
}
