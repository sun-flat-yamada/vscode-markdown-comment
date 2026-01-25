import * as vscode from "vscode";
import * as path from "path";
import { IPreviewPresenter } from "../application/IPreviewPresenter";

export class WebviewPreviewPresenter implements IPreviewPresenter {
  private panel: vscode.WebviewPanel | undefined;
  private lastSelectedText: string = "";
  private currentFilePath: string | undefined;
  private clickCommentCallback: ((threadId: string) => void) | undefined;
  private updateStatusCallback:
    | ((threadId: string, commentId: string, status: string) => void)
    | undefined;
  private toggleSidebarCallback:
    | ((filePath: string, visible: boolean) => void)
    | undefined;
  private sidebarVisibility: Map<string, boolean> = new Map();

  /**
   * 指定されたHTMLコンテンツをプレビューとして表示・更新します。
   */
  public async show(
    html: string,
    title: string,
    filePath: string,
    column: "active" | "beside" | undefined = "beside",
  ): Promise<void> {
    this.currentFilePath = filePath;
    const viewColumn =
      column === "beside" ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active;

    const resourceRoots = [vscode.Uri.file(path.dirname(filePath))];

    if (this.panel) {
      // column が "active" の場合のみ reveal を行い、それ以外（自動更新など）ではフォーカスを奪わない
      if (column === "active") {
        this.panel.reveal(viewColumn);
      }
    } else {
      this.panel = vscode.window.createWebviewPanel(
        "markdownPreview",
        title,
        {
          viewColumn: viewColumn,
          preserveFocus: true,
        },
        {
          enableScripts: true,
          localResourceRoots: resourceRoots,
        },
      );

      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });

      this.panel.webview.onDidReceiveMessage((message) => {
        if (message.type === "selection") {
          this.lastSelectedText = message.text;
        } else if (message.type === "revealComment") {
          if (this.clickCommentCallback) {
            this.clickCommentCallback(message.threadId);
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

    // 内容に変更がある場合のみ HTML を更新する（Webview のリロード＝フォーカス喪失リスクを最小化）
    if (this.panel.webview.html !== html) {
      this.panel.webview.html = html;
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
  public onDidClickComment(callback: (threadId: string) => void): void {
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
