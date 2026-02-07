/**
 * @file MenuManager.ts
 * @description アプリケーションのネイティブメニューバーを構築・管理する。
 */
import { Menu, MenuItemConstructorOptions, app, shell } from "electron";

/**
 * @class MenuManager
 * @description アプリケーションメニューの定義と動的更新を行う。
 *
 * 【責務】
 * - メニューテンプレートの定義（File, Edit, View, Helpなど）。
 * - 「最近開いたファイル」リストの更新とメニューへの反映。
 */
export class MenuManager {
  private recentFiles: string[] = [];

  constructor(private onOpenFile: () => void) {}

  setup(): void {
    const template: MenuItemConstructorOptions[] = [
      {
        label: "File",
        submenu: [
          {
            label: "Open File...",
            accelerator: "CmdOrCtrl+O",
            click: () => this.onOpenFile(),
          },
          {
            label: "Open Recent",
            submenu: [],
          },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" },
        ],
      },
      {
        label: "Help",
        submenu: [
          {
            label: "Documentation",
            click: async () => {
              await shell.openExternal(
                "https://github.com/sun-flat-yamada/vscode-markdown-comment",
              );
            },
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  refreshRecentFiles(
    files: string[],
    onOpenSpecific: (file: string) => void,
  ): void {
    this.recentFiles = files;

    // Rebuild the whole menu to reflect recent files reliably
    const template: any[] = [
      {
        label: "File",
        submenu: [
          {
            label: "Open File...",
            accelerator: "CmdOrCtrl+O",
            click: () => this.onOpenFile(),
          },
          {
            label: "Open Recent",
            submenu:
              files.length === 0
                ? [{ label: "No Recent Files", enabled: false }]
                : files.map((file) => ({
                    label: file,
                    click: () => onOpenSpecific(file),
                  })),
          },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
        ],
      },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}
