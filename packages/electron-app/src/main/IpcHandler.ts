/**
 * @file IpcHandler.ts
 * @description メインプロセスのIPC通信ハンドラー。
 * レンダラープロセスからの要求を受け取り、ドメインロジック（UseCase/Service）を実行して結果を返す。
 */
import { ipcMain, dialog, BrowserWindow, app, Menu, shell } from "electron";
import {
  ShowPreviewUseCase,
  GenerateAIPromptUseCase,
  CommentService,
} from "@markdown-comment/core";
import { ElectronDocumentRepository } from "../infrastructure/ElectronDocumentRepository";
import { WindowManager } from "./WindowManager";
import { ElectronRecentFilesRepository } from "../infrastructure/repositories/ElectronRecentFilesRepository";
import { TextSearchService } from "../domain/services/TextSearchService";

/**
 * @class IpcHandler
 * @description IPC通信処理を一元管理するクラス。
 *
 * 【責務】
 * - `ipcMain` イベントリスナーの登録。
 * - レンダラーからの呼び出しを適切なサービス/ユースケースに委譲。
 * - 実行結果またはエラーの返却。
 *
 * 【実装メカニズム】
 * - コンストラクタで必要なユースケース・サービスを受け取る（依存性注入）。
 * - `setup()` メソッドで `ipcMain.handle` および `ipcMain.on` を定義する。
 * - `open-file`, `add-comment` などのアクションに対応する処理を実装。
 */
export class IpcHandler {
  constructor(
    private window: BrowserWindow,
    private docRepo: ElectronDocumentRepository,
    private showPreviewUseCase: ShowPreviewUseCase,
    private generateAIPromptUseCase: GenerateAIPromptUseCase,
    private commentService: CommentService,
    private windowManager: WindowManager,
    private recentFilesRepo: ElectronRecentFilesRepository,
    private textSearchService: TextSearchService,
  ) {}

  setup(): void {
    console.log("IpcHandler: Registering handlers...");
    ipcMain.handle("open-file", async () => {
      const result = await dialog.showOpenDialog(this.window, {
        properties: ["openFile"],
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return await this.openFile(result.filePaths[0]);
      }
      return null;
    });

    ipcMain.handle("open-file-specific", async (_, filePath: string) => {
      console.log("IPC: open-file-specific called for", filePath);
      return await this.openFile(filePath);
    });

    ipcMain.handle("get-recent-files", async () => {
      return await this.recentFilesRepo.load();
    });

    ipcMain.handle("generate-ai-prompt", async () => {
      const doc = await this.docRepo.getCurrentDocument();
      if (!doc) return null;
      const threads = await this.commentService.getThreadsForFile(
        doc.filePath,
        doc.content,
      );
      return this.generateAIPromptUseCase.execute(doc, threads);
    });

    ipcMain.handle(
      "add-comment",
      async (
        _,
        {
          filePath,
          offset,
          length,
          author,
          content,
          selectedText,
          contextBefore,
          contextAfter,
        },
      ) => {
        const doc = await this.docRepo.getDocumentByPath(filePath);
        if (!doc) {
          return { error: "Document not found", filePath };
        }

        // Delegate text search complexity to Domain Service
        if (selectedText && offset === 0 && length === 0) {
          const match = this.textSearchService.findBestMatch(
            doc.content,
            selectedText,
            contextBefore,
            contextAfter,
          );
          if (match) {
            offset = match.offset;
            length = match.length;
          }
        }

        const thread = await this.commentService.createThread(
          filePath,
          doc.content,
          offset,
          length,
          author,
          content,
        );
        await this.showPreviewUseCase.execute("active", filePath);
        return thread;
      },
    );

    ipcMain.handle(
      "add-reply",
      async (_, { filePath, threadId, author, content }) => {
        const thread = await this.commentService.addReply(
          filePath,
          threadId,
          content,
          author,
        );
        await this.showPreviewUseCase.execute("active", filePath);
        return thread;
      },
    );

    ipcMain.handle(
      "update-comment",
      async (_, { filePath, threadId, commentId, content, tags }) => {
        if (content !== undefined) {
          await this.commentService.updateComment(
            filePath,
            threadId,
            commentId,
            content,
          );
        }
        if (tags !== undefined) {
          await this.commentService.updateTags(
            filePath,
            threadId,
            commentId,
            tags,
          );
        }
        await this.showPreviewUseCase.execute("active", filePath);
      },
    );

    ipcMain.handle(
      "delete-comment",
      async (_, { filePath, threadId, commentId }) => {
        await this.commentService.deleteComment(filePath, threadId, commentId);
        await this.showPreviewUseCase.execute("active", filePath);
      },
    );

    ipcMain.handle(
      "update-status",
      async (_, { filePath, threadId, commentId, status }) => {
        await this.commentService.updateStatus(
          filePath,
          threadId,
          commentId,
          status,
        );
        await this.showPreviewUseCase.execute("active", filePath);
      },
    );

    ipcMain.handle("get-threads", async (_, filePath: string) => {
      const doc = await this.docRepo.getDocumentByPath(filePath);
      if (!doc) return [];
      return await this.commentService.getThreadsForFile(filePath, doc.content);
    });

    ipcMain.handle("get-available-tags", async (_, filePath: string) => {
      return await this.commentService.getAvailableTags(filePath);
    });

    ipcMain.handle("log", (_, msg: string) => {
      console.log("Renderer LOG:", msg);
    });

    ipcMain.handle("get-window-state", async () => {
      return await this.windowManager.getWindowState();
    });

    ipcMain.handle(
      "save-layout",
      async (_, settings: { sidebarWidth?: number; panelHeight?: number }) => {
        await this.windowManager.updateLayoutSettings(settings);
      },
    );

    ipcMain.on("show-context-menu", (event) => {
      const template = [
        {
          label: "Add Comment",
          click: () => {
            this.window.webContents.send("trigger-add-comment");
          },
        },
      ];
      const menu = Menu.buildFromTemplate(template);
      menu.popup({
        window: BrowserWindow.fromWebContents(event.sender) || this.window,
      });
    });

    ipcMain.handle("open-external", async (_, url: string) => {
      console.log("IPC: Opening external URL:", url);
      await shell.openExternal(url);
    });

    ipcMain.handle("print", async () => {
      console.log("IPC: Print requested");
      this.window.webContents.print();
    });
  }

  async openFile(filePath: string) {
    console.log("IPC: processing openFile for", filePath);
    const doc = await this.docRepo.getDocumentByPath(filePath);
    if (doc) {
      this.docRepo.setDocument(filePath, doc.content);
      await this.showPreviewUseCase.execute("active", filePath);
      await this.recentFilesRepo.add(filePath);
      return { filePath, content: doc.content };
    }
    return null;
  }
}
