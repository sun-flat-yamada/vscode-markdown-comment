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
  private activeThread: vscode.CommentThread | undefined;
  private activeReplyText: string = "";

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly commentService: CommentService,
    private readonly onDidUpdate?: () => void,
  ) {
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

    // 削除されたスレッドの破棄 (現在のドキュメントに属するもののみを対象とする)
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

    // 位置（Range）の更新: 変更がある場合のみ代入する
    if (vscodeThread.range && !vscodeThread.range.isEqual(range)) {
      vscodeThread.range = range;
    }

    // Update Thread label based on status
    const rootComment = domainThread.comments[0];
    if (rootComment && rootComment.status) {
      const icon = getStatusIcon(rootComment.status);
      vscodeThread.label = `Status: ${icon} ${rootComment.status.toUpperCase()}`;
    } else {
      vscodeThread.label = undefined;
    }

    // コメントリストの更新
    const newVSCodeComments = domainThread.comments.map((c, index) =>
      this.toVSCodeComment(c, vscodeThread, index === 0),
    );

    // 既存のコメントと内容を比較
    const isDifferent =
      vscodeThread.comments.length !== newVSCodeComments.length ||
      newVSCodeComments.some((nc, i) => {
        const existing = vscodeThread.comments[i];
        if (!existing) return true;
        return (
          existing.author.name !== nc.author.name ||
          (existing.body as vscode.MarkdownString).value !==
            (nc.body as vscode.MarkdownString).value ||
          (existing as any).domainCommentId !== (nc as any).domainCommentId
        );
      });

    if (isDifferent) {
      vscodeThread.comments = newVSCodeComments;
    }
  }

  public async revealThread(threadId: string): Promise<void> {
    const vscodeThread = this.threads.get(threadId);
    if (vscodeThread) {
      // Collapse other threads in the same document to ensure this one is prominent
      for (const thread of this.threads.values()) {
        if (
          thread.uri.toString() === vscodeThread.uri.toString() &&
          thread !== vscodeThread
        ) {
          thread.collapsibleState =
            vscode.CommentThreadCollapsibleState.Collapsed;
        }
      }

      vscodeThread.collapsibleState =
        vscode.CommentThreadCollapsibleState.Expanded;

      // Find if there's already an editor showing this document
      const existingEditor = vscode.window.visibleTextEditors.find(
        (e) => e.document.uri.toString() === vscodeThread.uri.toString(),
      );

      // Ensure the document is shown and focused in an editor (reusing existing tab if possible)
      const editor = await vscode.window.showTextDocument(vscodeThread.uri, {
        selection: vscodeThread.range,
        preserveFocus: false,
        preview: false,
        viewColumn: existingEditor
          ? existingEditor.viewColumn
          : vscode.ViewColumn.Active,
      });

      if (vscodeThread.range) {
        editor.revealRange(
          vscodeThread.range,
          vscode.TextEditorRevealType.InCenter,
        );
      }
    }
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

    // Set initial label
    const rootComment = domainThread.comments[0];
    if (rootComment && rootComment.status) {
      const icon = getStatusIcon(rootComment.status);
      vscodeThread.label = `Status: ${icon} ${rootComment.status.toUpperCase()}`;
    }

    vscodeThread.comments = domainThread.comments.map((c, index) =>
      this.toVSCodeComment(c, vscodeThread, index === 0),
    );

    // Tag threads for identification in commands
    (vscodeThread as any).domainThreadId = domainThread.id;

    this.threads.set(domainThread.id, vscodeThread);
    return vscodeThread;
  }

  private toVSCodeComment(
    c: DomainComment,
    thread: vscode.CommentThread,
    isRoot: boolean,
  ): vscode.Comment {
    // Build tag badges in Markdown format
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
    // Store IDs for deletion or editing
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
            // Ctrl+Enter 経由で引数がない場合、エラーメッセージを表示
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
            // It's a reply to an existing thread
            await this.commentService.addReply(
              filePath,
              (thread as any).domainThreadId,
              content,
              author,
            );
          } else {
            // It's a new thread
            const doc = await vscode.workspace.openTextDocument(thread.uri);
            const docContent = doc.getText();

            if (!thread.range) return;
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

          // Refresh the thread UI
          const updatedThreads = await this.commentService.getThreadsForFile(
            filePath,
            (await vscode.workspace.openTextDocument(thread.uri)).getText(),
          );
          const updatedDomainThread = updatedThreads.find(
            (t) => t.id === (thread as any).domainThreadId,
          );
          if (updatedDomainThread) {
            this.updateVSCodeThread(
              await vscode.workspace.openTextDocument(thread.uri),
              thread,
              updatedDomainThread,
            );
          }
          if (this.onDidUpdate) this.onDidUpdate();

          // 強制的にエディタ表示を最新化し、プレビューも更新する
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
            vscode.window.showErrorMessage("Comment thread context lost.");
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

          // Refresh UI
          const updatedThreads = await this.commentService.getThreadsForFile(
            filePath,
            (await vscode.workspace.openTextDocument(thread.uri)).getText(),
          );
          const updatedDomainThread = updatedThreads.find(
            (t) => t.id === domainThreadId,
          );
          if (updatedDomainThread) {
            thread.comments = updatedDomainThread.comments.map((c, index) =>
              this.toVSCodeComment(c, thread, index === 0),
            );
          } else {
            thread.dispose();
          }
          if (this.onDidUpdate) this.onDidUpdate();
        },
      ),
    );

    this.context.subscriptions.push(
      vscode.commands.registerCommand(
        "markdown-comment.changeCommentStatus",
        async (comment: vscode.Comment, threadArg?: vscode.CommentThread) => {
          const thread = threadArg || (comment as any).thread;
          if (!thread) {
            vscode.window.showErrorMessage("Comment thread context lost.");
            return;
          }

          const domainThreadId = (thread as any).domainThreadId;
          const domainCommentId = (comment as any).domainCommentId;
          const filePath = thread.uri.fsPath;

          // Only root comments should have status changed (though UI should hide action for replies)
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
            // Refresh
            const doc = await vscode.workspace.openTextDocument(thread.uri);
            await this.refreshForEditor(
              vscode.window.visibleTextEditors.find(
                (e) => e.document.uri.toString() === doc.uri.toString(),
              )!,
              true,
            );
            if (this.onDidUpdate) this.onDidUpdate();
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
            vscode.window.showErrorMessage("Comment thread context lost.");
            return;
          }

          const domainThreadId = (thread as any).domainThreadId;
          const domainCommentId = (comment as any).domainCommentId;
          const filePath = thread.uri.fsPath;

          // Standard comment edit mode is complex to setup with current architecture
          // Using InputBox as a robust alternative
          const currentBody =
            comment.body instanceof vscode.MarkdownString
              ? comment.body.value
              : (comment.body as string);

          // Re-fetch clean content from repository to avoid editing generated markdown
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
            value: targetComment ? targetComment.content : currentBody,
          });

          if (newContent !== undefined) {
            await this.commentService.updateComment(
              filePath,
              domainThreadId,
              domainCommentId,
              newContent,
            );
            // Refresh
            const doc = await vscode.workspace.openTextDocument(thread.uri);
            await this.refreshForEditor(
              vscode.window.visibleTextEditors.find(
                (e) => e.document.uri.toString() === doc.uri.toString(),
              )!,
              true,
            );
            if (this.onDidUpdate) this.onDidUpdate();
          }
        },
      ),
    );
  }
}
