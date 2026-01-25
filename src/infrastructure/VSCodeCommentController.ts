import * as vscode from "vscode";
import { CommentService } from "../application/CommentService";
import {
  CommentThread as DomainThread,
  Comment as DomainComment,
  getStatusIcon,
} from "../domain/Comment";
import { COMMENT_CONTROLLER_ID } from "../domain/Constants";

export class VSCodeCommentController {
  private controller: vscode.CommentController;
  private threads: Map<string, vscode.CommentThread> = new Map();
  private lastRefreshedUri: string | undefined;
  private onDidUpdate?: () => void;

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
      // Collapse other threads
      for (const t of this.threads.values()) {
        if (
          t.uri.toString() === vscodeThread.uri.toString() &&
          t !== vscodeThread
        ) {
          t.collapsibleState = vscode.CommentThreadCollapsibleState.Collapsed;
        }
      }
      vscodeThread.collapsibleState =
        vscode.CommentThreadCollapsibleState.Expanded;

      const editor = await this.showDocumentSafely(
        vscodeThread.uri,
        vscodeThread.range,
      );
      if (editor && vscodeThread.range) {
        editor.revealRange(
          vscodeThread.range,
          vscode.TextEditorRevealType.InCenter,
        );
      }
    }
  }

  /**
   * Helper to show a document while reusing existing tabs.
   * If VSCode opens a new preview tab in an unwanted column (like Beside), we close it.
   */
  private async showDocumentSafely(
    uri: vscode.Uri,
    selection?: vscode.Range,
  ): Promise<vscode.TextEditor | undefined> {
    const targetFsPath = uri.fsPath.toLowerCase();

    // 1. Find ALL tabs that match this document across all groups
    const allTabs: { tab: vscode.Tab; group: vscode.TabGroup }[] = [];
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (
          tab.input instanceof vscode.TabInputText &&
          tab.input.uri.fsPath.toLowerCase() === targetFsPath
        ) {
          allTabs.push({ tab, group });
        }
      }
    }

    // 2. Identify the "best" tab (prefer non-preview or already active)
    // If we have a tab that is NOT a preview, it's our best choice.
    let bestTab =
      allTabs.find((t) => !t.tab.isPreview) ||
      allTabs.find((t) => t.tab.isActive) ||
      allTabs[0];

    // 3. If VSCode just opened a new preview tab in the WRONG group (e.g. where Preview is),
    // we should prioritize the OTHER group where a tab might already exist.
    if (allTabs.length > 1) {
      const nonPreviewTabs = allTabs.filter((t) => !t.tab.isPreview);
      if (nonPreviewTabs.length > 0) {
        bestTab = nonPreviewTabs[0];
      }
    }

    // 4. Close "trash" tabs (preview tabs that are not the best tab)
    // This happens when VSCode's default behavior opens a new tab in the active (Beside) group.
    for (const { tab } of allTabs) {
      if (tab !== bestTab?.tab && tab.isPreview) {
        try {
          await vscode.window.tabGroups.close(tab);
        } catch (e) {
          // Ignore if already closed
        }
      }
    }

    if (bestTab && bestTab.tab.input instanceof vscode.TabInputText) {
      // Use the specific column of the best tab to avoid opening in Beside
      return await vscode.window.showTextDocument(bestTab.tab.input.uri, {
        viewColumn: bestTab.group.viewColumn,
        preserveFocus: false,
        preview: false,
        selection: selection,
      });
    }

    // 5. Search in visible editors as fallback
    const visibleEditor = vscode.window.visibleTextEditors.find(
      (e) => e.document.uri.fsPath.toLowerCase() === targetFsPath,
    );
    if (visibleEditor) {
      return await vscode.window.showTextDocument(visibleEditor.document, {
        viewColumn: visibleEditor.viewColumn,
        preserveFocus: false,
        preview: false,
        selection: selection,
      });
    }

    // 6. Fallback: Open in ViewColumn.One (usually the left side) if beside is active
    let targetColumn = vscode.ViewColumn.Active;
    if (
      vscode.window.activeTextEditor?.viewColumn === vscode.ViewColumn.Beside
    ) {
      targetColumn = vscode.ViewColumn.One;
    }

    return await vscode.window.showTextDocument(uri, {
      viewColumn: targetColumn,
      preview: false,
      selection: selection,
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
          let thread: vscode.CommentThread;
          let content: string;

          if (reply && reply.thread) {
            thread = reply.thread;
            content = reply.text;
          } else {
            vscode.window.showInformationMessage(
              "Click `Add Comment` Button to Save",
            );
            return;
          }

          const filePath = thread.uri.fsPath;
          const config = vscode.workspace.getConfiguration("markdownComment");
          let author =
            config.get<string>("defaultAuthor") || vscode.env.machineId;

          if ((thread as any).domainThreadId) {
            await this.commentService.addReply(
              filePath,
              (thread as any).domainThreadId,
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

          if (this.onDidUpdate) {
            this.onDidUpdate();
          }

          const editor = vscode.window.visibleTextEditors.find(
            (e) => e.document.uri.toString() === thread.uri.toString(),
          );
          if (editor) {
            await this.refreshForEditor(editor, true);
          }
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

          if (this.onDidUpdate) {
            this.onDidUpdate();
          }

          const editor = vscode.window.visibleTextEditors.find(
            (e) => e.document.uri.toString() === thread.uri.toString(),
          );
          if (editor) {
            await this.refreshForEditor(editor, true);
          }
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
            if (this.onDidUpdate) {
              this.onDidUpdate();
            }
            const editor = vscode.window.visibleTextEditors.find(
              (e) => e.document.uri.toString() === thread.uri.toString(),
            );
            if (editor) {
              await this.refreshForEditor(editor, true);
            }
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
            if (this.onDidUpdate) {
              this.onDidUpdate();
            }
            const editor = vscode.window.visibleTextEditors.find(
              (e) => e.document.uri.toString() === thread.uri.toString(),
            );
            if (editor) {
              await this.refreshForEditor(editor, true);
            }
          }
        },
      ),
    );
  }
}
