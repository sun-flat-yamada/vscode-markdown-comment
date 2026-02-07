import * as vscode from "vscode";
import * as path from "path";
import { CommentService } from "@markdown-comment/core";
import {
  CommentThread as DomainThread,
  Comment as DomainComment,
  getStatusIcon,
  COMMENT_CONTROLLER_ID,
} from "@markdown-comment/core";

export class VSCodeCommentController {
  private controller: vscode.CommentController;
  private threads: Map<string, vscode.CommentThread> = new Map();
  private lastRefreshedUri: string | undefined;
  private onDidUpdate?: () => void;

  /**
   * For focus management and direct interaction tracking.
   */
  private lastFocusedThreadId?: string;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly commentService: CommentService,
    onDidUpdate?: () => void,
  ) {
    this.onDidUpdate = onDidUpdate;
    this.controller = vscode.comments.createCommentController(
      COMMENT_CONTROLLER_ID,
      "Markdown Comment",
    );
    this.context.subscriptions.push(this.controller);

    this.controller.commentingRangeProvider = {
      provideCommentingRanges: (document: vscode.TextDocument) => {
        const lineCount = document.lineCount;
        return [new vscode.Range(0, 0, lineCount - 1, Number.MAX_SAFE_INTEGER)];
      },
    };

    this.registerCommands();
  }

  /**
   * Refreshes all visible editors that match the given URI.
   */
  private async refreshVisibleEditors(uri: vscode.Uri): Promise<void> {
    const editors = vscode.window.visibleTextEditors.filter(
      (e) => e.document.uri.toString() === uri.toString(),
    );
    for (const editor of editors) {
      await this.refreshForEditor(editor, true);
    }
  }

  /**
   * Common update trigger after data modification.
   */
  private async notifyAndRefresh(uri: vscode.Uri): Promise<void> {
    if (this.onDidUpdate) {
      this.onDidUpdate();
    }
    await this.refreshVisibleEditors(uri);
  }

  public async refreshForEditor(
    editor: vscode.TextEditor,
    force: boolean = false,
  ): Promise<void> {
    const docUri = editor.document.uri;
    const normalizedPath = docUri.fsPath.toLowerCase();

    if (!force && this.lastRefreshedUri === normalizedPath) {
      return;
    }
    this.lastRefreshedUri = normalizedPath;

    const filePath = docUri.fsPath;
    const content = editor.document.getText();
    const domainThreads = await this.commentService.getThreadsForFile(
      filePath,
      content,
    );

    const domainThreadIds = new Set(domainThreads.map((t) => t.id));

    // 削除されたスレッドの破棄
    for (const [id, thread] of this.threads.entries()) {
      if (
        thread.uri.toString() === docUri.toString() &&
        !domainThreadIds.has(id)
      ) {
        thread.dispose();
        this.threads.delete(id);
      }
    }

    // スレッドの更新または作成
    for (const domainThread of domainThreads) {
      const existingVSCodeThread = this.threads.get(domainThread.id);
      if (existingVSCodeThread) {
        this.updateVSCodeThread(
          editor.document,
          existingVSCodeThread,
          domainThread,
        );
      } else {
        this.createVSCodeThread(editor.document, domainThread);
      }
    }
  }

  private updateVSCodeThread(
    document: vscode.TextDocument,
    vscodeThread: vscode.CommentThread,
    domainThread: DomainThread,
  ): void {
    const startPos = document.positionAt(domainThread.anchor.offset);
    const endPos = document.positionAt(
      domainThread.anchor.offset + domainThread.anchor.length,
    );
    const range = new vscode.Range(startPos, endPos);

    if (vscodeThread.range && !vscodeThread.range.isEqual(range)) {
      vscodeThread.range = range;
    }

    const rootComment = domainThread.comments[0];
    if (rootComment && rootComment.status) {
      const icon = getStatusIcon(rootComment.status);
      vscodeThread.label = `Status: ${icon} ${rootComment.status.toUpperCase()}`;
    } else {
      vscodeThread.label = undefined;
    }

    vscodeThread.comments = domainThread.comments.map((c, index) =>
      this.toVSCodeComment(c, vscodeThread, index === 0),
    );

    vscodeThread.comments = domainThread.comments.map((c, index) =>
      this.toVSCodeComment(c, vscodeThread, index === 0),
    );

    // Standard VSCode Comment API command for the thread
    // Note: cast to any or a more inclusive type if the local version of @types/vscode is older
    (vscodeThread as any).command = {
      title: "Reveal Comment",
      command: "markdown-comment.revealCommentFromTable",
      arguments: [domainThread.id, document.uri.fsPath],
    };
  }

  /**
   * [Fix Issue 2] Reveals a comment thread, reusing existing editor tabs if possible.
   */
  public async revealThread(
    threadId: string,
    filePathHint?: string,
    focusNativePanel: boolean = false,
  ): Promise<void> {
    let vscodeThread = this.threads.get(threadId);

    // If thread not found but we have a file path, open it first to trigger refresh
    if (!vscodeThread && filePathHint) {
      const uri = vscode.Uri.file(filePathHint);
      await this.showDocumentSafely(uri);
      // After opening, it should be in our threads map (due to editor change/refresh)
      vscodeThread = this.threads.get(threadId);
    }

    if (vscodeThread) {
      // Step 1: Ensure document is opened in a safe column
      const editor = await this.showDocumentSafely(vscodeThread.uri);

      if (editor && vscodeThread.range) {
        // Step 2: Ensure target thread is expanded
        vscodeThread.collapsibleState =
          vscode.CommentThreadCollapsibleState.Expanded;

        // Step 3: Reveal the range (scroll into view) and move cursor
        // We use a longer delay (200ms) to ensure layout settling after multiple expand/collapse events.
        // Also explicitly move the selection (cursor) to prevent VSCode from auto-scrolling back to the old cursor.
        const revealRange = vscodeThread.range;
        setTimeout(() => {
          if (editor.document.isClosed) {
            return;
          }
          editor.revealRange(revealRange, vscode.TextEditorRevealType.InCenter);
          editor.selection = new vscode.Selection(
            revealRange.start,
            revealRange.start,
          );
          if (focusNativePanel) {
            // Wait for the Comments Panel to sync with the new cursor position
            setTimeout(() => {
              vscode.commands.executeCommand(
                "workbench.action.focusCommentsPanel",
              );
            }, 100);
          }
        }, 200);
      }
    }
  }

  /**
   * [TEMPORARY WORKAROUND]
   * Helper to show a document.
   *
   * PROBLEM: When selecting a thread from the VSCode standard "Comments" panel, VSCode's internal
   * "Reveal" logic often preemptively opens the document in the currently active group (e.g., Preview area).
   * Since there is no API to prevent this standard behavior (unlike TreeView), it is extremely
   * difficult to prevent duplicate tabs from appearing in certain split-pane configurations.
   *
   * NOTE: This is a provisional measure. For a fundamental solution, the Comments pane itself
   * should be re-implemented as a custom Webview (matching the Sidebar's Comment Table)
   * to bypass VSCode's uncontrollable standard reveal behavior.
   */
  private async showDocumentSafely(
    uri: vscode.Uri,
  ): Promise<vscode.TextEditor | undefined> {
    // Determine the target column. Defaulting to ViewColumn.Active or ViewColumn.One.
    let targetColumn = vscode.window.activeTextEditor?.viewColumn;
    if (targetColumn === vscode.ViewColumn.Beside || !targetColumn) {
      targetColumn = vscode.ViewColumn.One;
    }

    // Attempt to reveal the document.
    // Note: Due to VSCode standard reveal behavior, this may still result in duplicate tabs
    // if the user's focus is in a preview/webview area.
    return await vscode.window.showTextDocument(uri, {
      viewColumn: targetColumn,
      preserveFocus: false,
      preview: false,
    });
  }

  private createVSCodeThread(
    document: vscode.TextDocument,
    domainThread: DomainThread,
  ): vscode.CommentThread {
    const startPos = document.positionAt(domainThread.anchor.offset);
    const endPos = document.positionAt(
      domainThread.anchor.offset + domainThread.anchor.length,
    );
    const range = new vscode.Range(startPos, endPos);

    const vscodeThread = this.controller.createCommentThread(
      document.uri,
      range,
      [],
    );
    vscodeThread.collapsibleState =
      vscode.CommentThreadCollapsibleState.Expanded;

    const rootComment = domainThread.comments[0];
    if (rootComment && rootComment.status) {
      const icon = getStatusIcon(rootComment.status);
      vscodeThread.label = `Status: ${icon} ${rootComment.status.toUpperCase()}`;
    }

    vscodeThread.comments = domainThread.comments.map((c, index) =>
      this.toVSCodeComment(c, vscodeThread, index === 0),
    );

    (vscodeThread as any).domainThreadId = domainThread.id;
    (vscodeThread as any).command = {
      title: "Reveal Comment",
      command: "markdown-comment.revealCommentFromTable",
      arguments: [domainThread.id, document.uri.fsPath],
    };
    this.threads.set(domainThread.id, vscodeThread);
    return vscodeThread;
  }

  private toVSCodeComment(
    c: DomainComment,
    thread: vscode.CommentThread,
    isRoot: boolean,
  ): vscode.Comment {
    let bodyContent = "";
    if (c.tags && c.tags.length > 0) {
      const tagBadges = c.tags.map((tag) => `\`🏷️${tag}\``).join(" ");
      bodyContent = tagBadges + "\n\n---\n\n";
    }
    bodyContent += c.content;

    const markdownBody = new vscode.MarkdownString(bodyContent);
    markdownBody.isTrusted = true;

    const comment: vscode.Comment = {
      body: markdownBody,
      mode: vscode.CommentMode.Preview,
      author: { name: c.author },
      contextValue: isRoot ? "rootComment" : "comment",
    };
    (comment as any).domainCommentId = c.id;
    (comment as any).thread = thread;
    return comment;
  }

  private registerCommands(): void {
    this.context.subscriptions.push(
      vscode.commands.registerCommand(
        "markdown-comment.addComment",
        async (reply: vscode.CommentReply) => {
          if (!reply || !reply.thread) {
            vscode.window.showInformationMessage(
              "Click `Add Comment` Button to Save",
            );
            return;
          }

          const thread = reply.thread;
          const content = reply.text;
          const filePath = thread.uri.fsPath;
          const config = vscode.workspace.getConfiguration("markdownComment");
          const author =
            config.get<string>("defaultAuthor") || vscode.env.machineId;

          const domainThreadId = (thread as any).domainThreadId;
          if (domainThreadId) {
            await this.commentService.addReply(
              filePath,
              domainThreadId,
              content,
              author,
            );
          } else {
            const doc = await vscode.workspace.openTextDocument(thread.uri);
            const docContent = doc.getText();

            if (!thread.range) {
              return;
            }
            const offset = doc.offsetAt(thread.range.start);
            const length = doc.offsetAt(thread.range.end) - offset;

            const newThread = await this.commentService.createThread(
              filePath,
              docContent,
              offset,
              length,
              author,
              content,
            );
            (thread as any).domainThreadId = newThread.id;
          }

          await this.notifyAndRefresh(thread.uri);
        },
      ),
    );

    this.context.subscriptions.push(
      vscode.commands.registerCommand(
        "markdown-comment.deleteComment",
        async (comment: vscode.Comment, threadArg?: vscode.CommentThread) => {
          const thread = threadArg || (comment as any).thread;
          if (!thread) {
            return;
          }

          const domainThreadId = (thread as any).domainThreadId;
          const domainCommentId = (comment as any).domainCommentId;
          const filePath = thread.uri.fsPath;

          await this.commentService.deleteComment(
            filePath,
            domainThreadId,
            domainCommentId,
          );

          await this.notifyAndRefresh(thread.uri);
        },
      ),
    );

    this.context.subscriptions.push(
      vscode.commands.registerCommand(
        "markdown-comment.changeCommentStatus",
        async (comment: vscode.Comment, threadArg?: vscode.CommentThread) => {
          const thread = threadArg || (comment as any).thread;
          if (!thread) {
            return;
          }

          const domainThreadId = (thread as any).domainThreadId;
          const domainCommentId = (comment as any).domainCommentId;
          const filePath = thread.uri.fsPath;

          const status = await vscode.window.showQuickPick(
            ["open", "resolved", "closed"],
            { placeHolder: "Select new status" },
          );

          if (status) {
            await this.commentService.updateStatus(
              filePath,
              domainThreadId,
              domainCommentId,
              status as any,
            );
            await this.notifyAndRefresh(thread.uri);
          }
        },
      ),
    );

    this.context.subscriptions.push(
      vscode.commands.registerCommand(
        "markdown-comment.editComment",
        async (comment: vscode.Comment, threadArg?: vscode.CommentThread) => {
          const thread = threadArg || (comment as any).thread;
          if (!thread) {
            return;
          }

          const domainThreadId = (thread as any).domainThreadId;
          const domainCommentId = (comment as any).domainCommentId;
          const filePath = thread.uri.fsPath;

          const threads = await this.commentService.getThreadsForFile(
            filePath,
            "",
          );
          const targetThread = threads.find((t) => t.id === domainThreadId);
          const targetComment = targetThread?.comments.find(
            (c) => c.id === domainCommentId,
          );

          const newContent = await vscode.window.showInputBox({
            prompt: "Edit Comment",
            value: targetComment ? targetComment.content : "",
          });

          if (newContent !== undefined) {
            await this.commentService.updateComment(
              filePath,
              domainThreadId,
              domainCommentId,
              newContent,
            );
            await this.notifyAndRefresh(thread.uri);
          }
        },
      ),
    );
  }
}
