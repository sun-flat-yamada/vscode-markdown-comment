import { BrowserWindow, app, shell } from "electron";
import * as path from "path";
import * as fs from "fs/promises";

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  sidebarWidth?: number;
  panelHeight?: number;
}

export class WindowManager {
  private window: BrowserWindow | null = null;
  private statePath: string;

  constructor() {
    this.statePath = path.join(app.getPath("userData"), "window-state.json");
  }

  async createWindow(): Promise<BrowserWindow> {
    const state = await this.loadState();

    this.window = new BrowserWindow({
      width: state.width,
      height: state.height,
      x: state.x,
      y: state.y,
      webPreferences: {
        preload: path.join(__dirname, "../preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Handle external links
    this.window.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith("http:") || url.startsWith("https:")) {
        shell.openExternal(url);
        return { action: "deny" };
      }
      return { action: "allow" };
    });

    this.window.on("close", () => {
      this.saveState();
    });

    return this.window;
  }

  async loadMainFile(): Promise<void> {
    if (!this.window) return;
    await this.window.loadFile(path.join(__dirname, "../../index.html"));
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  async getWindowState(): Promise<WindowState> {
    return await this.loadState();
  }

  private async loadState(): Promise<WindowState> {
    try {
      const data = await fs.readFile(this.statePath, "utf-8");
      return JSON.parse(data);
    } catch {
      return { width: 1200, height: 800 };
    }
  }

  private async saveState(extraState?: Partial<WindowState>): Promise<void> {
    if (!this.window) return;
    const bounds = this.window.getBounds();
    const currentState = await this.loadState();
    const state: WindowState = {
      ...currentState,
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      ...extraState,
    };
    try {
      await fs.writeFile(this.statePath, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save window state", e);
    }
  }

  async updateLayoutSettings(settings: {
    sidebarWidth?: number;
    panelHeight?: number;
  }): Promise<void> {
    await this.saveState(settings);
  }
}
