import {
  ipcMain,
  dialog,
  BrowserWindow,
  app,
  Menu,
  MenuItem,
  shell,
} from "electron";
import * as path from "path";
import * as fs from "fs/promises";
import {
  ShowPreviewUseCase,
  GenerateAIPromptUseCase,
  CommentService,
} from "@markdown-comment/core";
import { ElectronDocumentRepository } from "../infrastructure/ElectronDocumentRepository";
import { WindowManager } from "./WindowManager";

export class IpcHandler {
  private recentFilesPath: string;
  private recentFilesCallback?: (files: string[]) => void;

  constructor(
    private window: BrowserWindow,
    private docRepo: ElectronDocumentRepository,
    private showPreviewUseCase: ShowPreviewUseCase,
    private generateAIPromptUseCase: GenerateAIPromptUseCase,
    private commentService: CommentService,
    private windowManager: WindowManager,
  ) {
    this.recentFilesPath = path.join(
      app.getPath("userData"),
      "recent-files.json",
    );
  }

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

        // If selectedText is provided, try to find it in the document with context
        if (selectedText && offset === 0 && length === 0) {
          let bestIndex = -1;
          let bestScore = -1;
          let bestLength = 0;

          // Normalize whitespace for matching: treat any sequence of whitespace as [\s\r\n]+
          const escapedText = selectedText.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );
          const pattern = escapedText.replace(/\s+/g, "[\\s\\r\\n]+");
          const regex = new RegExp(pattern, "g");

          let match;
          while ((match = regex.exec(doc.content)) !== null) {
            const searchIdx = match.index;
            const matchLength = match[0].length;
            let score = 0;

            const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
            // Strip Markdown syntax to allow matching DOM text against raw Markdown
            const stripMarkdown = (s: string) =>
              s
                .replace(/^#{1,6}\s+/gm, "") // Headers
                .replace(/\*\*|__/g, "") // Bold
                .replace(/\*|_/g, "") // Italic
                .replace(/~~([^~]+)~~/g, "$1") // Strikethrough
                .replace(/`([^`]+)`/g, "$1") // Inline code
                .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links
                .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1"); // Images

            const normBefore = contextBefore ? normalize(contextBefore) : "";
            const normAfter = contextAfter ? normalize(contextAfter) : "";

            // Check Context Before
            if (contextBefore) {
              // Get strictly preceding text
              const preText = doc.content.substring(
                Math.max(0, searchIdx - contextBefore.length - 30),
                searchIdx,
              );
              // Strip Markdown from document content, then normalize
              const normPre = normalize(stripMarkdown(preText));
              if (normPre.endsWith(normBefore)) {
                score += 2;
              } else if (
                normPre.includes(normBefore) ||
                normBefore.includes(normPre.slice(-normBefore.length))
              ) {
                // Partial match fallback
                score += 1;
              }
            }

            // Check Context After
            if (contextAfter) {
              const postText = doc.content.substring(
                searchIdx + matchLength,
                searchIdx + matchLength + contextAfter.length + 30,
              );
              // Strip Markdown from document content, then normalize
              const normPost = normalize(stripMarkdown(postText));
              if (normPost.startsWith(normAfter)) {
                score += 2;
              } else if (
                normPost.includes(normAfter) ||
                normAfter.includes(normPost.slice(0, normAfter.length))
              ) {
                score += 1;
              }
            }

            if (score > bestScore) {
              bestScore = score;
              bestIndex = searchIdx;
              bestLength = matchLength;
            }
          }

          if (bestIndex !== -1) {
            offset = bestIndex;
            length = bestLength;
          } else {
            // Fallback to simple indexOf if regex fails (unlikely but safe)
            const index = doc.content.indexOf(selectedText);
            if (index !== -1) {
              offset = index;
              length = selectedText.length;
            }
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
      await this.saveRecentFile(filePath);
      return { filePath, content: doc.content };
    }
    return null;
  }

  onRecentFilesUpdated(callback: (files: string[]) => void): void {
    this.recentFilesCallback = callback;
    // Trigger initial load
    this.loadRecentFiles().then((files) => callback(files));
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
    if (this.recentFilesCallback) {
      this.recentFilesCallback(filtered);
    }
  }
}
