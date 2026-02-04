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
});
