/**
 * @file preload.ts
 * @description ElectronのPreloadスクリプト。
 * レンダラープロセスに対して、安全なAPI（`window.api`）を公開する。
 *
 * 【責務】
 * - `contextBridge` を使用して、メインプロセスの機能へのアクセスを提供。
 * - セキュリティ境界の維持（Node.js APIを直接レンダラーに露出させない）。
 */
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  openFile: () => ipcRenderer.invoke("open-file"),
  openFileSpecific: (filePath: string) =>
    ipcRenderer.invoke("open-file-specific", filePath),
  getRecentFiles: () => ipcRenderer.invoke("get-recent-files"),
  generateAiPrompt: () => ipcRenderer.invoke("generate-ai-prompt"),
  onUpdatePreview: (callback: any) =>
    ipcRenderer.on("update-preview", (_, data) => callback(data)),
  onUpdateRecentFiles: (callback: any) =>
    ipcRenderer.on("update-recent-files", (_, files) => callback(files)),
  onTriggerOpenFile: (callback: any) =>
    ipcRenderer.on("trigger-open-file", () => callback()),
  addComment: (data: any) => ipcRenderer.invoke("add-comment", data),
  addReply: (data: any) => ipcRenderer.invoke("add-reply", data),
  updateComment: (data: any) => ipcRenderer.invoke("update-comment", data),
  deleteComment: (data: any) => ipcRenderer.invoke("delete-comment", data),
  updateStatus: (data: any) => ipcRenderer.invoke("update-status", data),
  getThreads: (filePath: string) => ipcRenderer.invoke("get-threads", filePath),
  getAvailableTags: (filePath: string) =>
    ipcRenderer.invoke("get-available-tags", filePath),
  clickComment: (threadId: string) =>
    ipcRenderer.send("comment-clicked", threadId),
  log: (msg: string) => ipcRenderer.invoke("log", msg),
  showContextMenu: () => ipcRenderer.send("show-context-menu"),
  saveLayout: (settings: { sidebarWidth?: number; panelHeight?: number }) =>
    ipcRenderer.invoke("save-layout", settings),
  getWindowState: () => ipcRenderer.invoke("get-window-state"),
  onTriggerAddComment: (callback: any) =>
    ipcRenderer.on("trigger-add-comment", () => callback()),
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
});
