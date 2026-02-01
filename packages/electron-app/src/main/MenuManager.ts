import { Menu, MenuItemConstructorOptions, app, shell } from "electron";

export class MenuManager {
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
}
