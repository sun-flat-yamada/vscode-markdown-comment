import { ipcMain, dialog, BrowserWindow, app } from "electron";
import * as path from "path";
import * as fs from "fs/promises";
import {
  ShowPreviewUseCase,
  GenerateAIPromptUseCase,
  CommentService,
} from "@markdown-comment/core";
import { ElectronDocumentRepository } from "../infrastructure/ElectronDocumentRepository";

export class IpcHandler {
  private recentFilesPath: string;

  constructor(
    private window: BrowserWindow,
    private docRepo: ElectronDocumentRepository,
    private showPreviewUseCase: ShowPreviewUseCase,
    private generateAIPromptUseCase: GenerateAIPromptUseCase,
    private commentService: CommentService,
  ) {
    this.recentFilesPath = path.join(
      app.getPath("userData"),
      "recent-files.json",
    );
  }

  setup(): void {
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
      return await this.loadRecentFiles();
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
        { filePath, offset, length, author, content, selectedText },
      ) => {
        const doc = await this.docRepo.getDocumentByPath(filePath);
        if (!doc) {
          return { error: "Document not found", filePath };
        }

        // If selectedText is provided, try to find it in the document
        if (selectedText && offset === 0 && length === 0) {
          const index = doc.content.indexOf(selectedText);
          if (index !== -1) {
            offset = index;
            length = selectedText.length;
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

    ipcMain.handle("log", (_, msg: string) => {
      console.log("Renderer LOG:", msg);
    });
  }

  async openFile(filePath: string) {
    console.log("IPC: processing openFile for", filePath);
    const doc = await this.docRepo.getDocumentByPath(filePath);
    if (doc) {
      this.docRepo.setDocument(filePath, doc.content);
      await this.showPreviewUseCase.execute("active", filePath);
      await this.saveRecentFile(filePath);
      return { filePath, content: doc.content };
    }
    return null;
  }

  private async loadRecentFiles(): Promise<string[]> {
    try {
      const data = await fs.readFile(this.recentFilesPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async saveRecentFile(filePath: string): Promise<void> {
    const files = await this.loadRecentFiles();
    const filtered = [filePath, ...files.filter((f) => f !== filePath)].slice(
      0,
      10,
    );
    await fs.writeFile(this.recentFilesPath, JSON.stringify(filtered));
    this.window.webContents.send("update-recent-files", filtered);
  }
}
