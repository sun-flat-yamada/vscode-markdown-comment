export class ThemeManager {
  private currentTheme: string;
  private previewFrame: HTMLIFrameElement;

  constructor() {
    this.currentTheme = localStorage.getItem("theme") || "system";
    this.previewFrame = document.getElementById(
      "preview-frame",
    ) as HTMLIFrameElement;

    this.listenToSystemChanges();
  }

  public initialize(themeSelect?: HTMLSelectElement): void {
    this.applyTheme(this.currentTheme);
    if (themeSelect) {
      themeSelect.value = this.currentTheme;
      themeSelect.onchange = (e) => {
        this.currentTheme = (e.target as HTMLSelectElement).value;
        localStorage.setItem("theme", this.currentTheme);
        this.applyTheme(this.currentTheme);
      };
    }
  }

  public applyTheme(theme: string = this.currentTheme): void {
    document.documentElement.classList.remove("dark-mode", "theme-system");
    if (theme === "dark") {
      document.documentElement.classList.add("dark-mode");
    } else if (theme === "system") {
      document.documentElement.classList.add("theme-system");
    }

    // Delay a bit for CSS calculation
    requestAnimationFrame(() => {
      this.injectThemeToIframe();
    });
  }

  private injectThemeToIframe(): void {
    if (!this.previewFrame || !this.previewFrame.contentWindow) return;
    const frameDoc = this.previewFrame.contentWindow.document;
    if (!frameDoc || !frameDoc.head) return;

    const existing = frameDoc.getElementById("injected-theme-style");
    if (existing) existing.remove();

    const styleEl = frameDoc.createElement("style");
    styleEl.id = "injected-theme-style";

    const rootStyles = getComputedStyle(document.documentElement);
    const bg =
      rootStyles.getPropertyValue("--vscode-bg-color").trim() || "#ffffff";
    const txt =
      rootStyles.getPropertyValue("--vscode-text-color").trim() || "#333333";
    const border =
      rootStyles.getPropertyValue("--vscode-border-color").trim() || "#e5e5e5";
    const accent =
      rootStyles.getPropertyValue("--vscode-accent-color").trim() || "#007acc";
    const sidebarBg =
      rootStyles.getPropertyValue("--vscode-sidebar-bg").trim() || "#f3f3f3";

    styleEl.textContent = `
        :root {
          --vscode-editor-background: ${bg};
          --vscode-editor-foreground: ${txt};
          --vscode-widget-border: ${border};
          --vscode-focusBorder: ${accent};
          --vscode-sideBar-background: ${sidebarBg};
          --vscode-button-background: ${accent};
          --vscode-button-foreground: #ffffff;
          --vscode-sideBarSectionHeader-background: ${sidebarBg};
          --vscode-sideBarSectionHeader-foreground: ${txt};
          --vscode-badge-background: ${accent};
          --vscode-badge-foreground: #ffffff;
        }
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
          background-color: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
          overflow-y: auto !important;
        }
        body {
          background-color: var(--vscode-editor-background) !important;
          color: var(--vscode-editor-foreground) !important;
        }
        #sidebar, #toggle-sidebar-btn, #toolbar { display: none !important; }
        #main-content {
          width: 100% !important;
          max-width: 100% !important;
          padding: 20px 40px !important;
          background-color: transparent !important;
          color: inherit !important;
          box-sizing: border-box;
          overflow: visible !important;
          min-height: 100%;
        }
        .comment-highlight.toggled-off {
          background-color: transparent !important;
          border-bottom: none !important;
          color: inherit !important;
        }
        .comment-highlight.toggled-off::before {
          display: none !important;
        }
      `;
    frameDoc.head.appendChild(styleEl);

    // Sync theme classes
    frameDoc.documentElement.classList.remove("dark-mode", "theme-system");
    if (this.currentTheme === "dark")
      frameDoc.documentElement.classList.add("dark-mode");
    if (this.currentTheme === "system")
      frameDoc.documentElement.classList.add("theme-system");
  }

  private listenToSystemChanges(): void {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (this.currentTheme === "system") {
          this.applyTheme("system");
        }
      });
  }
}
