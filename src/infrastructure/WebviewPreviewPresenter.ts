import * as vscode from "vscode";
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

  public async show(
    html: string,
    title: string,
    filePath: string,
    column: "active" | "beside" = "beside",
  ): Promise<void> {
    this.currentFilePath = filePath;
    const viewColumn =
      column === "beside" ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active;

    if (this.panel) {
      this.panel.reveal(viewColumn);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        "markdownPreview",
        title,
        viewColumn,
        {
          enableScripts: true,
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
    this.panel.webview.html = html;
  }

  public getSelectedText(): string {
    return this.lastSelectedText;
  }

  public onDidClickComment(callback: (threadId: string) => void): void {
    this.clickCommentCallback = callback;
  }

  public onUpdateStatus(
    callback: (threadId: string, commentId: string, status: string) => void,
  ): void {
    this.updateStatusCallback = callback;
  }

  public isSidebarVisible(filePath: string): boolean {
    return this.sidebarVisibility.get(filePath) || false;
  }

  public onDidToggleSidebar(
    callback: (filePath: string, visible: boolean) => void,
  ): void {
    this.toggleSidebarCallback = callback;
  }

  public getCurrentFilePath(): string | undefined {
    return this.currentFilePath;
  }
}
