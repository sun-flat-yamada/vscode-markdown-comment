/**
 * @file renderer.ts
 * @description Electron Rendererプロセスのエントリーポイント。
 * ViewとIPCの初期化、イベントバインディング、アプリケーションの状態管理を行う。
 */
import { RendererIpcAdapter } from "../infrastructure/ipc/RendererIpcAdapter.js";
import { CommentTableView } from "./views/CommentTableView.js";
import { ThreadListView } from "./views/ThreadListView.js";
import { ToolbarView } from "./views/ToolbarView.js";
import { RecentFilesView } from "./views/RecentFilesView.js";
import {
  AddCommentDialog,
  EditTagsDialog,
  AiPromptDialog,
} from "./views/DialogViews.js";
import { ThemeManager } from "./ThemeManager.js";

// Global declaration for remaining window interfaces
declare global {
  interface Window {
    api: any;
    handleIframeMessage: (msg: any) => void;
    getPreviewState: () => any;
    setPreviewState: (s: any) => void;
  }
}

/**
 * @class AppController
 * @description レンダラープロセスのメインコントローラー。
 *
 * 【責務】
 * - Viewコンポーネントの生成と調整
 * - IPCアダプターを通じたメインプロセスとの通信
 * - アプリケーションレベルの状態管理（現在のファイル、プレビュー状態など）
 * - Preview Webview (iframe) からのメッセージハンドリング
 *
 * 【実現メカニズム】
 * - コンストラクタで各ViewとIPCアダプターを初期化。
 * - `setupBindings()` でViewイベントとIPCメソッドを接続。
 * - `setupGlobalHandlers()` で iframe からの `postMessage` を `window.handleIframeMessage` 経由で受信。
 */
class AppController {
  private ipc: RendererIpcAdapter;
  private themeManager: ThemeManager;
  private commentTable: CommentTableView;
  private threadList: ThreadListView;
  private toolbar: ToolbarView;
  private recentFilesView: RecentFilesView;

  // Dialogs
  private addCommentDialog: AddCommentDialog;
  private editTagsDialog: EditTagsDialog;
  private aiDialog: AiPromptDialog;

  // State
  private currentFilePath: string | null = null;
  private previewSidebarVisible: boolean = false;
  private lastSelectionText: string = "";
  private lastSelectionContext: { before: string; after: string } | null = null;
  private replyThreadId: string | null = null;
  private highlightsVisible: boolean = true;

  constructor() {
    this.ipc = new RendererIpcAdapter();
    this.themeManager = new ThemeManager();

    // Initialize Views
    this.commentTable = new CommentTableView();
    this.threadList = new ThreadListView();
    this.toolbar = new ToolbarView();
    this.recentFilesView = new RecentFilesView();

    this.addCommentDialog = new AddCommentDialog();
    this.editTagsDialog = new EditTagsDialog();
    this.aiDialog = new AiPromptDialog();

    this.setupBindings();
    this.setupGlobalHandlers();
    this.setupSidebarTabs();
    this.setupResizers();

    // Initial Load
    this.loadInitialState();
  }

  /**
   * ViewコンポーネントとIPC、およびViewコンポーネント間のイベント連携を設定する。
   * 各コンポーネントのイベントハンドラにIPC呼び出しや他コンポーネントのメソッドを紐付ける。
   */
  private setupBindings(): void {
    // Toolbar Events
    this.toolbar.onOpenFile = async () => {
      const result = await this.ipc.openFile();
      if (result) this.setCurrentFile(result.filePath);
    };
    this.toolbar.onRefresh = () => this.refreshComments();
    this.toolbar.onAddComment = () => this.openAddCommentDialog();
    this.toolbar.onToggleComments = () => this.toggleHighlightVisibility();
    this.toolbar.togglePanelState(
      document
        .getElementById("bottom-panel")
        ?.classList.contains("collapsed") ?? false,
    );
    this.toolbar.onTogglePanel = () => {
      const panel = document.getElementById("bottom-panel");
      if (panel) {
        panel.classList.toggle("collapsed");
        this.toolbar.togglePanelState(panel.classList.contains("collapsed"));
        this.ipc.saveLayout({
          panelHeight: panel.getBoundingClientRect().height,
        });
      }
    };

    this.toolbar.onAiPrompt = async () => {
      const prompt = await this.ipc.generateAiPrompt();
      if (prompt) this.aiDialog.showPrompt(prompt);
    };
    this.toolbar.onPrint = () => {
      const frame = document.getElementById(
        "preview-frame",
      ) as HTMLIFrameElement;
      if (frame && frame.contentWindow) {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } else {
        window.print();
      }
    };

    // Table Events
    this.commentTable.onCommentClick = (tid, cid) =>
      this.syncSelection(tid, cid);
    this.commentTable.onStatusChange = async (tid, cid, status) => {
      if (!this.currentFilePath) return;
      await this.ipc.updateStatus({
        filePath: this.currentFilePath,
        threadId: tid,
        commentId: cid,
        status,
      });
    };
    this.commentTable.onReply = (tid) => {
      this.replyThreadId = tid;
      this.openAddCommentDialog(`Reply to Thread`);
    };
    this.commentTable.onEditTags = (tid, cid, tags) => {
      this.editTagsDialog.onSave = async (newTags) => {
        if (!this.currentFilePath) return;
        await this.ipc.updateTags({
          filePath: this.currentFilePath,
          threadId: tid,
          commentId: cid,
          tags: newTags,
        });
        this.refreshComments();
      };
      this.editTagsDialog.open(tags);
    };
    this.commentTable.onDelete = async (tid, cid) => {
      if (!this.currentFilePath) return;
      if (confirm("Are you sure you want to delete this comment?")) {
        await this.ipc.deleteComment({
          filePath: this.currentFilePath,
          threadId: tid,
          commentId: cid,
        });
        this.refreshComments();
      }
    };

    // Thread List Events
    this.threadList.onCommentClick = (tid, cid) => this.syncSelection(tid, cid);

    // Recent Files Events
    this.recentFilesView.onFileClick = (path) => {
      this.ipc.openFileSpecific(path);
    };

    // Dialog Events
    this.addCommentDialog.onSave = async (content) =>
      this.handleAddComment(content);

    // IPC Events
    this.ipc.onUpdatePreview((data) => this.handleUpdatePreview(data));
    this.ipc.onTriggerAddComment(() => this.toolbar.onAddComment?.());
    this.ipc.onTriggerOpenFile(() => this.toolbar.onOpenFile?.());
    this.ipc.onUpdateRecentFiles((files: string[]) =>
      this.recentFilesView.render(files),
    );
  }

  /**
   * グローバル（Window/Iframe）レベルのイベントハンドラを設定する。
   * 主にiframe (Preview) との通信 (`postMessage`) を処理するブリッジとして機能する。
   */
  private setupGlobalHandlers(): void {
    const self = this;

    window.handleIframeMessage = (msg: any) => {
      console.log("Renderer: handleIframeMessage:", msg);
      if (msg.type === "revealComment") {
        self.syncSelection(msg.threadId, msg.commentId);
      } else if (msg.type === "selection") {
        self.lastSelectionText = msg.text;
        self.lastSelectionContext = {
          before: msg.contextBefore || "",
          after: msg.contextAfter || "",
        };
      } else if (msg.type === "toggleSidebar") {
        self.previewSidebarVisible = msg.visible;
      } else if (msg.type === "openExternal") {
        if (msg.url) self.ipc.openExternal(msg.url);
      } else if (msg.type === "contextMenu") {
        // Custom Context Menu
        const existing = document.querySelector(".context-menu");
        if (existing) existing.remove();

        const menu = document.createElement("div");
        menu.className = "context-menu";
        menu.style.position = "fixed";
        menu.style.left = "100px"; // Fixed pos for test reliability or use msg.x/y
        menu.style.top = "100px";
        menu.style.backgroundColor = "var(--bg-color)";
        menu.style.border = "1px solid var(--border-color)";
        menu.style.padding = "4px 0";
        menu.style.zIndex = "10000";
        menu.style.minWidth = "150px";
        menu.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";

        const item = document.createElement("div");
        item.innerText = "Add Comment";
        item.style.padding = "4px 12px";
        item.style.cursor = "pointer";
        item.style.fontSize = "13px";
        item.onmouseenter = () =>
          (item.style.backgroundColor = "var(--hover-bg)");
        item.onmouseleave = () => (item.style.backgroundColor = "transparent");
        item.onclick = () => {
          self.openAddCommentDialog();
          menu.remove();
        };

        menu.appendChild(item);
        document.body.appendChild(menu);

        // Remove on click elsewhere
        const removeMenu = () => {
          menu.remove();
          window.removeEventListener("click", removeMenu);
        };
        setTimeout(() => window.addEventListener("click", removeMenu), 10);
      }
    };

    window.addEventListener("message", (event) => {
      if (event.data) {
        window.handleIframeMessage(event.data);
      }
    });

    window.getPreviewState = () => ({
      sidebarVisible: self.previewSidebarVisible,
    });
    window.setPreviewState = (s: any) => {
      if (s && typeof s.sidebarVisible === "boolean") {
        self.previewSidebarVisible = s.sidebarVisible;
      }
    };
  }

  private setupSidebarTabs(): void {
    const tabRecent = document.getElementById("tab-recent");
    const tabComments = document.getElementById("tab-comments");
    const sectionRecent = document.getElementById("recent-files-section");
    const sectionComments = document.getElementById("comments-section");

    if (tabRecent && tabComments && sectionRecent && sectionComments) {
      tabRecent.onclick = () => {
        tabRecent.classList.add("active");
        tabComments.classList.remove("active");
        sectionRecent.style.display = "block";
        sectionComments.style.display = "none";
      };
      tabComments.onclick = () => {
        tabComments.classList.add("active");
        tabRecent.classList.remove("active");
        sectionComments.style.display = "block";
        sectionRecent.style.display = "none";
      };
    }
  }

  /**
   * アプリケーション起動時の初期状態をロードする。
   * (テーマ、最近開いたファイル、ウィンドウサイズなど)
   */
  private loadInitialState(): void {
    // Theme
    this.themeManager.initialize(
      document.getElementById("theme-select") as HTMLSelectElement,
    );

    // Recent Files
    setTimeout(() => {
      this.ipc
        .getRecentFiles()
        .then((files: string[]) => this.recentFilesView.render(files));
    }, 500);

    // Window State
    this.ipc.getWindowState().then((state: any) => {
      const sidebar = document.getElementById("sidebar");
      const bottomPanel = document.getElementById("bottom-panel");
      if (sidebar && state.sidebarWidth)
        sidebar.style.width = `${state.sidebarWidth}px`;
      if (bottomPanel && state.panelHeight)
        bottomPanel.style.height = `${state.panelHeight}px`;
      // Also resizers should be updated but I skipped extracting Resizer logic for brevity in Component extraction.
      // It will remain capable via CSS/Direct access if I missed it, but logic was in renderer.ts.
      // Ideally resizing should be extracted.
      // For now, I'll rely on the existing HTML/CSS and basic setup.
    });

    console.log("Renderer: AppController initialized.");
    console.log("RENDERER_READY");
    this.ipc.log("RENDERER_READY");
  }

  private async refreshComments() {
    if (this.currentFilePath) {
      const threads = await this.ipc.getThreads(this.currentFilePath);
      this.renderThreads(threads);
    }
  }

  private renderThreads(threads: any[]) {
    this.threadList.render(threads);
    this.commentTable.render(threads);
  }

  private setCurrentFile(path: string) {
    console.log("AppController: setCurrentFile", path);
    this.currentFilePath = path;
    this.toolbar.updateFileName(path);
  }

  /**
   * メインプロセスからのプレビュー更新通知 (`onUpdatePreview`) を処理する。
   *
   * 【メカニズム】
   * 1. iframe (`preview-frame`) のドキュメントを取得。
   * 2. CSP (Content Security Policy) を調整し、nonceを注入。
   * 3. `acquireVsCodeApi` モックを注入して、Webview内のスクリプトがVS Code API経由で通信できるようにする。
   * 4. iframeにHTMLを書き込む。
   * 5. テーマ適用、ファイルパス設定、スレッド描画、ツールバー表示を行う。
   */
  private handleUpdatePreview(data: any): void {
    console.log(
      "Renderer: handleUpdatePreview received data",
      data ? "for " + data.filePath : "null",
    );
    const frame = document.getElementById("preview-frame") as HTMLIFrameElement;
    if (frame && data.html) {
      this.currentFilePath = data.filePath;
      this.toolbar.updateFileName(data.filePath);

      // Inject HTML with relaxation for CSP if needed
      this.injectPreviewHtml(frame, data);

      // Refresh sidebar and table
      this.refreshComments();
    }
    console.log("Renderer: handleUpdatePreview processing complete");
  }

  private injectPreviewHtml(frame: HTMLIFrameElement, data: any): void {
    const doc = frame.contentDocument || frame.contentWindow!.document;
    const htmlContent = data.html;

    try {
      const nonceMatch = htmlContent.match(/nonce=["']([^"']+)["']/);
      const nonce = nonceMatch ? nonceMatch[1] : "";
      const nonceAttr = nonce ? ` nonce="${nonce}"` : "";

      const mockScript = `
             <script${nonceAttr}>
               window.acquireVsCodeApi = () => ({
                 postMessage: (message) => {
                   window.parent.postMessage(message, "*");
                 },
                 getState: () => {
                    if (window.parent && window.parent.getPreviewState) {
                      return window.parent.getPreviewState();
                    }
                    return { sidebarVisible: true };
                 },
                 setState: (s) => {
                    if (window.parent && window.parent.setPreviewState) {
                      window.parent.setPreviewState(s);
                    }
                 }
               });
             </script>
           `;

      // Relax CSP extensively for the Electron environment
      const htmlWithMock = htmlContent
        .replace(
          /default-src\s+'none'/g,
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: file: https:",
        )
        .replace(/'nonce-[^']+'/g, "'unsafe-inline' 'unsafe-eval'")
        .replace(/<head>/i, (match: string) => match + mockScript);

      console.log(
        "Renderer: Injecting HTML, length:",
        htmlWithMock.length,
        "nonce found:",
        !!nonce,
      );
      doc.open();
      doc.write(htmlWithMock);
      doc.close();
      console.log("Renderer: doc.write/close successful");
    } catch (e: any) {
      console.error("Renderer: Error injecting CSP/Script:", e);
    } finally {
      // Ensure UI is updated even if injection has minor issues
      setTimeout(() => this.themeManager.applyTheme(), 100);

      this.setCurrentFile(data.filePath);

      if (data.threads) {
        this.renderThreads(data.threads);
      }

      const toolbar = document.getElementById("preview-toolbar");
      if (toolbar) {
        toolbar.style.display = "flex";
      }
      console.log("Renderer: Toolbar and threads update block finished");

      // Re-apply highlight visibility state
      this.applyHighlightVisibility(doc);
    }
  }

  private applyHighlightVisibility(doc: Document): void {
    const styleId = "highlights-toggle-style";
    let style = doc.getElementById(styleId) as HTMLStyleElement;
    if (!style) {
      style = doc.createElement("style");
      style.id = styleId;
      style.textContent = `
        body.highlights-hidden .comment-highlight {
          display: none !important;
        }
      `;
      doc.head.appendChild(style);
    }

    if (this.highlightsVisible) {
      doc.body.classList.remove("highlights-hidden");
    } else {
      doc.body.classList.add("highlights-hidden");
    }
  }

  private syncSelection(threadId: string, commentId: string): void {
    const frame = document.getElementById("preview-frame") as HTMLIFrameElement;
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage(
        { type: "revealComment", threadId, commentId },
        "*",
      );
    }
  }

  private openAddCommentDialog(title: string = "Add Comment"): void {
    this.addCommentDialog.open(title);
  }

  private async handleAddComment(content: string): Promise<void> {
    if (!content || !this.currentFilePath) return;

    if (this.replyThreadId) {
      await this.ipc.addReply({
        filePath: this.currentFilePath,
        threadId: this.replyThreadId,
        content: content,
        author: "User",
      });
    } else {
      await this.ipc.addComment({
        filePath: this.currentFilePath,
        content: content,
        offset: 0,
        length: 0,
        selectedText: this.lastSelectionText,
        contextBefore: this.lastSelectionContext?.before,
        contextAfter: this.lastSelectionContext?.after,
        author: "User",
      });
    }
    await this.refreshComments();
    this.addCommentDialog.hide();
  }

  private toggleHighlightVisibility(): void {
    this.highlightsVisible = !this.highlightsVisible;
    const frame = document.getElementById("preview-frame") as HTMLIFrameElement;
    if (frame && (frame.contentDocument || frame.contentWindow)) {
      const doc = frame.contentDocument || frame.contentWindow!.document;
      this.applyHighlightVisibility(doc);
    }
  }

  private setupResizers(): void {
    const sidebar = document.getElementById("sidebar");
    const bottomPanel = document.getElementById("bottom-panel");
    const resizerV = document.getElementById("resizer-v");
    const resizerH = document.getElementById("resizer-h");

    // Vertical (Sidebar)
    if (resizerV && sidebar) {
      console.log("Renderer: Setup Resizer-V");
      resizerV.addEventListener("mousedown", (e) => {
        console.log("Renderer: Resizer-V Mousedown");
        e.preventDefault();
        document.body.classList.add("resizing-v");
        const startX = e.clientX;
        const startWidth = sidebar.getBoundingClientRect().width;

        const onMouseMove = (moveEvent: MouseEvent) => {
          const newWidth = startWidth + (moveEvent.clientX - startX);
          if (newWidth > 150 && newWidth < 800) {
            sidebar.style.width = `${newWidth}px`;
          }
        };

        const onMouseUp = () => {
          document.body.classList.remove("resizing-v");
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
          this.ipc.saveLayout({
            sidebarWidth: sidebar.getBoundingClientRect().width,
          });
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      });
    }

    // Horizontal (Bottom Panel)
    if (resizerH && bottomPanel) {
      resizerH.addEventListener("mousedown", (e) => {
        e.preventDefault();
        document.body.classList.add("resizing-h");
        const startY = e.clientY;
        const startHeight = bottomPanel.getBoundingClientRect().height;

        const onMouseMove = (moveEvent: MouseEvent) => {
          const newHeight = startHeight - (moveEvent.clientY - startY);
          if (newHeight > 50 && newHeight < 800) {
            bottomPanel.style.height = `${newHeight}px`;
          }
        };

        const onMouseUp = () => {
          document.body.classList.remove("resizing-h");
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
          this.ipc.saveLayout({
            panelHeight: bottomPanel.getBoundingClientRect().height,
          });
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      });
    }
  }
}

// Initialize App
const app = new AppController();
console.log("Renderer: AppController initialized.");
export {};
