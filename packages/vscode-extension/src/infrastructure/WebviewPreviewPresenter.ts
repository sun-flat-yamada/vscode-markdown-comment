import * as vscode from "vscode";
import * as path from "path";
import { IPreviewPresenter } from "@markdown-comment/core";

export class WebviewPreviewPresenter implements IPreviewPresenter {
  private panel: vscode.WebviewPanel | undefined;
  private lastSelectedText: string = "";
  private currentFilePath: string | undefined;
  private clickCommentCallback:
    | ((threadId: string, commentId?: string) => void)
    | undefined;
  private updateStatusCallback:
    | ((threadId: string, commentId: string, status: string) => void)
    | undefined;
  private toggleSidebarCallback:
    | ((filePath: string, visible: boolean) => void)
    | undefined;
  private sidebarVisibility: Map<string, boolean> = new Map();
  private activeResourceRoots: string[] = [];

  private normalizePath(p: string): string {
    return path
      .normalize(p)
      .toLowerCase()
      .replace(/[\\/]$/, "");
  }

  /**
   * Ensuring the preview panel exists and is ready for rendering.
   * Also handles dynamic updating of localResourceRoots if the document directory changes.
   */
  public async ensurePanel(
    filePath: string,
    title: string,
    column?: "active" | "beside",
  ): Promise<void> {
    const targetDir = path.dirname(filePath);
    const normalizedTargetDir = this.normalizePath(targetDir);

    // Determine the target column. Beside (-2) or Active (-1).
    const targetColumn =
      column === "beside" ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active;

    const resourceRoots = [vscode.Uri.file(targetDir)];
    if (vscode.workspace.workspaceFolders) {
      resourceRoots.push(
        ...vscode.workspace.workspaceFolders.map((f) => f.uri),
      );
    }

    // Check if current panel exists and covers the target directory.
    // VS Code Webview panels don't support updating localResourceRoots after creation.
    const isRootCovered = this.activeResourceRoots.some((r) => {
      const normalizedRoot = this.normalizePath(r);
      // On Windows, targetDir might be inside workspace folder.
      return (
        normalizedTargetDir === normalizedRoot ||
        normalizedTargetDir.startsWith(normalizedRoot + path.sep)
      );
    });

    if (this.panel && !isRootCovered) {
      this.panel.dispose();
      this.panel = undefined;
      this.lastSelectedText = ""; // Reset as the view is gone
    }

    if (!this.panel) {
      this.activeResourceRoots = resourceRoots.map((u) => u.fsPath);
      this.panel = vscode.window.createWebviewPanel(
        "markdownPreview",
        title,
        {
          viewColumn: targetColumn,
          preserveFocus: true,
        },
        {
          enableScripts: true,
          localResourceRoots: resourceRoots,
        },
      );

      this.panel.onDidDispose(() => {
        this.panel = undefined;
        this.activeResourceRoots = [];
      });

      this.panel.webview.onDidReceiveMessage((message) => {
        if (message.type === "selection") {
          this.lastSelectedText = message.text;
        } else if (
          message.type === "revealComment" ||
          message.command === "select-comment"
        ) {
          if (this.clickCommentCallback) {
            this.clickCommentCallback(
              message.threadId || message.id,
              message.commentId,
            );
          }
        } else if (message.type === "updateStatus") {
          if (this.updateStatusCallback) {
            this.updateStatusCallback(
              message.threadId,
              message.commentId,
              message.status,
            );
          }
        } else if (message.type === "toggleSidebar") {
          if (this.currentFilePath) {
            this.sidebarVisibility.set(this.currentFilePath, message.visible);
            if (this.toggleSidebarCallback) {
              this.toggleSidebarCallback(this.currentFilePath, message.visible);
            }
          }
        }
      });
    }

    this.panel.title = title;
    this.currentFilePath = filePath;

    // Always reveal to ensure correct pane positioning (essential for "To Side" behavior)
    if (column) {
      this.panel.reveal(targetColumn, true);
    }
  }

  /**
   * 指定されたHTMLコンテンツをプレビューとして表示・更新します。
   */
  public async show(
    html: string,
    title: string,
    filePath: string,
    _column: "active" | "beside" | undefined = "beside",
    _threads?: any[],
  ): Promise<void> {
    if (!this.panel) {
      await this.ensurePanel(filePath, title, _column);
    }

    if (this.panel) {
      // 内容に変更がある場合のみ HTML を更新する
      if (this.panel.webview.html !== html) {
        this.panel.webview.html = html;
      }
    }
  }

  /**
   * ローカルのファイルパスを Webview で利用可能な URI 形式に変換します。
   */
  public asWebviewUri(localPath: string): string {
    if (!this.panel) {
      return localPath;
    }
    return this.panel.webview
      .asWebviewUri(vscode.Uri.file(localPath))
      .toString();
  }

  /**
   * Webview の CSP ソースを取得します。
   */
  public getCspSource(): string {
    if (!this.panel) {
      return "";
    }
    return this.panel.webview.cspSource;
  }

  /**
   * プレビュー画面で現在選択されているテキストを取得します。
   */
  public getSelectedText(): string {
    return this.lastSelectedText;
  }

  /**
   * 現在プレビュー表示しているドキュメントのパスを取得します。
   */
  public getCurrentFilePath(): string | undefined {
    return this.currentFilePath;
  }

  /**
   * コメントハイライトがクリックされた時のイベントを登録します。
   */
  public onDidClickComment(
    callback: (threadId: string, commentId?: string) => void,
  ): void {
    this.clickCommentCallback = callback;
  }

  /**
   * プレビュー画面でステータスが変更された時のイベントを登録します。
   */
  public onUpdateStatus(
    callback: (threadId: string, commentId: string, status: string) => void,
  ): void {
    this.updateStatusCallback = callback;
  }

  /**
   * プレビュー画面のサイドバー表示状態を取得します。
   */
  public isSidebarVisible(filePath: string): boolean {
    return this.sidebarVisibility.get(filePath) || false;
  }

  /**
   * プレビュー画面のサイドバー表示状態が変更された時のイベントを登録します。
   */
  public onDidToggleSidebar(
    callback: (filePath: string, visible: boolean) => void,
  ): void {
    this.toggleSidebarCallback = callback;
  }
}
