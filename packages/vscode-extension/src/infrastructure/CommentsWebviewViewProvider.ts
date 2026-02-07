import * as vscode from "vscode";
import {
  CommentService,
  ViewBuilder,
  COMMENTS_VIEW_ID,
} from "@markdown-comment/core";
import {
  CommentThread as DomainThread,
  Comment as DomainComment,
  CommentStatus,
  getStatusIcon,
} from "@markdown-comment/core";

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
  private sortState: { column: string; direction: "asc" | "desc" } = {
    column: "",
    direction: "asc",
  };
  private selectedThreadId: string | undefined;
  private selectedCommentId: string | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly commentService: CommentService,
    private readonly onDidUpdate: (filePath?: string) => Promise<void>,
    private readonly viewBuilder: ViewBuilder, // Injected
  ) {}

  public get isVisible(): boolean {
    return this._view ? this._view.visible : false;
  }

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
          // Restore last file path if exists
          const savedPath = this.context.workspaceState.get<string>(
            "commentsTable.currentFilePath",
          );
          if (savedPath && !this.currentFilePath) {
            this.currentFilePath = savedPath;
          }

          if (this.currentFilePath) {
            // If we have a file, refresh immediately
            const content = await this.getCurrentFileContent();
            if (content !== undefined) {
              await this.refresh(this.currentFilePath, content);
            }
          } else {
            await this.updateHtml();
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
        case "editTags":
          await this.handleEditTags(
            data.threadId,
            data.commentId,
            data.currentTags,
            data.filePath,
          );
          break;
        case "reorderColumns":
          await this.handleReorderColumns(data.from, data.to);
          break;
        case "sort":
          await this.handleSort(data.column);
          break;
      }
    });

    // Initial HTML render
    this.updateHtml(); // Don't await here as resolveWebviewView is synchronous-ish (returns void)
  }

  private async getCurrentFileContent(): Promise<string | undefined> {
    if (!this.currentFilePath) {
      return undefined;
    }
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
      if (this.onDidUpdate) {
        await this.onDidUpdate(this.currentFilePath);
      }
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
      if (this.onDidUpdate) {
        await this.onDidUpdate(filePath);
      }
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
    );

    if (confirm === "Yes") {
      await this.commentService.deleteComment(filePath, threadId, commentId);
      if (this.onDidUpdate) {
        await this.onDidUpdate(filePath);
      }
    }
  }

  private async handleEditTags(
    threadId: string,
    commentId: string,
    currentTags: string[],
    filePath: string,
  ) {
    const availableTags = await this.commentService.getAvailableTags(filePath);
    const tagSet = new Set<string>([...availableTags, ...currentTags]);
    const existingTags = Array.from(tagSet).sort();

    const quickPick = vscode.window.createQuickPick();
    quickPick.canSelectMany = true;
    quickPick.title = "Edit Tags";
    quickPick.placeholder = "Select tags or type to create a new one";

    // Track state: selection source of truth
    let selectedTags = new Set<string>(currentTags);

    const updateItems = (filter: string = "") => {
      const items: vscode.QuickPickItem[] = [];

      // Add "Create" item if filter is non-empty and not an exact match
      if (filter && !tagSet.has(filter)) {
        items.push({
          label: `$(add) Create new tag: "${filter}"`,
          alwaysShow: true,
          description: "Create and assign this tag",
        });
      }

      // Add existing tags
      existingTags.forEach((tag) => {
        if (!filter || tag.toLowerCase().includes(filter.toLowerCase())) {
          items.push({
            label: tag,
          });
        }
      });

      quickPick.items = items;
      // Re-apply selection state to visible items
      quickPick.selectedItems = items.filter(
        (i) => selectedTags.has(i.label) || i.label.startsWith("$(add)"),
      );
    };

    quickPick.onDidChangeValue((value) => {
      updateItems(value);
    });

    quickPick.onDidChangeSelection((selection) => {
      const currentSelectionLabels = selection.map((i) => i.label);

      // Update our source of truth based on what's visible and its checked state
      quickPick.items.forEach((item) => {
        if (item.label.startsWith("$(add)")) {
          return;
        } // Creation handled on accept

        if (currentSelectionLabels.includes(item.label)) {
          selectedTags.add(item.label);
        } else {
          selectedTags.delete(item.label);
        }
      });
    });

    return new Promise<void>((resolve) => {
      quickPick.onDidAccept(async () => {
        const finalTags = new Set(selectedTags);

        // Handle creation if selected
        quickPick.selectedItems.forEach((item) => {
          if (item.label.startsWith('$(add) Create new tag: "')) {
            const match = item.label.match(/"(.+)"/);
            if (match && match[1]) {
              finalTags.add(match[1]);
            }
          }
        });

        quickPick.hide();

        // Save tags to comment
        await this.commentService.updateTags(
          filePath,
          threadId,
          commentId,
          Array.from(finalTags),
        );

        if (this.onDidUpdate) {
          await this.onDidUpdate(filePath);
        }

        // Refresh to show updated tags
        const content = await this.getCurrentFileContent();
        if (content) {
          await this.refresh(filePath, content);
        }
        resolve();
      });

      quickPick.onDidHide(() => {
        quickPick.dispose();
        resolve();
      });

      updateItems("");
      quickPick.show();
    });
  }

  private async handleReorderColumns(from: string, to: string) {
    const config = vscode.workspace.getConfiguration("markdownComment");
    const columns = config.get<string[]>("commentsTable.columns") || [];
    const fromIdx = columns.indexOf(from);
    const toIdx = columns.indexOf(to);
    if (fromIdx !== -1 && toIdx !== -1) {
      columns.splice(fromIdx, 1);
      columns.splice(toIdx, 0, from);
      await config.update(
        "commentsTable.columns",
        columns,
        vscode.ConfigurationTarget.Global,
      );
    }
  }

  public async refresh(filePath: string, content: string): Promise<void> {
    this.currentFilePath = filePath;
    // Persist current file path
    await this.context.workspaceState.update(
      "commentsTable.currentFilePath",
      filePath,
    );

    if (this._view) {
      this._view.webview.postMessage({ type: "setLoading", loading: true });
    }

    const threads = await this.commentService.getThreadsForFile(
      filePath,
      content,
    );

    // Sort threads
    if (this.sortState.column) {
      this.sortThreads(threads, content);
    } else {
      // Default: sort by offset
      threads.sort(
        (a, b) =>
          (a.anchor?.offset || 0) - (b.anchor?.offset || 0) ||
          a.id.localeCompare(b.id),
      );
    }

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
      const { rowsHtml, headerHtml } = await this.buildHtmlFragments();

      const fileName = filePath
        ? filePath.replace(/\\/g, "/").split("/").pop() || filePath
        : "";
      this._view.webview.postMessage({
        type: "updateData",
        rowsHtml,
        headerHtml,
        fileName,
        fullPath: filePath,
      });

      // Re-apply selection if it matches current file content
      if (this.selectedThreadId && this.selectedCommentId) {
        // Only select if the thread still exists in the filtered/sorted results
        const exists = this.comments.some(
          (c) =>
            c.thread.id === this.selectedThreadId &&
            c.comment.id === this.selectedCommentId,
        );
        if (exists) {
          this._view.webview.postMessage({
            type: "selectComment",
            threadId: this.selectedThreadId,
            commentId: this.selectedCommentId,
          });
        } else {
          // Reset if no longer exists
          this.selectedThreadId = undefined;
          this.selectedCommentId = undefined;
        }
      }
    } else {
      await this.updateHtml();
    }
  }

  public selectComment(threadId: string, commentId: string): void {
    this.selectedThreadId = threadId;
    this.selectedCommentId = commentId;
    if (this._view) {
      this._view.webview.postMessage({
        type: "selectComment",
        threadId,
        commentId,
      });
    }
  }

  public reveal(focus: boolean = false): void {
    if (this._view) {
      // show(preserveFocus): if focus is true, we want preserveFocus to be false
      this._view.show(!focus);
    }
  }

  public async clear(): Promise<void> {
    this.comments = [];
    this.currentFilePath = undefined;
    if (this._view) {
      this._view.webview.postMessage({
        type: "updateData",
        rowsHtml: "",
        headerHtml: "",
      });
    } else {
      await this.updateHtml();
    }
  }

  private async updateHtml() {
    if (!this._view) {
      return;
    }

    // Build the full HTML using ViewBuilder
    this._view.webview.html = await this.getHtml();
  }

  // --- HTML Building Helpers ---

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

  private async buildHtmlFragments(): Promise<{
    rowsHtml: string;
    headerHtml: string;
  }> {
    const columns = this.getColumnConfig();
    const columnWidths = this.getColumnWidthsConfig();

    const rows: string[] = [];
    for (const row of this.comments) {
      rows.push(await this.renderRow(row, columns));
    }
    const rowsHtml = rows.join("");

    const headerCells: string[] = [];
    for (const col of columns) {
      const width = columnWidths[col] || 100;
      headerCells.push(
        await this.viewBuilder.buildFragment("comments-table", "header_cell", {
          WIDTH: width.toString(),
          COL: col,
          LABEL: this.getColumnLabel(col),
          SORT_INDICATOR: this.getSortIndicator(col),
        }),
      );
    }
    const headerHtml = headerCells.join("");

    return { rowsHtml, headerHtml };
  }

  private async getHtml(): Promise<string> {
    const { rowsHtml, headerHtml } = await this.buildHtmlFragments();

    return await this.viewBuilder.build("comments-table/table", {
      HEADER_HTML: headerHtml,
      ROWS_HTML: rowsHtml,
      STYLES: "", // ViewBuilder handles compilation
      SCRIPT: "", // ViewBuilder handles script injection
    });
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

  private async renderRow(
    row: CommentRow,
    columns: ColumnKey[],
  ): Promise<string> {
    const cells: string[] = [];
    for (const col of columns) {
      const value = await this.getColumnValue(row, col);
      const className = `col-${col}`;
      cells.push(
        await this.viewBuilder.buildFragment("comments-table", "cell", {
          CLASS_NAME: className,
          TITLE: this.getRawValue(row, col).replace(/"/g, "&quot;"),
          VALUE: value,
        }),
      );
    }

    const escapedFilePath = row.filePath.replace(/\\/g, "\\\\");
    const rowClass = row.depth === 0 ? "root-row" : "reply-row";

    return await this.viewBuilder.buildFragment("comments-table", "row", {
      ROW_CLASS: rowClass,
      THREAD_ID: row.thread.id,
      COMMENT_ID: row.comment.id,
      FILE_PATH: escapedFilePath,
      CELLS: cells.join(""),
    });
  }

  private async getColumnValue(
    row: CommentRow,
    col: ColumnKey,
  ): Promise<string> {
    const c = row.comment;
    switch (col) {
      case "lineNo":
        return row.lineNo.toString();
      case "content":
        const indentStr =
          row.depth > 0
            ? await this.viewBuilder.buildFragment(
                "comments-table",
                "indent",
                {},
              )
            : "";
        const styleStr = row.depth > 0 ? "padding-left: 4px;" : "";
        return await this.viewBuilder.buildFragment(
          "comments-table",
          "content",
          {
            WRAPPER_CLASS: row.depth > 0 ? "is-reply" : "",
            INDENT: indentStr,
            CONTENT: c.content.replace(/[\r\n]+/g, " "),
          },
        );

      case "status":
        if (c.status) {
          // Status Dropdown
          const optionHtmls: string[] = [];
          for (const s of Object.values(CommentStatus)) {
            optionHtmls.push(
              await this.viewBuilder.buildFragment(
                "comments-table",
                "status_option",
                {
                  VALUE: s,
                  SELECTED: c.status === s ? "selected" : "",
                  ICON: getStatusIcon(s),
                  LABEL: s.toUpperCase(),
                },
              ),
            );
          }
          return await this.viewBuilder.buildFragment(
            "comments-table",
            "status_select",
            {
              STATUS: c.status,
              THREAD_ID: row.thread.id,
              COMMENT_ID: c.id,
              OPTIONS: optionHtmls.join(""),
            },
          );
        }
        return await this.viewBuilder.buildFragment(
          "comments-table",
          "empty_cell",
          {},
        );
      case "author":
        return c.author;
      case "tags":
        const tagHtmls: string[] = [];
        for (const t of c.tags) {
          tagHtmls.push(
            await this.viewBuilder.buildFragment("comments-table", "tag", {
              TAG: t,
            }),
          );
        }
        return tagHtmls.join("");
      case "createdAt":
        return this.formatDate(c.createdAt);
      case "updatedAt":
        return this.formatDate(c.updatedAt);
      case "actions":
        const escapedContent = c.content.replace(/"/g, "&quot;");
        const escapedFilePath = row.filePath.replace(/\\/g, "\\\\");
        const tagsJson = encodeURIComponent(JSON.stringify(c.tags));

        const editTags = await this.viewBuilder.buildFragment(
          "comments-table",
          "action_edit_tags",
          {
            THREAD_ID: row.thread.id,
            COMMENT_ID: c.id,
            TAGS_JSON: tagsJson,
            FILE_PATH: escapedFilePath,
          },
        );

        const editComment = await this.viewBuilder.buildFragment(
          "comments-table",
          "action_edit",
          {
            THREAD_ID: row.thread.id,
            COMMENT_ID: c.id,
            CONTENT: escapedContent,
            FILE_PATH: escapedFilePath,
          },
        );

        const deleteComment = await this.viewBuilder.buildFragment(
          "comments-table",
          "action_delete",
          {
            THREAD_ID: row.thread.id,
            COMMENT_ID: c.id,
            FILE_PATH: escapedFilePath,
          },
        );

        return `${editTags}\n${editComment}\n${deleteComment}`;
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
        return c.createdAt.toISOString();
      case "updatedAt":
        return c.updatedAt.toISOString();
      default:
        return "";
    }
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}/${m}/${d}`;
  }

  private async handleSort(column: string) {
    if (this.sortState.column === column) {
      this.sortState.direction =
        this.sortState.direction === "asc" ? "desc" : "asc";
    } else {
      this.sortState.column = column;
      this.sortState.direction = "asc";
    }
    // Refresh with current state
    if (this.currentFilePath) {
      const content = await this.getCurrentFileContent();
      if (content) {
        await this.refresh(this.currentFilePath, content);
      }
    }
  }

  private sortThreads(threads: DomainThread[], content: string) {
    const col = this.sortState.column;
    const dir = this.sortState.direction === "asc" ? 1 : -1;

    threads.sort((a, b) => {
      // Extract values for the first comment in thread for sorting
      const comA = a.comments[0];
      const comB = b.comments[0];
      if (!comA || !comB) {
        return 0;
      }

      let valA: any = "";
      let valB: any = "";

      switch (col) {
        case "status":
          valA = comA.status || "";
          valB = comB.status || "";
          break;
        case "author":
          valA = comA.author || "";
          valB = comB.author || "";
          break;
        case "content":
          valA = comA.content || "";
          valB = comB.content || "";
          break;
        case "createdAt":
          valA = comA.createdAt.getTime();
          valB = comB.createdAt.getTime();
          break;
        case "updatedAt":
          valA = comA.updatedAt.getTime();
          valB = comB.updatedAt.getTime();
          break;
        case "lineNo":
          // Rough line number calc
          valA = content.substring(0, a.anchor?.offset || 0).split("\n").length;
          valB = content.substring(0, b.anchor?.offset || 0).split("\n").length;
          break;
        default:
          return 0;
      }

      if (valA < valB) {
        return -1 * dir;
      }
      if (valA > valB) {
        return 1 * dir;
      }
      return 0;
    });
  }

  private getSortIndicator(col: string): string {
    if (this.sortState.column !== col) {
      return "";
    }
    return this.sortState.direction === "asc" ? "▲" : "▼";
  }
}
