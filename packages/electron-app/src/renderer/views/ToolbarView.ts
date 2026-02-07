import { Component } from "../../infrastructure/ui/Component.js";

export class ToolbarView extends Component {
  public onOpenFile?: () => void;
  public onRefresh?: () => void;
  public onAddComment?: () => void;
  public onToggleComments?: () => void;
  public onTogglePanel?: () => void;
  public onAiPrompt?: () => void;
  public onThemeChange?: (theme: string) => void;
  public onPrint?: () => void;

  // Tab switching
  public onTabChange?: (tab: "recent" | "comments") => void;

  constructor() {
    super("toolbar"); // Start with a generic root if exists, or just use document body implicitly?
    // Actually renderer.ts looks up individual IDs. We can just look them up here.

    this.bindClick("open-btn", () => this.onOpenFile?.());
    this.bindClick("refresh-btn", () => this.onRefresh?.());
    this.bindClick("add-comment-btn", () => this.onAddComment?.());
    this.bindClick("toggle-comments-btn", () => this.onToggleComments?.());
    this.bindClick("toggle-panel-btn", () => this.onTogglePanel?.());
    this.bindClick("ai-btn", () => this.onAiPrompt?.());
    this.bindClick("print-btn", () => this.onPrint?.());

    this.bindClick("tab-recent", () => this.handleTabChange("recent"));
    this.bindClick("tab-comments", () => this.handleTabChange("comments"));

    const themeSelect = document.getElementById(
      "theme-select",
    ) as HTMLSelectElement;
    if (themeSelect) {
      themeSelect.onchange = (e) =>
        this.onThemeChange?.((e.target as HTMLSelectElement).value);
    }
  }

  private bindClick(id: string, handler: () => void) {
    const el = document.getElementById(id);
    if (el) el.onclick = handler;
  }

  private handleTabChange(tab: "recent" | "comments") {
    const tabRecent = document.getElementById("tab-recent");
    const tabComments = document.getElementById("tab-comments");
    const recentSection = document.getElementById("recent-files-section");
    const commentsSection = document.getElementById("comments-section");

    if (tab === "recent") {
      tabRecent?.classList.add("active");
      tabComments?.classList.remove("active");
      if (recentSection) recentSection.style.display = "block";
      if (commentsSection) commentsSection.style.display = "none";
    } else {
      tabComments?.classList.add("active");
      tabRecent?.classList.remove("active");
      if (recentSection) recentSection.style.display = "none";
      if (commentsSection) commentsSection.style.display = "block";
    }

    this.onTabChange?.(tab);
  }

  public updateFileName(path: string) {
    const el = document.getElementById("file-name");
    if (el) {
      el.innerText = path;
      el.title = path;
    }
    // Update tab-recent text logic
    const tabRecent = document.getElementById("tab-recent");
    if (tabRecent) tabRecent.innerText = "FILES";
  }

  public updatePanelButton(hidden: boolean) {
    const btn = document.getElementById("toggle-panel-btn");
    if (btn) btn.innerText = hidden ? "+" : "×"; // + to show (expand), x to hide
  }

  public togglePanelState(hidden: boolean) {
    const panel = document.getElementById("bottom-panel");
    if (panel) {
      if (hidden) {
        panel.classList.add("collapsed");
      } else {
        panel.classList.remove("collapsed");
      }
      // panel.style.display = hidden ? "none" : "flex"; // Reverted to class-based
    }
    this.updatePanelButton(hidden);
  }
}
