import { BrowserWindow, ipcMain } from "electron";
import { IPreviewPresenter } from "@markdown-comment/core";

export class ElectronPreviewPresenter implements IPreviewPresenter {
  constructor(private window: BrowserWindow) {}

  async show(
    html: string,
    title: string,
    filePath: string,
    column: "active" | "beside" | undefined,
    threads?: any[],
  ): Promise<void> {
    this.window.webContents.send("update-preview", {
      html,
      title,
      filePath,
      threads,
    });
  }
  async ensurePanel(
    _filePath: string,
    _title: string,
    _column?: "active" | "beside",
  ): Promise<void> {
    // In Electron app, the preview area always exists.
    return Promise.resolve();
  }

  asWebviewUri(localPath: string): string {
    // In Electron, we can use file:// or a custom protocol.
    // For now file:// is used, but for security, a custom protocol is better.
    return `file://${localPath}`;
  }

  getCspSource(): string {
    return "'self' file:";
  }

  getSelectedText(): string {
    // Selection state is managed in renderer
    return "";
  }

  getCurrentFilePath(): string | undefined {
    return undefined; // Managed by repo
  }

  onDidClickComment(
    callback: (threadId: string, commentId?: string) => void,
  ): void {
    ipcMain.on("comment-clicked", (_, { threadId, commentId }) =>
      callback(threadId, commentId),
    );
  }

  onUpdateStatus(
    callback: (threadId: string, commentId: string, status: string) => void,
  ): void {
    ipcMain.on("update-status", (_, { threadId, commentId, status }) =>
      callback(threadId, commentId, status),
    );
  }

  isSidebarVisible(_filePath: string): boolean {
    return true;
  }

  onDidToggleSidebar(
    _callback: (filePath: string, visible: boolean) => void,
  ): void {
    // Not implemented for now
  }
}
