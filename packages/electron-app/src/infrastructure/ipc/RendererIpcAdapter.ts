export interface IpcAdapter {
  openFile(): Promise<{ filePath: string; content: string } | null>;
  openFileSpecific(
    filePath: string,
  ): Promise<{ filePath: string; content: string } | null>;
  getRecentFiles(): Promise<string[]>;
  generateAiPrompt(): Promise<string | null>;
  getThreads(filePath: string): Promise<any[]>;
  getAvailableTags(filePath: string): Promise<string[]>;

  addComment(params: any): Promise<void>;
  addReply(params: any): Promise<void>;
  updateComment(params: any): Promise<void>;
  updateTags(params: any): Promise<void>;
  deleteComment(params: any): Promise<void>;
  updateStatus(params: any): Promise<void>;

  saveLayout(settings: {
    sidebarWidth?: number;
    panelHeight?: number;
  }): Promise<void>;
  getWindowState(): Promise<any>;

  openExternal(url: string): Promise<void>;

  // Event Listeners
  onUpdatePreview(callback: (data: any) => void): void;
  onTriggerAddComment(callback: () => void): void;
  onTriggerOpenFile(callback: () => void): void;
  onUpdateRecentFiles(callback: (files: string[]) => void): void;
  log(msg: string): Promise<void>;
}

declare global {
  interface Window {
    api: any;
  }
}

export class RendererIpcAdapter implements IpcAdapter {
  private api: any;

  constructor() {
    this.api = window.api;
    if (!this.api) {
      console.error("RendererIpcAdapter: window.api is not defined!");
    }
  }

  openFile() {
    return this.api.openFile();
  }
  openFileSpecific(filePath: string) {
    return this.api.openFileSpecific(filePath);
  }
  getRecentFiles() {
    return this.api.getRecentFiles();
  }
  generateAiPrompt() {
    return this.api.generateAiPrompt();
  }
  getThreads(filePath: string) {
    return this.api.getThreads(filePath);
  }
  getAvailableTags(filePath: string) {
    return this.api.getAvailableTags(filePath);
  }

  addComment(params: any) {
    return this.api.addComment(params);
  }
  addReply(params: any) {
    return this.api.addReply(params);
  }
  updateComment(params: any) {
    return this.api.updateComment(params);
  }
  updateTags(params: any) {
    return this.api.updateComment(params);
  } // Re-uses update-comment
  deleteComment(params: any) {
    return this.api.deleteComment(params);
  }
  updateStatus(params: any) {
    return this.api.updateStatus(params);
  }

  saveLayout(settings: any) {
    return this.api.saveLayout(settings);
  }
  getWindowState() {
    return this.api.getWindowState();
  }

  openExternal(url: string) {
    return this.api.openExternal(url);
  }

  onUpdatePreview(callback: (data: any) => void) {
    this.api.onUpdatePreview(callback);
  }
  onTriggerAddComment(callback: () => void) {
    this.api.onTriggerAddComment(callback);
  }
  onTriggerOpenFile(callback: () => void) {
    this.api.onTriggerOpenFile(callback);
  }
  onUpdateRecentFiles(callback: (files: string[]) => void) {
    this.api.onUpdateRecentFiles(callback);
  }
  log(msg: string) {
    return this.api.log(msg);
  }
}
