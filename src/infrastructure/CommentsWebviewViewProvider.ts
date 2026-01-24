import * as vscode from "vscode";
import { CommentService } from "../application/CommentService";
import {
  CommentThread as DomainThread,
  Comment as DomainComment,
  CommentStatus,
  getStatusIcon,
} from "../domain/Comment";
import { COMMENTS_VIEW_ID } from "../domain/Constants";

type ColumnKey =
  | "lineNo"
  | "content"
  | "status"
  | "author"
  | "tags"
  | "createdAt"
  | "updatedAt"
  | "actions";

interface CommentRow {
  thread: DomainThread;
  comment: DomainComment;
  filePath: string;
  lineNo: number;
  depth: number;
}

export class CommentsWebviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = COMMENTS_VIEW_ID;
  private _view?: vscode.WebviewView;
  private comments: CommentRow[] = [];
  private currentFilePath: string | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly commentService: CommentService,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "ready":
          if (this.currentFilePath) {
            // If we have a file, refresh immediately
            const content = await this.getCurrentFileContent();
            if (content !== undefined) {
              await this.refresh(this.currentFilePath, content);
            }
          } else {
            this.updateHtml();
          }
          break;
        case "reveal":
          await vscode.commands.executeCommand(
            "markdown-comment.revealCommentFromTable",
            data.threadId,
            data.filePath,
          );
          break;
        case "resize":
          await this.saveColumnWidth(data.column, data.width);
          break;
        case "updateStatus":
          await this.handleUpdateStatus(
            data.threadId,
            data.commentId,
            data.status,
          );
          break;
        case "edit":
          await this.handleEdit(
            data.threadId,
            data.commentId,
            data.currentContent,
            data.filePath,
          );
          break;
        case "delete":
          await this.handleDelete(data.threadId, data.commentId, data.filePath);
          break;
      }
    });

    this.updateHtml();
  }

  private async getCurrentFileContent(): Promise<string | undefined> {
    if (!this.currentFilePath) return undefined;
    const uri = vscode.Uri.file(this.currentFilePath);
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      return doc.getText();
    } catch (e) {
      return undefined;
    }
  }

  private async handleUpdateStatus(
    threadId: string,
    commentId: string,
    status: string,
  ) {
    if (this.currentFilePath) {
      await this.commentService.updateStatus(
        this.currentFilePath,
        threadId,
        commentId,
        status as CommentStatus,
      );
      // Refresh will be triggered by handleCommentChange in extension.ts
    }
  }

  private async handleEdit(
    threadId: string,
    commentId: string,
    currentContent: string,
    filePath: string,
  ) {
    const newContent = await vscode.window.showInputBox({
      prompt: "Edit Comment",
      value: currentContent,
    });

    if (newContent !== undefined && newContent !== currentContent) {
      await this.commentService.updateComment(
        filePath,
        threadId,
        commentId,
        newContent,
      );
    }
  }

  private async handleDelete(
    threadId: string,
    commentId: string,
    filePath: string,
  ) {
    const confirm = await vscode.window.showWarningMessage(
      "Are you sure you want to delete this comment?",
      "Yes",
      "No",
      "No",
    );

    if (confirm === "Yes") {
      await this.commentService.deleteComment(filePath, threadId, commentId);
    }
  }

  public async refresh(filePath: string, content: string): Promise<void> {
    this.currentFilePath = filePath;

    if (this._view) {
      this._view.webview.postMessage({ type: "setLoading", loading: true });
    }

    const threads = await this.commentService.getThreadsForFile(
      filePath,
      content,
    );

    // Sort threads by offset and ID for stable display
    threads.sort(
      (a, b) =>
        (a.anchor?.offset || 0) - (b.anchor?.offset || 0) ||
        a.id.localeCompare(b.id),
    );

    this.comments = [];
    for (const thread of threads) {
      // Calculate line number for the thread
      const lineNo = content
        .substring(0, thread.anchor.offset)
        .split("\n").length;

      thread.comments.forEach((comment, index) => {
        this.comments.push({
          thread,
          comment,
          filePath,
          lineNo,
          depth: index > 0 ? 1 : 0,
        });
      });
    }

    if (this._view) {
      const columns = this.getColumnConfig();
      const columnWidths = this.getColumnWidthsConfig();
      const rowsHtml = this.comments
        .map((row) => this.renderRow(row, columns))
        .join("");
      const headerHtml = columns
        .map((col) => {
          const width = columnWidths[col] || 100;
          return `<th style="width: ${width}px;" data-col="${col}">
          <div class="header-content">${this.getColumnLabel(col)}</div>
          <div class="resizer" onmousedown="startResizing(event, '${col}')"></div>
        </th>`;
        })
        .join("");

      this._view.webview.postMessage({
        type: "updateData",
        rowsHtml,
        headerHtml,
      });
    } else {
      this.updateHtml();
    }
  }

  public clear(): void {
    this.comments = [];
    this.currentFilePath = undefined;
    if (this._view) {
      this._view.webview.postMessage({
        type: "updateData",
        rowsHtml: "",
        headerHtml: "",
      });
    } else {
      this.updateHtml();
    }
  }

  private updateHtml() {
    if (!this._view) {
      return;
    }

    const columns = this.getColumnConfig();
    const columnWidths = this.getColumnWidthsConfig();
    this._view.webview.html = this.getHtml(columns, columnWidths);
  }

  private getColumnWidthsConfig(): Record<string, number> {
    const config = vscode.workspace.getConfiguration("markdownComment");
    return (
      config.get<Record<string, number>>("commentsTable.columnWidths") || {}
    );
  }

  private async saveColumnWidth(column: string, width: number) {
    const config = vscode.workspace.getConfiguration("markdownComment");
    const currentWidths = { ...this.getColumnWidthsConfig() };
    currentWidths[column] = width;
    await config.update(
      "commentsTable.columnWidths",
      currentWidths,
      vscode.ConfigurationTarget.Global,
    );
  }

  private getColumnConfig(): ColumnKey[] {
    const config = vscode.workspace.getConfiguration("markdownComment");
    const columns = config.get<string[]>("commentsTable.columns");
    if (columns && Array.isArray(columns)) {
      return columns.filter((c) => this.isValidColumn(c)) as ColumnKey[];
    }
    return [
      "lineNo",
      "content",
      "status",
      "author",
      "tags",
      "createdAt",
      "updatedAt",
    ];
  }

  private isValidColumn(col: string): col is ColumnKey {
    return [
      "lineNo",
      "content",
      "status",
      "author",
      "tags",
      "createdAt",
      "updatedAt",
      "actions",
    ].includes(col);
  }

  private getHtml(
    columns: ColumnKey[],
    columnWidths: Record<string, number>,
  ): string {
    const rowsHtml = this.comments
      .map((row) => this.renderRow(row, columns))
      .join("");
    const headerHtml = columns
      .map((col) => {
        const width = columnWidths[col] || 100;
        return `<th style="width: ${width}px;" data-col="${col}">
          <div class="header-content">${this.getColumnLabel(col)}</div>
          <div class="resizer" onmousedown="startResizing(event, '${col}')"></div>
        </th>`;
      })
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 0; margin: 0; overflow-x: auto; position: relative; min-height: 100vh; }
        table { width: max-content; min-width: 100%; border-collapse: collapse; table-layout: fixed; }
        th { text-align: left; position: sticky; top: 0; background: var(--vscode-panel-background); z-index: 10; border-bottom: 1px solid var(--vscode-divider); padding: 8px 4px; font-size: 0.8em; text-transform: uppercase; position: relative; }
        td { padding: 4px; border-bottom: 1px solid var(--vscode-divider); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.9em; vertical-align: middle; }
        tr.root-row { border-top: 1px solid var(--vscode-divider); }
        tr.root-row:first-child { border-top: none; }
        tr.root-row td { font-weight: 500; }
        tr:hover { background-color: var(--vscode-list-hoverBackground); }
        .resizer { position: absolute; right: 0; top: 0; width: 4px; height: 100%; cursor: col-resize; z-index: 11; }
        .resizer:hover { background: var(--vscode-focusBorder); }
        .header-content { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tag { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 1px 4px; border-radius: 3px; font-size: 0.8em; margin-right: 2px; }
        .status-select { background: transparent; color: inherit; border: 1px solid transparent; border-radius: 2px; cursor: pointer; font-size: inherit; }
        .status-select:hover { border-color: var(--vscode-focusBorder); }
        .action-btn { background: none; border: none; cursor: pointer; opacity: 0.7; padding: 2px; font-size: 1.1em; }
        .action-btn:hover { opacity: 1; background-color: var(--vscode-toolbar-hoverBackground); border-radius: 3px; }

        /* Loading Overlay */
        #loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--vscode-panel-background);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        body.is-loading #loading-overlay {
            opacity: 0.6;
            pointer-events: auto;
        }
        .spinner {
            width: 24px;
            height: 24px;
            border: 2px solid var(--vscode-progressBar-background);
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Row Spacing */
        tr.root-row td { padding-top: 12px; }
        tr:not(.root-row) td { padding-top: 2px; }

        /* Status Colors */
        .status-open { color: var(--vscode-charts-blue); }
        .status-resolved { color: var(--vscode-charts-green); }
        .status-closed { color: var(--vscode-charts-gray); }
    </style>
</head>
<body>
    <div id="loading-overlay">
        <div class="spinner"></div>
    </div>
    <table id="comment-table">
        <thead>
            <tr>${headerHtml}</tr>
        </thead>
        <tbody id="comment-body">
            ${rowsHtml}
        </tbody>
    </table>
    <script>
        const vscode = acquireVsCodeApi();

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'setLoading':
                    if (message.loading) {
                        document.body.classList.add('is-loading');
                    } else {
                        document.body.classList.remove('is-loading');
                    }
                    break;
                case 'updateData':
                    document.getElementById('comment-body').innerHTML = message.rowsHtml;
                    document.querySelector('thead tr').innerHTML = message.headerHtml;
                    document.body.classList.remove('is-loading');
                    break;
            }
        });

        // Notify extension that we are ready
        vscode.postMessage({ type: 'ready' });

        // Use event delegation for better performance and dynamic content
        document.getElementById('comment-table').addEventListener('click', (e) => {
            const target = e.target;
            const tr = target.closest('tr');

            // Handle Row Click (Reveal) - ignore if clicking interactive elements
            if (tr && !target.closest('select') && !target.closest('button')) {
                const threadId = tr.dataset.threadId;
                const filePath = tr.dataset.filePath;
                if (threadId && filePath) {
                    vscode.postMessage({ type: 'reveal', threadId, filePath });
                }
            }
        });

        function updateStatus(select, threadId, commentId) {
            vscode.postMessage({
                type: 'updateStatus',
                threadId: threadId,
                commentId: commentId,
                status: select.value
            });
            // Update color class immediately for better UI feedback
            select.className = 'status-select status-' + select.value;
        }

        function editComment(threadId, commentId, currentContent, filePath) {
            vscode.postMessage({
                type: 'edit',
                threadId: threadId,
                commentId: commentId,
                currentContent: currentContent,
                filePath: filePath
            });
        }

        function deleteComment(threadId, commentId, filePath) {
            vscode.postMessage({
                type: 'delete',
                threadId: threadId,
                commentId: commentId,
                filePath: filePath
            });
        }

        let isResizing = false;
        let currentColumn = null;
        let startX = 0;
        let startWidth = 0;

        function startResizing(e, col) {
            isResizing = true;
            currentColumn = col;
            startX = e.pageX;
            const th = e.target.parentElement;
            startWidth = th.offsetWidth;

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', stopResizing);
            e.preventDefault();
        }

        function handleMouseMove(e) {
            if (!isResizing) return;
            const diff = e.pageX - startX;
            const newWidth = Math.max(20, startWidth + diff);
            const th = document.querySelector('th[data-col="' + currentColumn + '"]');
            if (th) {
                th.style.width = newWidth + 'px';
            }
        }

        function stopResizing() {
            if (isResizing) {
                const th = document.querySelector('th[data-col="' + currentColumn + '"]');
                if (th) {
                    vscode.postMessage({
                        type: 'resize',
                        column: currentColumn,
                        width: th.offsetWidth
                    });
                }
            }
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResizing);
        }
    </script>
</body>
</html>`;
  }

  private getColumnLabel(col: ColumnKey): string {
    switch (col) {
      case "lineNo":
        return "L#";
      case "content":
        return "Comment";
      case "status":
        return "Status";
      case "author":
        return "Author";
      case "tags":
        return "Tags";
      case "createdAt":
        return "Created";
      case "updatedAt":
        return "Updated";
      case "actions":
        return "Actions";
      default:
        return "";
    }
  }

  private renderRow(row: CommentRow, columns: ColumnKey[]): string {
    const cells = columns.map((col) => {
      const value = this.getColumnValue(row, col);
      const className = `col-${col}`;
      return `<td class="${className}" title="${this.getRawValue(row, col).replace(/"/g, "&quot;")}">${value}</td>`;
    });

    const escapedFilePath = row.filePath.replace(/\\/g, "\\\\");
    const rowClass = row.depth === 0 ? "root-row" : "reply-row";
    return `<tr class="${rowClass}" data-thread-id="${row.thread.id}" data-file-path="${escapedFilePath}">${cells.join("")}</tr>`;
  }

  private getColumnValue(row: CommentRow, col: ColumnKey): string {
    const c = row.comment;
    switch (col) {
      case "lineNo":
        return row.lineNo.toString();
      case "content":
        const indent =
          row.depth > 0
            ? `<span style="opacity:0.6; margin-right:4px;">↳</span>`
            : "";
        const style = row.depth > 0 ? `style="padding-left: 20px;"` : "";
        return `<div ${style}>${indent}${c.content.replace(/[\r\n]+/g, " ")}</div>`;
      case "status":
        if (c.status) {
          // Status Dropdown
          const options = Object.values(CommentStatus)
            .map(
              (s) =>
                `<option value="${s}" ${c.status === s ? "selected" : ""}>${getStatusIcon(s)} ${s.toUpperCase()}</option>`,
            )
            .join("");
          return `<select class="status-select status-${c.status}" onchange="updateStatus(this, '${row.thread.id}', '${c.id}')">${options}</select>`;
        }
        return `<span style="opacity:0.5">-</span>`;
      case "author":
        return c.author;
      case "tags":
        return c.tags.map((t) => `<span class="tag">${t}</span>`).join("");
      case "createdAt":
        return this.formatDate(c.createdAt);
      case "updatedAt":
        return this.formatDate(c.updatedAt);
      case "actions":
        const escapedContent = c.content.replace(/"/g, "&quot;");
        const escapedFilePath = row.filePath.replace(/\\/g, "\\\\");
        return `
            <button class="action-btn" title="Edit" onclick="editComment('${row.thread.id}', '${c.id}', '${escapedContent}', '${escapedFilePath}')">✏️</button>
            <button class="action-btn" title="Delete" onclick="deleteComment('${row.thread.id}', '${c.id}', '${escapedFilePath}')">🗑️</button>
          `;
      default:
        return "";
    }
  }

  private getRawValue(row: CommentRow, col: ColumnKey): string {
    const c = row.comment;
    switch (col) {
      case "content":
        return c.content;
      case "author":
        return c.author;
      case "tags":
        return c.tags.join(", ");
      case "createdAt":
        return this.formatDate(c.createdAt);
      case "updatedAt":
        return this.formatDate(c.updatedAt);
      default:
        return "";
    }
  }

  private formatDate(date: Date): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return "";
    }
    const pad = (n: number) => n.toString().padStart(2, "0");
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }
}
